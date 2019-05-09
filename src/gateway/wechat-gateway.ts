import EventEmitter from 'events'
import http, {
  ClientRequest,
  IncomingMessage,
  RequestOptions,
} from 'http'
import HttpProxyAgent from 'http-proxy-agent'
import net, { Socket } from 'net'
import StateSwitch from 'state-switch'

import { ApiOptions } from '../api-options'
import {
  log,
  SEND_SHORT_RETRY_COUNT,
  SEND_SHORT_TIMEOUT,
} from '../config'
import { WX_LONG_HOST, WX_SHORT_HOST } from '../consts'

import {
  ApiParams,
  GrpcGateway,
  PackShortRes,
} from './grpc-gateway'

import { DedupeApi } from './dedupe-api'

import { EncryptionServiceError } from '../schemas'

export interface CallBackBuffer {
  [id: string]: (buf: any) => void
}

export interface SwitchHostOption {
  shortHost: string,
  longHost: string,
}

export type WechatGatewayEvent = 'newMessage' | 'socketClose' | 'socketError' | 'socketEnd' | 'rawMessage' | 'reset'

const PRE = 'WechatGateway'

export class WechatGateway extends EventEmitter {

  private static _instance?: WechatGateway

  private longHost: string
  private shortHost: string

  private longSocket?: net.Socket
  private grpcGateway: GrpcGateway
  private backs: CallBackBuffer
  private proxyAgent?: HttpProxyAgent

  private readonly state: StateSwitch

  private cacheBuf?: Buffer

  private dedupeApi: DedupeApi

  private apiCounter: { [apiName: string]: number }
  private bootTime: number

  public static init (
    token: string,
    endpoint: string,
    proxyEndpoint?: string,
  ) {
    log.info(PRE, `init(${token}, ${endpoint}, ${proxyEndpoint})`)
    this._instance = new WechatGateway(token, endpoint, proxyEndpoint)
  }

  public static async release () {
    if (this._instance) {
      await this._instance.stop()
      this._instance = undefined
    } else {
      log.verbose(PRE, `release() instance not exist, skip release.`)
    }
  }

  public static get Instance (): WechatGateway {
    if (!this._instance) {
      throw new Error(`${PRE} wechat gateway instance not initialized.`)
    }
    return this._instance
  }

  private constructor (
    token: string,
    endpoint: string,
    proxyEndpoint?: string,
  ) {
    super()
    this.shortHost = WX_SHORT_HOST
    this.longHost = WX_LONG_HOST
    this.backs = Object.create(null)
    this.grpcGateway = new GrpcGateway(token, endpoint)
    if (proxyEndpoint) {
      this.proxyAgent = new HttpProxyAgent(proxyEndpoint)
    }
    this.state = new StateSwitch()
    this.state.on(true)
    this.dedupeApi = new DedupeApi()
    this.apiCounter = {}
    this.bootTime = new Date().getTime()

    this.grpcGateway.on('error', () => {
      this.emit('reset')
    })
  }
  public emit (event: 'newMessage' | 'rawMessage', message: Buffer): boolean
  public emit (event: 'socketClose' | 'socketEnd' | 'reset'): boolean
  public emit (event: 'socketError', err: Error): boolean

  public emit (event: never, listener: never): never

  public emit (
    event: WechatGatewayEvent,
    ...args: any[]
  ): boolean {
    return super.emit(event, ...args)
  }
  public on (event: 'newMessage' | 'rawMessage', listener: ((this: WechatGateway, message: Buffer) => void)): this
  public on (event: 'socketClose' | 'socketEnd' | 'reset', listener: ((this: WechatGateway) => void)): this
  public on (event: 'socketError', listener: ((this: WechatGateway, err: Error) => void)): this

  public on (event: never, listener: never): never

  public on (event: WechatGatewayEvent, listener: ((...args: any[]) => any)): this {
    log.verbose(PRE, `on(${event}, ${typeof listener}) registered`)

    super.on(event, (...args: any[]) => {
      try {
        listener.apply(this, args)
      } catch (e) {
        log.error('Wechaty', 'onFunction(%s) listener exception: %s', event, e)
      }
    })

    return this
  }

  public async stop () {
    log.info(PRE, `stop()`)
    this.state.off('pending')
    await this.releaseLongSocket()
    this.dedupeApi.clean()
    this.state.off(true)
    log.info(PRE, `stop() finished`)
  }

  public async switchHost ({ shortHost, longHost }: SwitchHostOption) {
    log.silly(PRE, `switchHost({ shortHost: ${shortHost}, longHost: ${longHost} })`)
    if (this.shortHost !== shortHost) {
      this.shortHost = shortHost
    }
    if (this.longHost !== longHost) {
      this.cleanLongSocket()
      this.longHost = longHost
    }
  }

  private cleanLongSocket (): void {
    if (this.longSocket) {
      this.longSocket.removeAllListeners()
      this.longSocket.destroy()
      this.longSocket = undefined
    } else {
      log.verbose(PRE, `cleanLongSocket() socket doesn't exist, no need to clean it.`)
    }
  }

