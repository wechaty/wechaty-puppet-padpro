import { ApiParams } from './grpc-gateway'

import { log } from '../config'
import { GrpcContactRawPayload, GrpcRoomRawPayload } from '../schemas'

const API = 'GrpcGetContact'

type GetContactResultType = GrpcContactRawPayload | GrpcRoomRawPayload | null

interface ContactCallback {
  resolve: (data: GetContactResultType) => void,
  reject: (e: any) => void,
}

const PRE = 'GetContactHelper'

const API_INTERVAL = 200

export class GetContactHelper {

  private func: (apiName: string, params?: ApiParams, forceLongOrShort?: boolean) => Promise<any>
  private timeout?: NodeJS.Timeout

  private contactIdCallback: {
    [contactId: string]: ContactCallback
  } = {}

  constructor (func: (apiName: string, params?: ApiParams, forceLongOrShort?: boolean) => Promise<any>) {
    this.func = func
  }

  public async get (
    params: ApiParams,
  ): Promise<GetContactResultType> {
    if (!params.UserNameList) {
      log.error(PRE, `Invalid params for GrpcGetContact call, params is ${JSON.stringify(params)}`)
      return null
    }

    const contactId = params.UserNameList as string
    return new Promise<GetContactResultType>((resolve, reject) => {
      this.contactIdCallback[contactId] = {
        reject,
        resolve,
      }
      if (!this.timeout) {
        void this.getContact()
      }
    })
  }

  private getIdToSend (): string[] {
    return Object.keys(this.contactIdCallback).slice(0, 20)
  }

  private async getContact () {
    const ids = this.getIdToSend()
    let results: Array<GrpcContactRawPayload | GrpcRoomRawPayload>
    try {
      results = await this.func(API, { UserNameList: ids.join(',') })
    } catch (e) {
      for (const id of ids) {
        this.contactIdCallback[id].reject(e)
        delete this.contactIdCallback[id]
      }
      return
    }
    for (const result of results) {
      this.contactIdCallback[result.UserName].resolve(result)
      delete this.contactIdCallback[result.UserName]
    }

    if (Object.keys(this.contactIdCallback).length > 0) {
      this.timeout = setTimeout(this.getContact.bind(this), API_INTERVAL)
    } else {
      this.timeout = undefined
    }
  }
}
