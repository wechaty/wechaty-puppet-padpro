import { EventEmitter } from 'events'


import {
  GrpcQrcodeLoginType,
  GrpcMessagePayload,
  GrpcContactRawPayload,
  GrpcRoomRawPayload,
  GrpcSyncContactPayload,
  GrpcCheckQRCode,
  GrpcGetQRCodeType,
  GrpcRoomMemberRawPayload,
} from '../schemas/grpc-schemas'

import {
  isRoomId,
}                       from '../pure-function-helpers'

import { log } from '../config'

import { WechatGateway } from '../gateway/wechat-gateway'
import { ThrottleQueue } from 'rx-queue';
import { Subscription } from 'rxjs';

export const DISCONNECTED = 'DISCONNECTED'
export const CONNECTING = 'CONNECTING'
export const CONNECTED = 'CONNECTED'

export interface ConnectionStatus {
  status: string,
  reconnectLeft: number,
  interval: number
}

export interface PendingAPICall {
  apiName: string,
  params: Array<number | string>,
  timestamp: number,
  resolve: (value?: any | PromiseLike<any>) => void,
  reject: (reason?: any) => void,
}

const PRE = 'PadproGrpc'

export class PadproGrpc extends EventEmitter {

  protected userId?: string
  private wechatGateway: WechatGateway
  private syncThrottleQueue: ThrottleQueue<string>
  private syncThrottleQueueSubscription: Subscription

  constructor (
    protected token: string,
    protected endpoint: string,
    protected proxyEndpoint?: string,
  ) {
    super()
    this.token = token
    this.wechatGateway = new WechatGateway(token, endpoint, proxyEndpoint)
    this.syncThrottleQueue = new ThrottleQueue(300)
    this.syncThrottleQueueSubscription = this.syncThrottleQueue.subscribe(() => {
      // TODO: un-comment this when finish debugging
      // this.syncMessage()
    })
    this.initEvents()
    log.silly(PRE, `constructor(${token})`)
  }

  public initEvents () {
    this.wechatGateway.on('newMessage', msg => {
      // Add throttle to sync message, otherwise,
      // it will call the sync function multiple times
      // within a short period of time, causing useless traffic
      log.silly(PRE, `initEvents() newMessage event triggered with msg: ${msg.toString()}`)
      this.syncThrottleQueue.next(msg.toString())
    })
    this.wechatGateway.on('rawMessage', () => {
      // TODO: replace with watchdog or something
      // this.GrpcHeartBeat()
    })
  }

  private async syncMessage() {
    const messages = await this.wechatGateway.callApi('GrpcSyncMessage')
    console.log(messages)
  }

  public async GrpcGetQRCode (): Promise<GrpcGetQRCodeType> {
    if (!this.wechatGateway) {
      throw Error(`${PRE} GrpcGetQRCode() has no wechatyGateway.`)
    }
    const result = await this.wechatGateway.callApi('GrpcGetQRCode')

    return { qr_code: result.ImgBuf }
  }

  public async start (): Promise<void> {
    log.verbose(PRE, 'start()')
    this.initEvents()
    await this.wechatGateway.start()
  }

  private async GrpcHeartBeat () {
    const payloads = await this.wechatGateway.callApi('GrpcHeartBeat')
    if (payloads[3] !== 20 || payloads[5] !== 16) {
      throw new Error()
    }
  }

  public async GrpcAutoLogin (): Promise<string> {

    let result = await this.wechatGateway.callApi('GrpcAutoLogin')
    if (result.status === -301) {
      this.wechatGateway.switchHost({ shortHost: result.shothost, longHost: result.longhost })
      result = await this.wechatGateway.callApi('GrpcAutoLogin')
    } else if (result.status !== 0) {
      throw Error('Auto login failed')
    }
    return result.userName
  }

  public async GrpcQRCodeLogin (userName: string, password: string): Promise<string> {
    log.info(PRE, `GrpcQRCodeLogin(${userName}, ${password})`)
    let result: GrpcQrcodeLoginType = await this.wechatGateway.callApi('GrpcQRCodeLogin', { userName, password })
    if (result.status === -301) {
      this.wechatGateway.switchHost({ shortHost: result.shortHost, longHost: result.longHost })
      log.silly(PRE, 'GrpcQRCodeLogin() Redirect to long connection')
      result = await this.wechatGateway.callApi('GrpcQRCodeLogin', { userName, password }, true)
    }

    return result.userName
  }

