import http, { ClientRequest, IncomingMessage, RequestOptions } from 'http'
import md5 from 'md5'
import publicIp from 'public-ip'
import uuid from 'uuid'

import { log, SEND_SHORT_TIMEOUT } from '../config'
import { WechatGateway } from '../gateway/wechat-gateway'
import {
  CDNCheckMd5Request,
  CDNCheckMd5Response,
  CDNDownloadDataRequest,
  CDNDownloadDataResponse,
  CDNFileType,
  CDNUploadDataRequest,
  CDNUploadDataResponse,
  GrpcGetCdnDnsPayload,
  PadproAppMessagePayload,
  WechatAppMessageType,
} from '../schemas'
import {
  decryptAes,
  encryptAes,
  encryptUser,
  getAesKey,
} from '../utils'
import {
  packCheckMd5Request,
  packDownloadRequest,
  packUploadRequest,
  unpackCheckMd5Response,
  unpackDownloadResponse,
  unpackUploadResponse,
} from '../utils/cdn-utils'

import {
  CDN_USER_KEY,
  CDN_USER_MD5_KEY,
  CLIENT_OS_TYPE,
} from '../consts'
import { CacheManager } from './cache-manager'

const PRE = 'CDNManager'

const MAX_TRUNK_SIZE = 65536

export class CDNManager {

  private wechatGateway: WechatGateway
  private cacheManager: CacheManager

  private cdnInfo?: {
    serverIP: string,
    version: number,
    uin: number,
    authKey: Buffer,
    clientVersion: number,
  }

  constructor () {
    this.wechatGateway = WechatGateway.Instance
    this.cacheManager = CacheManager.Instance
  }

  /**
   * Get CDN DNS server to send large file
   */
  public async getCDNServerIP () {
    const ip = process.env.PADPRO_IP || await publicIp.v4()
    const result: GrpcGetCdnDnsPayload = await this.wechatGateway.callApi('GrpcGetCdnDns', { ip })
    this.cdnInfo = {
      authKey: Buffer.from(result.dnsCdn.aesKey, 'base64'),
      serverIP: result.dnsCdn.ip,
      uin: parseInt(result.dnsCdn.uin, 10),
      version: parseInt(result.dnsCdn.ver, 10),
      clientVersion: result.clientVersion,
    }
  }

