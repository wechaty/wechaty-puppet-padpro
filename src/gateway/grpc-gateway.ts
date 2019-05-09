import { EventEmitter } from 'events'
import grpc from 'grpc'

import {
  GRPC_GATEWAY_DISCONNECT_MAX_DURATION,
  GRPC_GATEWAY_DISCONNECT_MIN_ERROR,
  GRPC_GATEWAY_MAX_ERROR_COUNT,
  GRPC_GATEWAY_MAX_RETRY,
  GRPC_GATEWAY_TIMEOUT,
  log,
  LOGIC_ERROR_MESSAGE,
}                       from '../config'
import { EXPIRED_TOKEN_MESSAGE, INVALID_TOKEN_MESSAGE } from '../consts'
import { EncryptionServiceError, GRPC_CODE } from '../schemas'
import { PadchatGrpcClient } from './proto-ts/PadchatGrpc_grpc_pb'
import {
  PackLongRequest,
  PackLongResponse,
  PackShortRequest,
  PackShortResponse,
  ParsedResponse,
  ParseRequest,
} from './proto-ts/PadchatGrpc_pb'

export interface ApiParams {
  [ name: string ]: number | string | Buffer
}

export interface PackShortRes {
  commandUrl: string,
  payload: Buffer,
}

export type GrpcGatewayEvent = 'error'

const PRE = 'GrpcGateway'
export class GrpcGateway extends EventEmitter {

  private token: string
  private errorCounter: number
  private errorStartTimestamp: number
  private endpoint: string
  private client: PadchatGrpcClient

  constructor (token: string, endpoint: string) {
    super()
    this.endpoint = endpoint
    this.token = token
    this.errorCounter = 0
    this.errorStartTimestamp = 0
    this.client = new PadchatGrpcClient(this.endpoint, grpc.credentials.createInsecure())
  }

  // public async start () {
  //   if (this.client) {
  //     log.verbose(PRE, `start() client has been started`)
  //     return
  //   }
  // }

  // public async stop () {
  //   this.removeAllListeners()
  //   this.errorCounter = 0
  //   this.errorStartTimestamp = 0
  //   if (this.client) {
  //     this.client.close()
  //     this.client = undefined
  //   }
  // }

  public emit (event: 'error', err: Error): boolean
  public emit (event: never, listener: never): never
  public emit (
    event: GrpcGatewayEvent,
    ...args: any[]
  ): boolean {
    return super.emit(event, ...args)
  }

  public on (event: 'error', listener: ((this: GrpcGateway, err: Error) => void)): this
  public on (event: never, listener: never): never
  public on (event: GrpcGatewayEvent, listener: ((...args: any[]) => any)): this {
    log.verbose(PRE, `on(${event}, ${typeof listener}) registered`)
    super.on(event, (...args: any[]) => {
      try {
        listener.apply(this, args)
      } catch (e) {
        log.error(PRE, `onFunction(${event}) listener exception: ${e}`)
      }
    })
    return this
  }

  public async packLong (apiName: string, params?: ApiParams): Promise<Buffer> {
    const request = new PackLongRequest()
    request.setToken(this.token)
    request.setApiname(apiName)
    if (params) {
      request.setParams(JSON.stringify(params))
    }

    try {
      const result = await this._packLong(request)
      return result
    } catch (e) {
      const result = await this.processError(e, () => this._packLong(request))
      return result
    }
  }

