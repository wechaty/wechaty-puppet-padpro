import { EventEmitter } from 'events'

import {
  GrpcCheckQRCode,
  GrpcContactOperationOption,
  GrpcContactRawPayload,
  GrpcGetQRCodeType,
  GrpcMessagePayload,
  GrpcQrcodeLoginType,
  GrpcRoomMemberRawPayload,
  GrpcRoomRawPayload,
  GrpcSyncContactPayload,
} from '../schemas/grpc-schemas'

import {
  isRoomId,
}                       from '../pure-function-helpers'

import { log } from '../config'

import { WechatGateway } from '../gateway/wechat-gateway'
import {
  ContactOperationBitVal,
  ContactOperationCmdId,
  GrpcVoiceFormat,
  SearchContactTypeStatus,
} from '../schemas'

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
  protected wechatGateway: WechatGateway

  constructor (
    protected token: string,
    protected endpoint: string,
    protected proxyEndpoint?: string,
  ) {
    super()
    this.token = token
    this.wechatGateway = new WechatGateway(token, endpoint, proxyEndpoint)

    log.silly(PRE, `constructor(${token})`)
  }

  protected async GrpcSyncMessage ()
    : Promise<Array<GrpcMessagePayload | GrpcContactRawPayload | GrpcRoomRawPayload>> {
    return this.wechatGateway.callApi('GrpcSyncMessage')
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
    await this.wechatGateway.start()
  }

  protected async GrpcHeartBeat () {
    const payloads = await this.wechatGateway.callApi('GrpcHeartBeat')
    if (payloads[3] !== 20 || payloads[5] !== 16) {
      throw new Error()
    }
    return payloads
  }

  public async GrpcAutoLogin (): Promise<string> {

    let result = await this.wechatGateway.callApi('GrpcAutoLogin')
    if (result.status === -301) {
      log.silly(PRE, `GrpcAutoLogin() redirect host ${JSON.stringify(result)}`)
      await this.wechatGateway.switchHost({ shortHost: result.shortHost, longHost: result.longHost })
      result = await this.wechatGateway.callApi('GrpcAutoLogin')
    }

    if (result.status !== 0) {
      log.verbose(PRE, `GrpcAutoLogin() login failed with result: ${JSON.stringify(result)}`)
      throw Error('Auto login failed')
    }
    log.verbose(PRE, `GrpcAutoLogin() success with result: ${JSON.stringify(result)}`)
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
    return this.wechatGateway.callApi('GrpcCheckQRCode')
  }

  protected reset (reason = 'unknown reason'): void {
    log.verbose(PRE, 'reset(%s)', reason)

    this.emit('reset', reason)
  }

  public stop (): void {
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
      CurrentChatRoomContactSeq: roomSeq,
      CurrentWxcontactSeq      : contactSeq,
    })
    // log.silly(PRE, `GrpcSyncContact() result: ${JSON.stringify(result)}`)
    return result
  }

  /**
   * Get room member list for a given room id
   * @param roomId room id
   */
  public async GrpcGetChatRoomMember (roomId: string): Promise<GrpcRoomMemberRawPayload> {
    log.silly(PRE, `GrpcGetChatRoomMember(${roomId})`)
    const result: GrpcRoomMemberRawPayload = await this.wechatGateway.callApi('GrpcGetChatRoomMember', {
      Chatroom: roomId
    })
    // log.silly(PRE, `GrpcGetChatRoomMember() result: ${JSON.stringify(result)}`)
    return result
  }

  /**
   * Log out wechat
   */
  public async GrpcLogout () {
    log.silly(PRE, `GrpcLogout()`)
    await this.wechatGateway.callApi('GrpcLogout')
  }

  /**
   * Set an alias for a given contact
   * @param contactId contact id
   * @param alias new alias
   */
  public async GrpcSetContactAlias (contactId: string, alias: string) {
    log.silly(PRE, `GrpcSetContactAlias(${contactId}, ${alias})`)
    const contactOperationOption: GrpcContactOperationOption = {
      bitVal: ContactOperationBitVal.Remark,
      cmdid: ContactOperationCmdId.Operation,
      remark: alias,
      userId: contactId,
    }
    await this.GrpcContactOperation(contactOperationOption)
  }

  /**
   * Get qrcode for given contact. This api is able to get qrcode for self or
   * rooms that already joined
   * @param contactId contact id
   */
  public async GrpcGetContactQrcode (contactId: string) {
    log.silly(PRE, `GrpcGetContactQrcode(${contactId})`)
    const result = await this.wechatGateway.callApi('GrpcGetContactQrcode', {
      Style: 0,
      Useranme: contactId,
    })
    return result
  }

  /**
   * Set user info for self
   * @param nickName nick name
   * @param signature signature
   * @param sex sex
   * @param country country
   * @param province province
   * @param city city
   */
  public async GrpcSetUserInfo (
    nickName: string,
    signature: string,
    sex: string,
    country: string,
    province: string,
    city: string
  ) {
    log.silly(PRE, `GrpcSetUserInfo(${nickName}, ${signature}, ${sex}, ${country}, ${province}, ${city})`)
    await this.wechatGateway.callApi('GrpcSetUserInfo', {
      City     : city,
      Country  : country,
      NickName : nickName,
      Province : province,
      Sex      : sex,
      Signature: signature,
    })
  }

  /**
   * Add friend with contact's stranger and ticket value
   * @param stranger stranger, v1_
   * @param ticket ticket, v2_
   * @param type search contact type status
   * @param content content used for add friend
   */
  public async GrpcAddFriend (
    stranger: string,
    ticket: string,
    type: SearchContactTypeStatus,
    content: string,
  ) {
    log.silly(PRE, `GrpcAddFriend(${stranger}, ${ticket}, ${type}, ${content})`)
    await this.wechatGateway.callApi('GrpcAddFriend', {
      Content: content,
      Encryptusername: stranger,
      Sence: type,
      Ticket: ticket,
      Type: type,
    })
  }

  /**
   * Accept friend request
   * @param stranger stranger, v1_
   * @param ticket ticket, v2_
   */
  public async GrpcAcceptFriend (
    stranger: string,
    ticket: string,
  ) {
    log.silly(PRE, `GrpcAcceptFriend(${stranger}, ${ticket})`)
    await this.wechatGateway.callApi('GrpcAcceptFriend', {
      Content: '',
      Encryptusername: stranger,
      Sence: 3,
      Ticket: ticket,
      Type: 3,
    })
  }

  /**
   * Search contact
   * @param contactId contact id
   */
  public async GrpcSearchContact (contactId: string) {
    log.silly(PRE, `GrpcSearchContact(${contactId})`)
    const result = await this.wechatGateway.callApi('GrpcSearchContact', {
      Username: contactId,
    })
    return result
  }

  /**
   * Send message
   * @param contactId contact id
   * @param content content
   * @param atUserList at user list
   */
  public async GrpcSendMessage (
    contactId: string,
    content: string,
    atUserList?: string,
  ) {
    log.silly(PRE, `GrpcSendMessage(${contactId}, ${content}, ${atUserList})`)

    await this.wechatGateway.callApi('GrpcSendMessage', {
      Content: content,
      MsgSource: atUserList ? atUserList : '',
      ToUserName: contactId,
    })
  }

  /**
   * Send image
   * @param contactId contact id to send image
   * @param data image data
   * TODO: check usage of StartPos etc and the limit of photo size
   */
  public async GrpcSendImage (
    contactId: string,
    data: string,
  ) {
    log.silly(PRE, `GrpcSendImage()`)
    await this.wechatGateway.callApi('GrpcSendImage', {
      ClientImgId: contactId + new Date().getTime().toString(),
      Data: data,
      DataLen: data.length,
      StartPos: 0,
      ToUserName: contactId,
      TotalLen: data.length,
    })
  }

  /**
   * Send voice message
   * @param contactId contact id
   * @param data voice data
   * @param voiceLength voice length, in millisecond
   */
  public async GrpcSendVoice (
    contactId: string,
    data: string,
    voiceLength: number,
  ) {
    log.silly(PRE, `GrpcSendVoice()`)
    await this.wechatGateway.callApi('GrpcSendVoice', {
      Data: data,
      EndFlag: 1,
      Length: data.length,
      Offset: 0,
      ToUserName: contactId,
      VoiceFormat: GrpcVoiceFormat.Silk,
      VoiceLength: voiceLength,
    })
  }

  public async GrpcSendApp (
    contactId: string,
    content: string,
  ) {
    log.silly(PRE, `GrpcSendApp(${contactId})`)
    await this.wechatGateway.callApi('GrpcSendApp', {
      AppId: '',
      Content: content,
      ToUserName: contactId,
      Type: 5,
    })
  }

  /**
   * Get image from the message
   * @param content message content
   */
  public async GrpcGetMsgImage (
    content: string,
  ): Promise<any> {
    log.silly(PRE, `GrpcGetMsgImage()`)
    // TODO: This feature is not ready yet
    // await this.wechatGateway.callApi('GrpcGetMsgImage')
  }

  /**
   * Get video from the message
   * @param content message content
   */
  public async GrpcGetMsgVideo (
    content: string,
  ): Promise<any> {
    log.silly(PRE, `GrpcGetMsgVideo()`)
    // TODO: This feature is not ready yet
    // await this.wechatGateway.callApi('GrpcGetMsgVideo')
  }

  public async GrpcGetMsgVoice (
    content: string,
  ): Promise<any> {
    log.silly(PRE, `GrpcGetMsgVoice()`)
    // TODO: This feature is not ready yet
    // await this.wechatGateway.callApi('GrpcGetMsgVoice')
  }

  /**
   * Get request token for link
   * @param contactId contact id
   * @param url url
   */
  public async GrpcGetRequestToken (
    contactId: string,
    url: string,
  ) {
    log.silly(PRE, `GrpcGetRequestToken(${contactId}, ${url})`)
    // TODO: what is the data structure of the return data?
    return this.wechatGateway.callApi('GrpcGetRequestToken', {
      fromUser: contactId,
      url
    })
  }

  /**
   * Create room with given members
   * @param contactIdList room member list
   */
  public async GrpcCreateRoom (
    contactIdList: string[],
  ) {
    log.silly(PRE, `GrpcCreateRoom(${JSON.stringify(contactIdList)})`)
    // TODO: what is the data structure of the return data?
    const result = await this.wechatGateway.callApi('GrpcCreateRoom', {
      Membernames: JSON.stringify(contactIdList)
    })
    return result
  }

  /**
   * Set room name
   * @param roomId room id
   * @param name new room name
   */
  public async GrpcSetRoomName (
    roomId: string,
    name: string,
  ) {
    log.silly(PRE, `GrpcSetRoomName(${roomId}, ${name})`)
    await this.wechatGateway.callApi('GrpcSetRoomName', {
      ChatRoom: roomId,
      Cmdid: 27,
      Roomname: name,
    })
  }

  /**
   * Quit room with id
   * @param roomId room id
   */
  public async GrpcQuitRoom (
    roomId: string,
  ) {
    log.silly(PRE, `GrpcQuitRoom(${roomId})`)
    await this.wechatGateway.callApi('GrpcQuitRoom', {
      chatroom: roomId,
    })
  }

  /**
   * Add contact(s) into a given room
   * @param roomId room id
   * @param contactId contact id or a list of contact ids
   */
  public async GrpcAddRoomMember (
    roomId: string,
    contactId: string | string[]
  ) {
    log.silly(PRE, `GrpcAddChatRoomMember(${roomId}, ${contactId})`)
    let Membernames = ''
    if (typeof contactId === 'string') {
      Membernames = contactId
    } else {
      Membernames = contactId.join(',')
    }

    await this.wechatGateway.callApi('GrpcAddChatRoomMember', {
      Membernames,
      Roomeid: roomId,
    })
  }

  /**
   * Invite a contact into a room
   * @param roomId room id
   * @param contactId contact id needs to be invited
   */
  public async GrpcInviteRoomMember (
    roomId: string,
    contactId: string,
  ) {
    log.silly(PRE, `GrpcInviteRoomMember(${roomId}, ${contactId})`)
    await this.wechatGateway.callApi('GrpcInviteRoomMember', {
      ChatRoom: roomId,
      Username: contactId,
    })
  }

  /**
   * Remove a member from a room
   * @param roomId room id
   * @param contactId contact id needs to be removed
   */
  public async GrpcDeleteRoomMember (
    roomId: string,
    contactId: string,
  ) {
    log.silly(PRE, `GrpcDeleteRoomMember(${roomId}, ${contactId})`)
    await this.wechatGateway.callApi('GrpcDeleteRoomMember', {
      ChatRoom: roomId,
      Username: contactId,
    })
  }

  /**
   * Set room announcement
   * @param roomId room id
   * @param announcement announcement
   */
  public async GrpcSetRoomAnnouncement (
    roomId: string,
    announcement: string,
  ) {
    log.silly(PRE, `GrpcSetRoomAnnouncement(${roomId}, ${announcement})`)
    await this.wechatGateway.callApi('GrpcSetRoomAnnouncement', {
      Announcement: announcement,
      ChatRoomName: roomId,
    })
  }

  /**
   * Underlying function to do contact operations
   * @param option Contact operation option
   */
  private async GrpcContactOperation (option: GrpcContactOperationOption) {
    const params: any = {}
    params.Cmdid = option.cmdid
    params.CmdBuf = option.userId
    if (option.bitVal) {
      params.BitVal = option.bitVal
    }
    if (option.remark) {
      params.Remark = option.remark
    }
    await this.wechatGateway.callApi('GrpcContactOperation', params)
  }
}
