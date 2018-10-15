import grpc from 'grpc';

import {
  log
}                       from '../config'
import { PadchatGrpcClient } from './proto-ts/PadchatGrpc_grpc_pb';
import { PackLongRequest, PackLongResponse, PackShortRequest, PackShortResponse, ParseRequest, ParsedResponse } from './proto-ts/PadchatGrpc_pb';

export interface ApiParams {
  [ name: string ]: number | string
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
    
    return new Promise<Buffer>((resolve, reject) => {
      this.client.packLong(request, (err: Error | null, response: PackLongResponse) => {
        if (err !== null) {
          reject(err)
          return
        }
        const buffer = Buffer.from(response.getBuffer_asU8())
        resolve(buffer)
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
    
    return new Promise<PackShortRes>((resolve, reject) => {
      this.client.packShort(request, (err: Error | null, response: PackShortResponse) => {
        if (err) {
          reject(err)
          return
        }
        const payload = Buffer.from(response.getPayload_asU8())
        const commandUrl = response.getCommandurl()
        resolve({ payload, commandUrl })
      })
    })
  }

  public async parse (apiName: string, payload: Buffer): Promise<any> {
    const request = new ParseRequest()
    request.setApiname(apiName)
    request.setToken(this.token)
    request.setPayload(payload)

    return new Promise<any>((resolve, reject) => {
      this.client.parse(request, (err: Error | null, response: ParsedResponse) => {
        if (err) {
          reject(err)
          return
        }
        const payload = response.getPayload()
        try {
          log.silly(PRE, `parse(${apiName}) get response: ${payload.slice(200)}`)
          resolve(JSON.parse(payload))
        } catch (e) {
          reject(e)
        }
      })
    })
  }
}
