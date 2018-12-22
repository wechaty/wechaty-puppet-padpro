import http, { ClientRequest, IncomingMessage, RequestOptions } from 'http'
import publicIp from 'public-ip'

import { log, SEND_SHORT_TIMEOUT } from '../config'
import { WechatGateway } from '../gateway/wechat-gateway'
import {
  CDNDownloadDataResponse,
  CDNFileType,
  GrpcGetCdnDnsPayload,
} from '../schemas'
import { decryptAes } from '../utils'
import { packDownloadRequest, unpackDownloadResponse } from '../utils/cdn-utils'

const PRE = 'CDNManager'

const MAX_TRUNK_SIZE = 65536

export class CDNManager {

  private wechatGateway: WechatGateway

  private cdnInfo?: {
    serverIP: string,
    version: string,
    uin: string,
    authKey: string,
    clientVersion: number,
  }

  constructor () {
    this.wechatGateway = WechatGateway.Instance
  }

  /**
   * Get CDN DNS server to send large file
   */
  public async getCDNServerIP () {
    const result: GrpcGetCdnDnsPayload = await this.wechatGateway.callApi('GrpcGetCdnDns', {
      ip: await publicIp.v4()
    })
    this.cdnInfo = {
      authKey: result.dnsCdn.aesKey,
      serverIP: result.dnsCdn.ip,
      uin: result.dnsCdn.uin,
      version: result.dnsCdn.ver,
      clientVersion: result.clientVersion,
    }
  }

  public async uploadFile (
    toId: string,
    data: string,
  ) {
    log.silly(PRE, `sendFile(${toId}, ${data.slice(0, 100)})`)
    if (!this.cdnInfo) {
      throw new Error(`${PRE} sendFile() failed, no CDN info yet, can not send file.`)
    }

  }

  public async downloadFile (
    fileId: string,
    aesKey: string,
    totalLen: number,
  ) {
    log.silly(PRE, `downloadFile(${fileId}, ${totalLen}) started.`)
    let seqNum = 1
    let curIndex = 0
    let dataLen = totalLen

    let result = Buffer.from('')
    while (curIndex + 1 < dataLen) {
      const endIndex = dataLen > curIndex + MAX_TRUNK_SIZE ? curIndex + MAX_TRUNK_SIZE : dataLen
      const response: CDNDownloadDataResponse = await this._downloadFile(seqNum, fileId, curIndex, endIndex)
      // TODO: get the file data from the response

      const data = response.filedata

      result = Buffer.concat([
        result,
        data
      ])
      dataLen = response.totalsize || dataLen
      curIndex += data.length
      seqNum++
    }

    return decryptAes(result,  Buffer.from(aesKey, 'hex'))
  }

  private async _downloadFile (
    seq: number,
    fileId: string,
    startIndex: number,
    endIndex: number,
  ) {
    log.silly(PRE, `_downloadFile(${seq}, ${startIndex}, ${endIndex})`)
    if (!this.cdnInfo) {
      throw new Error(`${PRE} downloadFIle() failed, no CDN info yet, can not download file.`)
    }
    const data = packDownloadRequest({
      ver: parseInt(this.cdnInfo.version, 10),
      weixinnum: parseInt(this.cdnInfo.uin, 10),
      seq,
      clientversion: this.cdnInfo.clientVersion,
      clientostype: 'iPad iPhone OS9.3.3',
      authkey: Buffer.from(this.cdnInfo.authKey, 'base64'),
      nettype: 1,
      acceptdupack: 1,
      safeproto: 1,
      filetype: CDNFileType.FIVE,
      wxchattype: 0,
      fileid: fileId,
      lastretcode: 0,
      ipseq: 0,
      wxmsgflag: null,
      wxautostart: 0,
      downpicformat: 1,
      largesvideo: 0,
      sourceflag: 0,
      rangestart: startIndex,
      rangeend: endIndex,
    })
    try {
      const result = await this.sendCdnRequest(data, '/download')
      const response = unpackDownloadResponse(result)

      return response
    } catch (e) {
      // TODO: deal with errors
      console.error(e)
      throw e
    }
  }

  private async sendCdnRequest (
    data: Buffer,
    url: string,
  ) {
    log.silly(PRE, `sendCdnRequest(${url})`)
    if (!this.cdnInfo) {
      throw new Error(`Can not send cdn request to cdn server since there is no cdn info yet.`)
    }
    log.silly(PRE, `sendCdnRequest() cdn info: ${JSON.stringify(this.cdnInfo)}`)
    const options: RequestOptions = {
      headers: {
        'Accept'        : '*/*',
        'Content-Length': data.length,
        'Content-Type'  : 'application/octet-stream',
        'User-Agent'    : 'MicroMessenger Client',
      },
      hostname: this.cdnInfo.serverIP,
      method: 'POST',
      path: url,
      port: 443,
    }

    return new Promise<Buffer>((resolve, reject) => {
      const req: ClientRequest = http.request(options, async (response: IncomingMessage) => {
        const rawData: any = []
        let dataLen = 0

        if (response.statusCode !== 200) {
          reject(`sendCdnRequest failed, status code: ${response.statusCode}, status message: ${response.statusMessage}`)
        }
        response.on('data', (chunk: any) => {
          rawData.push(chunk)
          dataLen += chunk.length
        })
        response.on('error', (error: Error) => {
          console.error(error)
          reject(error)
        })
        response.on('end', () => {
          const buffer = Buffer.concat(rawData, dataLen)
          resolve(buffer)
        })
      })
      req.setTimeout(SEND_SHORT_TIMEOUT)
      req.on('error', (error: Error) => {
        console.error(error)
        reject(error)
      })
      req.on('timeout', () => {
        req.abort()
        reject(`TIMEOUT`)
      })
      req.write(data)
      req.end()
    })
  }
}