  private async _packLong (request: PackLongRequest): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      this.client.packLong(
        request,
        new grpc.Metadata(),
        { deadline: Date.now() + GRPC_GATEWAY_TIMEOUT },
        (err: Error | null, response: PackLongResponse) => {
          if (err !== null) {
            reject(err)
          } else {
            const buffer = Buffer.from(response.getBuffer_asU8())
            this.cleanUpErrorCounter()
            resolve(buffer)
          }
        }
      )
    })
  }

  public async packShort (apiName: string, params?: ApiParams): Promise<PackShortRes> {
    const request = new PackShortRequest()
    request.setToken(this.token)
    request.setApiname(apiName)
    if (params) {
      request.setParams(JSON.stringify(params))
    }

    try {
      const result = await this._packShort(request)
      return result
    } catch (e) {
      const result = await this.processError(e, () => this._packShort(request))
      return result
    }
  }

  private async _packShort (request: PackShortRequest): Promise<PackShortRes> {
    return new Promise<PackShortRes>((resolve, reject) => {
      this.client.packShort(
        request,
        new grpc.Metadata(),
        { deadline: Date.now() + GRPC_GATEWAY_TIMEOUT },
        (err: Error | null, response: PackShortResponse) => {
          if (err !== null) {
            reject(err)
          } else {
            const payload = Buffer.from(response.getPayload_asU8())
            const commandUrl = response.getCommandurl()
            this.cleanUpErrorCounter()
            resolve({ payload, commandUrl })
          }
        }
      )
    })
  }

  public async parse (apiName: string, payload: Buffer): Promise<any> {
    const request = new ParseRequest()
    request.setApiname(apiName)
    request.setToken(this.token)
    request.setPayload(payload)

    let response: ParsedResponse
    try {
      response = await this._parse(request)
    } catch (e) {
      response = await this.processError(e, () => this._parse(request))
    }

    const returnPayload = response.getPayload()
    try {
      const result = JSON.parse(returnPayload)
      log.silly(PRE, `parse(${apiName}) get response: ${returnPayload.slice(0, 200)}`)
      return result
    } catch (e) {
      log.verbose(PRE, `parse(${apiName}) get response that can not be parsed.
      Response is ${Buffer.from(returnPayload).toString('utf-8')}`)
      return ''
    }
  }

  private async _parse (request: ParseRequest): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      this.client.parse(
        request,
        new grpc.Metadata(),
        { deadline: Date.now() + GRPC_GATEWAY_TIMEOUT },
        (err: Error | null, response: ParsedResponse) => {
          if (err !== null) {
            reject(err)
          } else {
            this.cleanUpErrorCounter()
            resolve(response)
          }
        }
      )
    })
  }

  public isAlive (): boolean {
    // TODO: check grpc connection status here
    return true
  }

  private cleanUpErrorCounter () {
    this.errorCounter = 0
    this.errorStartTimestamp = 0
  }

  private async processError (
    e: any,
    callback: () => Promise<any>,
    retryLeft?: number
  ): Promise<any> {
    /**
     * Process Unauthenticated error
     */
    if (e.code === GRPC_CODE.UNAUTHENTICATED) {
      if (e.details === 'INVALID_TOKEN') {
        log.error(INVALID_TOKEN_MESSAGE)
      } else if (e.details === 'EXPIRED_TOKEN') {
        log.error(EXPIRED_TOKEN_MESSAGE)
      } else {
        log.verbose(`Unknown error: ${e.stack}`)
        throw e
      }
      process.exit(-1)
    }
    /**
     * Process logic error
     */
    for (const message of LOGIC_ERROR_MESSAGE) {
      if (e.message.indexOf(message) !== -1) {
        throw e
      }
    }
    /**
     * Process service status related error
     */
    if (!retryLeft) {
      retryLeft = GRPC_GATEWAY_MAX_RETRY
    }
    if (retryLeft === 0) {
      throw new Error(EncryptionServiceError.INTERNAL_ERROR)
    }
    if (e.code === GRPC_CODE.CANCELLED || e.code === GRPC_CODE.UNAVAILABLE) {
      if (this.errorCounter === 0) {
        this.errorStartTimestamp = Date.now()
      }
      if (++this.errorCounter >= GRPC_GATEWAY_MAX_ERROR_COUNT
        || (this.errorCounter > GRPC_GATEWAY_DISCONNECT_MIN_ERROR
          && Date.now() - this.errorStartTimestamp > GRPC_GATEWAY_DISCONNECT_MAX_DURATION)) {

        this.emit('error', new Error(`Error happened consecutively for ${this.errorCounter} times`))
        this.cleanUpErrorCounter()
      }
      log.verbose(PRE, `total error so far ${this.errorCounter}`)
      throw new Error(EncryptionServiceError.INTERNAL_ERROR)
    }
    /**
     * Retry rpc call
     */
    try {
      await new Promise(r => setTimeout(r, 1000))
      const result = await callback()
      return result
    } catch (e) {
      return this.processError(e, callback, --retryLeft)
    }
  }
}