  private async initLongSocket (): Promise<void> {
    if (this.longSocket) {
      log.verbose(PRE, `initLongSocket() socket has already been created, quit initialize.`)
      return
    }

    const longSocket = new Socket()
    longSocket.connect(80, this.longHost)
    longSocket.setTimeout(5000)

    longSocket.on('data', this.onData.bind(this))

    longSocket.on('close', async () => {
      log.info(PRE, `initLongSocket() connection to wechat long host server: ${this.longHost} closed.`)
      this.cleanLongSocket()
      this.emit('socketClose')
    })

    longSocket.on('error', (err: Error) => {
      log.error(PRE, `initLongSocket() error happened with long host server connection: ${err}`)
      this.emit('socketError', err)
    })

    longSocket.on('end', () => {
      log.info(PRE, `initLongSocket() connection to wechat long host server: ${this.longHost} ended.`)
      this.emit('socketEnd')
    })

    await new Promise((resolve, reject) => {
      longSocket.once('connect', () => {
        log.silly(PRE, 'initLongSocket() Promise() longSocket.on(connect)')
        return resolve()
      })

      longSocket.once('error', (e) => {
        log.error(PRE, `initLongSocket() Promise() longSocket.on(error) ${e}`)
        return reject('ERROR')
      })
      longSocket.once('close', () => {
        log.silly(PRE, 'initLongSocket() Promise() longSocket.on(close)')
        return reject('CLOSE')
      })
      longSocket.once('timeout', () => {
        log.silly(PRE, `initLongSocket() Promise() longSocket.on(timeout)`)
        return reject('TIMEOUT')
      })
    })

    this.longSocket = longSocket
  }

  private async releaseLongSocket (): Promise<void> {
    return new Promise<void>(resolve => {
      if (!this.longSocket) {
        log.verbose(PRE, `releaseLongSocket() socket has been released, quit release process.`)
        return
      }
      this.longSocket.on('end', resolve)
      this.longSocket.end()
      this.longSocket = undefined
    })
  }

  public async callApi (
    apiName: string,
    params?: ApiParams,
    forceCall?: boolean,
    forceLongOrShort?: boolean,
  ) {
    if (this.state.off()) {
      // When state is off, ignore api call
      return
    }
    return this.dedupeApi.dedupe(
      this._callApi.bind(this),
      apiName,
      params,
      forceCall,
      forceLongOrShort
    )
  }

  private async _callApi (apiName: string, params?: ApiParams, forceLongOrShort?: boolean) {
    if (!this.apiCounter[apiName]) {
      this.apiCounter[apiName] = 0
    }
    this.apiCounter[apiName] ++
    log.silly(PRE, `_callApi(${apiName}, ${JSON.stringify(params)}) the ${this.apiCounter[apiName]} times, booted ${(new Date().getTime() - this.bootTime) / 1000} seconds since boot.`)
    const option = ApiOptions[apiName]
    if (!option) {
      throw new Error(`Unknown API name: ${apiName}`)
    }
    const { noParse } = option
    let { longRequest } = option
    if (forceLongOrShort !== undefined) {
      longRequest = forceLongOrShort
    }
    try {
      if (longRequest) {
        const buffer = await this.grpcGateway.packLong(apiName, params)
        const wxResponse = await this.sendLong(buffer, noParse)
        const result = noParse ? wxResponse : await this.grpcGateway.parse(apiName, wxResponse)
        return result
      } else {
        const res = await this.grpcGateway.packShort(apiName, params)
        const wxResponse = await this.sendShort(res, noParse)
        const result = noParse ? wxResponse : await this.grpcGateway.parse(apiName, wxResponse)
        return result
      }
    } catch (e) {
      if (apiName === 'GrpcAutoLogin' && e.details === EncryptionServiceError.NO_SESSION) {
        throw new Error(EncryptionServiceError.NO_SESSION)
      }
      log.verbose(PRE, `_callApi() Error happened when call api: ${apiName}, params: ${JSON.stringify(params)}\n${e.stack}`)
      throw e
    }
  }

  public isAlive (): boolean {
    // TODO: check wechat connections here
    const wechatConnection = true

    return wechatConnection && this.grpcGateway.isAlive()
  }

  private async sendShort (res: PackShortRes, noParse?: boolean, retry = SEND_SHORT_RETRY_COUNT): Promise<Buffer> {
    try {
      const result = await this._sendShort(res, noParse)
      return result
    } catch (e) {
      if (retry > 0 && e !== 'UNKNOWN_PACKAGE') {
        log.info(PRE, `sendShort() failed for error: ${e}, retry the api.`)
        return this.sendShort(res, noParse, retry - 1)
      } else {
        throw e
      }
    }
  }