  public async uploadFile (
    toId: string,
    data: string,
    fileName: string,
    fileExt: string,
  ): Promise<PadproAppMessagePayload> {
    log.silly(PRE, `uploadFile(${toId}, ${data.slice(0, 100)})`)
    if (!this.cdnInfo) {
      try {
        await Promise.race([
          await this.getCDNServerIP(),
          await new Promise((_, reject) => setTimeout(reject, 20000)),
        ])
      } catch (e) {
        throw new Error(`${PRE} sendFile() failed, Can not get CDN info: timeout.`)
      }
    }
    const rawData = Buffer.from(data, 'base64')
    const rawTotalSize = rawData.length
    const fileMd5 = md5(rawData)
    const checkMd5Response = await this._checkFileMd5(0, toId, fileMd5)
    let fileid: string | undefined
    let aesKey: Buffer | undefined
    if (checkMd5Response.existflag) {
      log.verbose(PRE, `uploadFile() file ${fileName} exists in cdn, no need to upload it.`)
      if (checkMd5Response.fileid) {
        fileid = checkMd5Response.fileid
        const fileCache = this.cacheManager.getFileCache(fileid)
        if (fileCache) {
          aesKey = fileCache.aesKey
        }
      }
    }
    if (!fileid || !aesKey) {
      log.verbose(PRE, `uploadFile() file ${fileName} not exists in cdn, upload it...`)
      const fileKey = md5(uuid.v4())
      aesKey = getAesKey()
      const encryptedData = encryptAes(rawData, aesKey)
      const totalSize = encryptedData.length

      let curIndex = 0
      let seq = 1
      const toUser = '@cdn2_' + encryptUser(toId, CDN_USER_KEY)
      while (curIndex < totalSize) {
        const startIndex = curIndex
        const endIndex = curIndex + MAX_TRUNK_SIZE < totalSize ? curIndex + MAX_TRUNK_SIZE : totalSize

        const fileData = encryptedData.slice(startIndex, endIndex)
        const response = await this._uploadFile(
          seq++,
          toUser,
          fileName,
          fileMd5,
          startIndex,
          endIndex - 1,
          totalSize,
          rawTotalSize,
          fileKey,
          fileData,
        )
        if (response.fileid) {
          fileid = response.fileid
          this.cacheManager.setFileCache(fileid, {
            fileId: fileid,
            aesKey,
            timestamp: new Date().getTime()
          })
        }
        curIndex = endIndex
      }
    }

    if (!fileid) {
      throw new Error(`${PRE} uploadFile() failed, can not get fileid.`)
    }
    return {
      title: fileName,
      url: '',
      appattach: {
        totallen: rawTotalSize,
        attachid: `@cdn_${fileid}_${aesKey.toString('hex')}_1`,
        fileext: fileExt,
        cdnattachurl: fileid,
        aeskey: aesKey.toString('hex'),
        encryver: 1,
      },
      type: WechatAppMessageType.Attach,
      md5: fileMd5,
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

    if (!this.cdnInfo) {
      await Promise.race([
        await this.getCDNServerIP(),
        await new Promise((_, reject) => {
          const timeoutTimer = setTimeout(() => {
            clearTimeout(timeoutTimer)
            reject(`${PRE} sendFile() failed, Can not get CDN info: timeout.`)
          }, 20000)
        }),
      ])
    }
    while (curIndex + 1 < dataLen) {
      const endIndex = dataLen > curIndex + MAX_TRUNK_SIZE ? curIndex + MAX_TRUNK_SIZE : dataLen
      const response: CDNDownloadDataResponse = await this._downloadFile(seqNum, fileId, curIndex, endIndex)

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
  ): Promise<CDNDownloadDataResponse> {
    log.silly(PRE, `_downloadFile(${seq}, ${startIndex}, ${endIndex})`)
    if (!this.cdnInfo) {
      throw new Error(`${PRE} _downloadFIle() failed, no CDN info yet, can not download file.`)
    }
    const request: CDNDownloadDataRequest = {
      ver: this.cdnInfo.version,
      weixinnum: this.cdnInfo.uin,
      seq,
      clientversion: this.cdnInfo.clientVersion,
      clientostype: CLIENT_OS_TYPE,
      authkey: this.cdnInfo.authKey,
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
    }
    const data = packDownloadRequest(request)

    try {
      const response = await this.sendCdnRequest(data, '/download')
      const result = unpackDownloadResponse(response)

      return result
    } catch (e) {
      // TODO: deal with errors
      console.error(e)
      throw e
    }
  }

  private async _checkFileMd5 (
    seq: number,
    toId: string,
    filemd5: string,
  ): Promise<CDNCheckMd5Response> {
    if (!this.cdnInfo) {
      throw new Error(`${PRE} _checkFileMd5() failed, no CDN info yet, can not download file.`)
    }
    const touser = '@cdn_' + encryptUser(toId, CDN_USER_MD5_KEY)
    const request: CDNCheckMd5Request = {
      ver: this.cdnInfo.version,
      weixinnum: this.cdnInfo.uin,
      seq,
      clientversion: this.cdnInfo.clientVersion,
      clientostype: CLIENT_OS_TYPE,
      authkey: this.cdnInfo.authKey,
      nettype: 1,
      acceptdupack: 1,
      filetype: CDNFileType.FIVE,
      safeproto: 1,
      enablehit: 1,
      filemd5,
      largesvideo: 0,
      wxchattype: 0,
      advideoflag: 0,
      touser,
    }

    const data = packCheckMd5Request(request)

    try {
      const response = await this.sendCdnRequest(data, '/uploadcheckmd5')
      const result = unpackCheckMd5Response(response)

      return result
    } catch (e) {
      // TODO: deal with errors
      console.error(e)
      throw e
    }
  }

  private async _uploadFile (
    seq: number,
    toUser: string,
    fileName: string,
    fileMd5: string,
    startIndex: number,
    endIndex: number,
    totalSize: number,
    rawTotalSize: number,
    fileKey: string,
    fileData: Buffer,
  ): Promise<CDNUploadDataResponse> {
    log.silly(PRE, `_uploadFile()`)
    if (!this.cdnInfo) {
      throw new Error(`${PRE} _uploadFile() failed, no CDN info yet, can not download file.`)
    }

    const fileDataMd5 = md5(fileData)
    const request: CDNUploadDataRequest = {
      ver: this.cdnInfo.version,
      weixinnum: this.cdnInfo.uin,
      seq,
      clientversion: this.cdnInfo.clientVersion,
      clientostype: CLIENT_OS_TYPE,
      authkey: this.cdnInfo.authKey,
      nettype: 1,
      acceptdupack: 1,
      safeproto: 1,
      filetype: CDNFileType.FIVE,
      wxchattype: 0,
      lastretcode: 0,
      ipseq: 0,
      hasthumb: 0,
      touser: toUser,
      compresstype: 0,
      nocheckaeskey: 1,
      enablehit: 1,
      existancecheck: 0,
      apptype: 0,
      filekey: fileKey,
      totalsize: totalSize,
      rawtotalsize: rawTotalSize,
      localname: fileName,
      thumbtotalsize: 0,
      rawthumbsize: 0,
      rawthumbmd5: null,
      encthumbcrc: 0,
      largesvideo: 0,
      sourceflag: 0,
      advideoflag: 0,
      rangestart: startIndex,
      rangeend: endIndex,
      filedatamd5: fileDataMd5,
      filemd5: fileMd5,
      rawfilemd5: fileMd5,
      blockmd5: fileDataMd5,
      filedata: fileData,
    }
    const data = packUploadRequest(request)

    try {
      const response = await this.sendCdnRequest(data, '/uploadv3')
      const result = unpackUploadResponse(response)

      return result
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
