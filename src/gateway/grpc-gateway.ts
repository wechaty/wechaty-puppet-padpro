import grpc from 'grpc'

import {
  log
}                       from '../config'
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

const PRE = 'GrpcGateway'

export class GrpcGateway {

  private token: string
  private client: PadchatGrpcClient

  constructor (token: string, endpoint: string) {
    this.client = new PadchatGrpcClient(endpoint, grpc.credentials.createInsecure())
    this.token = token
  }

  public async packLong (apiName: string, params?: ApiParams): Promise<Buffer> {
    const request = new PackLongRequest()
    request.setToken(this.token)
    request.setApiname(apiName)
    if (params) {
      request.setParams(JSON.stringify(params))
    }

    try {
      return this._packLong(request)
    } catch (e) {
      await new Promise(r => setTimeout(r, 1000))
      return this._packLong(request)
    }
  }

  private async _packLong (request: PackLongRequest): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      this.client.packLong(request, (err: Error | null, response: PackLongResponse) => {
        if (err !== null) {
          reject(err)
        } else {
          const buffer = Buffer.from(response.getBuffer_asU8())
          resolve(buffer)
        }
      })
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
      return this._packShort(request)
    } catch (e) {
      await new Promise(r => setTimeout(r, 1000))
      return this._packShort(request)
    }
  }

  private async _packShort (request: PackShortRequest): Promise<PackShortRes> {
    return new Promise<PackShortRes>((resolve, reject) => {
      this.client.packShort(request, (err: Error | null, response: PackShortResponse) => {
        if (err) {
          reject(err)
        } else {
          const payload = Buffer.from(response.getPayload_asU8())
          const commandUrl = response.getCommandurl()
          resolve({ payload, commandUrl })
        }
      })
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
      await new Promise(r => setTimeout(r, 1000))
      response = await this._parse(request)
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
      this.client.parse(request, (err: Error | null, response: ParsedResponse) => {
        if (err) {
          reject(err)
        } else {
          resolve(response)
        }
      })
    })
  }

  public isAlive (): boolean {
    // TODO: check grpc connection status here
    return true
  }
}