  private async _sendShort (res: PackShortRes, noParse?: boolean): Promise<Buffer> {
    log.silly(PRE, `sendShort() res: commandUrl: ${res.commandUrl}`)
    const options: RequestOptions = {
      headers: {
        'Content-Length': res.payload.length,
        'Content-Type'  : 'application/x-www-form-urlencoded',
        'User-Agent'    : 'MicroMessenger Client',
      },
      hostname: this.shortHost,
      method: 'POST',
      path: res.commandUrl,
      port: 80,
    }

    if (this.proxyAgent) {
      options.agent = this.proxyAgent
    }

    return new Promise<Buffer>((resolve, reject) => {
      const req: ClientRequest = http.request(options, async (response: IncomingMessage) => {
        const rawData: any = []
        let dataLen = 0

        if (response.statusCode !== 200) {
          reject(`sendShort failed, status code: ${response.statusCode}, status message: ${response.statusMessage}`)
        }
        response.on('data', (chunk: any) => {
          rawData.push(chunk)
          dataLen += chunk.length
        })
        response.on('error', (error: Error) => {
          reject(error)
        })
        response.on('end', () => {
          const buffer = Buffer.concat(rawData, dataLen)
          // Short request parse judgement
          if (!noParse && buffer[0] !== 191) {
            log.warn(`sendShort receive unknown package: [${buffer[0]}] ${buffer.toString('hex')} ${buffer.toString()}]`)
            reject('UNKNOWN_PACKAGE')
          }
          resolve(buffer)
        })
      })
      req.setTimeout(SEND_SHORT_TIMEOUT)
      req.on('error', (error: Error) => {
        reject(error)
      })
      req.on('timeout', () => {
        req.abort()
        reject(`TIMEOUT`)
      })
      req.write(res.payload)
      req.end()
    })
  }

  private async sendLong (sendBuff: Buffer, noParse?: boolean): Promise<Buffer> {
    const reqSeq = this.bufferToInt(sendBuff, 12)
    log.silly(PRE, `sendLong() reqSeq: ${reqSeq}`)

    return new Promise<Buffer>(async (resolve, reject) => {
      this.backs[reqSeq] = (buffer: Buffer) => {
        // Long request parse judgement
        log.silly(PRE, `sendLong() receive back package size: ${buffer.length}`)
        const judgeFlag = buffer[16]
        if (!noParse) {
          if (judgeFlag === 126) {
            log.silly(PRE, `sendLong() receive flag 126 back.`)
            this.emit('reset')
          } else if (judgeFlag !== 191) {
            log.warn(`sendLong receive unknown package: [${judgeFlag}] ${buffer.toString('hex')}]`)
            reject('UNKNOWN_PACKAGE')
          }
        }
        delete this.backs[reqSeq]
        resolve(buffer)
      }

      try {
        if (!this.longSocket) {
          try {
            await this.initLongSocket()
          } catch (e) {
            this.emit('reset')
            throw e
          }
        }
        this.longSocket!.write(sendBuff)
      } catch (e) {
        delete this.backs[reqSeq]
        reject(e)
      }
    })
  }

  private onData (buffer: Buffer) {
    this.emit('rawMessage', buffer)
    if (this.cacheBuf) {
      this.cacheBuf = Buffer.concat(
        [this.cacheBuf, buffer],
        this.cacheBuf.length + buffer.length
      )
    } else {
      this.cacheBuf = buffer
    }

    while (this.cacheBuf && this.cacheBuf.length > 16) {
      const newPackageLength = this.bufferToInt(this.cacheBuf)
      if (newPackageLength <= 0 || newPackageLength > 8000000) {
        log.verbose(PRE, `onData() invalid package length.`)
        this.cacheBuf = undefined
      } else if (newPackageLength <= this.cacheBuf.length) {
        const newPackage = this.cacheBuf.slice(0, newPackageLength)
        if (newPackageLength < this.cacheBuf.length) {
          this.cacheBuf = this.cacheBuf.slice(newPackageLength)
        } else {
          this.cacheBuf = undefined
        }
        this.handlePackage(newPackage)
      } else {
        break
      }
    }
  }

  private handlePackage (bys: Buffer) {
    if (bys.length === 20 && bys[3] === 20 && bys[5] === 16 && bys[7] === 1) {
      const seq: number = this.bufferToInt(bys, 12) // 12 - 16 sequence number
      if (this.backs[seq]) {
        this.backs[seq](bys)
        this.emit('newMessage', bys)
      } else {
        this.emit('newMessage', bys)
      }
    } else if (bys.length >= 16 && bys[16] !== 191 &&
      !(bys[3] === 58 && bys[5] === 16 && bys[7] === 1 && bys.length === 58) &&
      !(bys[3] === 47 && bys[5] === 16 && bys[7] === 1 && bys.length === 47)) {
      return
    } else {
      const seq = this.bufferToInt(bys, 12) // 12 - 16 sequence number
      this.backs[seq] && this.backs[seq](bys)
    }
  }

  private bufferToInt (buffer: Buffer, offset = 0): number {
    return buffer.readUIntBE(offset, 4)
  }

}