  public async GrpcCheckQRCode (): Promise<GrpcCheckQRCode> {
    log.info(PRE, `GrpcCheckQRCode()`)
    return await this.wechatGateway.callApi('GrpcCheckQRCode')
  }

  protected reset (reason = 'unknown reason'): void {
    log.verbose(PRE, 'reset(%s)', reason)

    this.emit('reset', reason)
  }

  public stop (): void {
    this.syncThrottleQueueSubscription.unsubscribe()

    log.verbose(PRE, 'stop()')
  }

  /**
   * This function will fetch contact data for the given contact id(s)
   * @param contact This is either one wxid or an array of wxid
   */
  protected async GrpcGetContactPayload (contact: string)  : Promise<GrpcContactRawPayload | null>
  protected async GrpcGetContactPayload (contact: string[]): Promise<GrpcContactRawPayload[]>

  protected async GrpcGetContactPayload (
    contact: string | string[]
  )        : Promise<GrpcContactRawPayload | GrpcContactRawPayload[] | null> {
    log.silly(PRE, `GrpcGetContactPayload(${contact})`)
    let UserNameList: string
    if (typeof contact === 'string') {
      UserNameList = contact
    } else {
      UserNameList = contact.join(',')
    }

    const result: GrpcContactRawPayload[] = await this.wechatGateway.callApi('GrpcGetContact', { UserNameList })
    // log.silly(PRE, `GrpcGetContactPayload() result: ${JSON.stringify(result)}`)

    if (typeof contact === 'string') {
      return result.length === 0 ? null : result[0]
    } else {
      return result
    }
  }

  protected async GrpcGetRoomPayload (room: string): Promise<GrpcRoomRawPayload | null>
  protected async GrpcGetRoomPayload (room: string[]): Promise<GrpcRoomRawPayload[]>

  protected async GrpcGetRoomPayload (
    room: string | string[]
  ): Promise<GrpcRoomRawPayload | GrpcRoomRawPayload[] | null> {
    log.silly(PRE, `GrpcGetRoomPayload(${room})`)
    let UserNameList: string
    if (typeof room === 'string') {
      if (!isRoomId(room)) {
        throw new Error(`GrpcGetRoomPayload got non room id: ${room}, can not process it`)
      }
      UserNameList = room
    } else {
      room.map(r => {
        if (!isRoomId(r)) {
          throw new Error(`GrpcGetRoomPayload got non room id: ${r}, can not process it`)
        }
      })
      UserNameList = room.join(',')
    }

    const result: GrpcRoomRawPayload[] = await this.wechatGateway.callApi('GrpcGetContact', { UserNameList })
    // log.silly(PRE, `GrpcGetRoomPayload() result: ${JSON.stringify(result)}`)

    if (typeof room === 'string') {
      return result.length === 0 ? null : result[0]
    } else {
      return result
    }
  }

  /**
   * This function will return at most 100 wxid for either contacts or rooms
   * Use the contactSeq or roomSeq to sync contact continuously
   * @param contactSeq contact sequence number
   * @param roomSeq room sequence number
   */
  protected async GrpcSyncContact (
    contactSeq: number = 0,
    roomSeq   : number = 0,
  ): Promise<GrpcSyncContactPayload> {
    log.silly(PRE, `GrpcSyncContact(contactSeq: ${contactSeq}, roomSeq: ${roomSeq})`)
    const result: GrpcSyncContactPayload = await this.wechatGateway.callApi('GrpcSyncContact', {
      CurrentWxcontactSeq      : contactSeq,
      CurrentChatRoomContactSeq: roomSeq
    })
    // log.silly(PRE, `GrpcSyncContact() result: ${JSON.stringify(result)}`)
    return result
  }

  /**
   * Get room member list for a given room id
   * @param roomId room id
   */
  protected async GrpcGetChatRoomMember (roomId: string): Promise<GrpcRoomMemberRawPayload> {
    log.silly(PRE, `GrpcGetChatRoomMember(${roomId})`)
    const result: GrpcRoomMemberRawPayload = await this.wechatGateway.callApi('GrpcGetChatRoomMember', {
      Chatroom: roomId
    })
    // log.silly(PRE, `GrpcGetChatRoomMember() result: ${JSON.stringify(result)}`)
    return result
  }
}
