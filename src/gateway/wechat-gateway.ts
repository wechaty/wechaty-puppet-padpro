import EventEmitter from 'events'
import http, {
  ClientRequest,
  IncomingMessage,
  RequestOptions,
} from 'http'
import HttpProxyAgent from 'http-proxy-agent'
import net, { Socket } from 'net'

import { ApiOptions } from '../api-options'
import {
  log,
} from '../config'
import { WX_LONG_HOST, WX_SHORT_HOST } from '../consts'

import {
  ApiParams,
  GrpcGateway,
  PackShortRes,
} from './grpc-gateway'

export interface CallBackBuffer {
  [id: string]: (buf: any) => void
}

export interface SwitchHostOption {
  shortHost: string,
  longHost: string,
}

export type WechatGatewayEvent = 'newMessage' | 'socketClose' | 'socketError' | 'socketEnd' | 'rawMessage'

const PRE = 'WechatGateway'

export class WechatGateway extends EventEmitter {

  private longHost: string
  private shortHost: string

  private longSocket?: net.Socket
  private grpcGateway: GrpcGateway
  private backs: CallBackBuffer
  private proxyAgent?: HttpProxyAgent

  private cacheBuf?: Buffer

  constructor (
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
  }
  public emit (event: 'newMessage' | 'rawMessage', message: Buffer): boolean
  public emit (event: 'socketClose' | 'socketEnd'): boolean
  public emit (event: 'socketError', err: Error): boolean

  public emit (event: never, listener: never): never

  public emit (
    event: WechatGatewayEvent,
    ...args: any[]
  ): boolean {
    return super.emit(event, ...args)
  }
  public on (event: 'newMessage' | 'rawMessage', listener: ((this: WechatGateway, message: Buffer) => void)): this
  public on (event: 'socketClose' | 'socketEnd', listener: ((this: WechatGateway) => void)): this
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

  public async start () {
    await this.initLongSocket()
  }

  public async switchHost ({ shortHost, longHost }: SwitchHostOption) {
    log.silly(PRE, `switchHost({ shortHost: ${shortHost}, longHost: ${longHost} })`)
    if (this.shortHost !== shortHost) {
      this.shortHost = shortHost
    }
    if (this.longHost !== longHost) {
      this.cleanLongSocket()
      this.longHost = longHost
      this.initLongSocket()
    }
  }

  private cleanLongSocket (): void {
    if (this.longSocket) {
      this.longSocket.removeAllListeners()
      this.longSocket.destroy()
      this.longSocket = undefined
    } else {
      log.verbose('WechatGateway', `cleanLongSocket() socket doesn't exist, no need to clean it.`)
    }
  }

  private initLongSocket (): void {
    if (this.longSocket) {
      log.verbose('WechatGateway', `initLongSocket() socket has already been created, quit initialize.`)
      return
    }

    this.longSocket = new Socket()
    this.longSocket.connect(80, this.longHost)

    this.longSocket.on('data', this.onData.bind(this))

    this.longSocket.on('close', () => {
      log.info(PRE, `initLongSocket() connection to wechat long host server: ${this.longHost} closed.`)
      this.emit('socketClose')
    })

    this.longSocket.on('connect', () => {
      log.info(PRE, `initLongSocket() connected to wechat long host server: ${this.longHost}.`)
    })

    this.longSocket.on('error', (err: Error) => {
      log.error(PRE, `initLongSocket() error happened with long host server connection: ${err}`)
      this.emit('socketError', err)
    })

    this.longSocket.on('end', () => {
      log.info(PRE, `initLongSocket() connection to wechat long host server: ${this.longHost} ended.`)
      this.emit('socketEnd')
    })
  }

  public async callApi (apiName: string, params?: ApiParams, forceLongOrShort?: boolean) {
    const option = ApiOptions[apiName]
    if (!option) {
      throw new Error(`Unknown API name: ${apiName}`)
    }
    const { noParse } = option
    let { longRequest } = option
    if (forceLongOrShort !== undefined) {
      longRequest = forceLongOrShort
    }

    if (longRequest) {
      const buffer = await this.grpcGateway.packLong(apiName, params)
      const wxResponse = await this.sendLong(buffer, noParse)
      return noParse ? wxResponse : this.grpcGateway.parse(apiName, wxResponse)
    } else {
      const res = await this.grpcGateway.packShort(apiName, params)
      const wxResponse = await this.sendShort(res, noParse)
      return this.grpcGateway.parse(apiName, wxResponse)
    }
  }

  private async sendShort (res: PackShortRes, noParse?: boolean): Promise<Buffer> {
    log.silly('WechatGateway', `sendShort() res: commandUrl: ${res.commandUrl}`)
    const options: RequestOptions = {
      headers: {
        'Content-Length': res.payload.length,
        'Content-Type': 'application/x-www-form-urlencoded',
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

        const timeoutTimer = setTimeout(() => {
          reject(`sendShort failed: timeout.`)
        }, 10000)

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
          clearTimeout(timeoutTimer)
          // Short request parse judgement
          if (!noParse && buffer[0] !== 191) {
            reject(`sendShort receive unknown package: [${buffer[0]}] ${buffer.toString('hex')} ${buffer.toString()}]`)
          }
          resolve(buffer)
        })
      })

      req.write(res.payload)
      req.end()
    })
  }

  private async sendLong (sendBuff: Buffer, noParse?: boolean): Promise<Buffer> {
    const reqSeq = this.bufferToInt(sendBuff, 12)
    log.silly(PRE, `sendLong() reqSeq: ${reqSeq}`)

    return new Promise<Buffer>((resolve, reject) => {
      this.backs[reqSeq] = (buffer: Buffer) => {
        // Long request parse judgement
        if (!noParse && buffer[16] !== 191) {
          reject(`sendLong receive unknown package: [${buffer[16]}] ${buffer.toString('hex')} ${buffer.toString()}]`)
        }
        delete this.backs[reqSeq]
        resolve(buffer)
      }

      try {
        if (!this.longSocket) {
          reject(`Long socket not initialized, can not send message through long socket.`)
        } else {
          this.longSocket.write(sendBuff)
        }
      } catch (e) {
        delete this.backs[reqSeq]
        // this.connectLongSocket()
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
        // this.onMessage(bys)
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
