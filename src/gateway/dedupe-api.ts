import { log } from '../config'
import { ApiParams } from './grpc-gateway'

// Expire time for api call data that persist in the pool
// Number of seconds
const EXPIRE_TIME = 10

const DEDUPE_API = [
  'GrpcGetContact',
  'GrpcGetChatRoomMember',
  'GrpcSearchContact',
]

interface ApiCall {
  timestamp: number,
  returned: boolean,
  result?: any,
  listener: PendingApiCall[],
}

interface PendingApiCall {
  resolve: (data: any) => void,
  reject: (e: any) => void,
}

const PRE = 'DedupeApi'

/**
 * This class will dedupe api calls
 * Multiple calls within a period of time will only fire up one api call to the server,
 * all the other calls will get the same response as the fired one
 *
 * Only api calls in the DEDUPE_API list will be affected.
 */
export class DedupeApi {
  private pool: {
    [key: string]: ApiCall
  }

  private cleaner: NodeJS.Timer

  constructor () {
    this.pool = {}
    this.cleaner = setInterval(this.cleanData, EXPIRE_TIME * 1000)
  }

  public async dedupe (
    func: (apiName: string, params?: ApiParams, forceLongOrShort?: boolean) => Promise<any>,
    apiName: string,
    params?: ApiParams,
    forceLongOrShort?: boolean,
  ): Promise<any> {
    if (DEDUPE_API.indexOf(apiName) === -1) {
      return func(apiName, params, forceLongOrShort)
    }
    log.silly(PRE, `dedupeApi(${apiName}, ${params ? JSON.stringify(params) : ''})`)
    const key = this.getKey(apiName, params)
    const existCall = this.pool[key]
    const now = new Date().getTime()
    if (existCall && now - existCall.timestamp < EXPIRE_TIME * 1000) {
      if (existCall.returned) {
        log.silly(PRE, `dedupeApi(${apiName}) deduped api call with existing results.`)
        return existCall.result
      } else {
        log.silly(PRE, `dedupeApi(${apiName}) deduped api call with pending listener.`)
        return new Promise((resolve, reject) => {
          existCall.listener.push({
            reject,
            resolve,
          })
        })
      }
    } else {
      log.silly(PRE, `dedupeApi(${apiName}) deduped api call missed, call the external service.`)
      this.pool[key] = {
        listener: [],
        returned: false,
        timestamp: now,
      }
      let result: any
      try {
        result = await func(apiName, params, forceLongOrShort)
      } catch (e) {
        log.silly(PRE, `dedupeApi(${apiName}) failed from external service, reject ${this.pool[key].listener.length} duplicate api calls.`)
        this.pool[key].listener.map(api => {
          api.reject(e)
        })
        throw e
      }

      this.pool[key].result = result
      this.pool[key].returned = true
      log.silly(PRE, `dedupeApi(${apiName}) got results from external service, resolve ${this.pool[key].listener.length} duplicate api calls.`)
      this.pool[key].listener.map(api => {
        api.resolve(result)
      })

      return result
    }
  }

  public destroy () {
    for (const key in this.pool) {
      if (this.pool.hasOwnProperty(key)) {
        delete this.pool[key]
      }
    }
    clearInterval(this.cleaner)
  }

  /**
   * Get rid of data in pool that exists for more than EXPIRE_TIME
   */
  private cleanData () {
    const now = new Date().getTime()
    for (const key in this.pool) {
      if (this.pool.hasOwnProperty(key)) {
        const apiCache = this.pool[key]
        if (apiCache.timestamp - now > EXPIRE_TIME * 1000) {
          delete this.pool[key]
        }
      }
    }
  }

  private getKey (apiName: string, params?: ApiParams) {
    return `${apiName}-${params ? JSON.stringify(params) : ''}`
  }
}
