import { EventEmitter } from 'events'

import {
  GrpcAutoLoginType,
  GrpcCheckQRCode,
  GrpcContactOperationOption,
  GrpcContactRawPayload,
  GrpcCreateRoomPayload,
  GrpcGetA8KeyType,
  GrpcGetContactQrcodePayload,
  GrpcGetMsgImageType,
  GrpcGetMsgVoiceType,
  GrpcGetQRCodeType,
  GrpcRoomMemberRawPayload,
  GrpcRoomRawPayload,
  GrpcSyncMessagePayload,
} from '../schemas/grpc-schemas'

import { generateContactXMLMessage, isRoomId } from '../pure-function-helpers'
import { loginErrorParser } from '../pure-function-helpers/login-error-parser'

import { log } from '../config'

import { WechatGateway } from '../gateway/wechat-gateway'
import {
  AutoLoginError,
  ContactOperationBitVal,
  ContactOperationCmdId,
  EncryptionServiceError,
  GrpcA8KeyScene,
  PadproContactPayload,
  PadproImageMessagePayload,
  PadproMessagePayload,
  PadproMessageType,
  PadproVideoMessagePayload,
  PadproVoiceMessagePayload,
  SearchContactTypeStatus,
} from '../schemas'
import { PadproAutoLoginError } from '../schemas/padpro-auto-login-error'

const PRE = 'PadproGrpc'

export class PadproGrpc extends EventEmitter {

  protected userId?: string
  protected wechatGateway: WechatGateway

  constructor (
  ) {
    super()
    this.wechatGateway = WechatGateway.Instance
    log.silly(PRE, `constructor()`)
  }

  protected async GrpcSyncMessage (): Promise<GrpcSyncMessagePayload[] | null> {
    const result = await this.wechatGateway.callApi('GrpcSyncMessage')
    if (result === null) {
      return []
    } else {
      return result.data !== null ? result.data : []
    }
  }

  public async GrpcGetQRCode (): Promise<GrpcGetQRCodeType> {
    if (!this.wechatGateway) {
      throw Error(`${PRE} GrpcGetQRCode() has no wechatyGateway.`)
    }
    const result = await this.wechatGateway.callApi('GrpcGetQRCode')
    return { qrCode: result.ImgBuf }
  }

  protected async GrpcHeartBeat () {
    log.silly(PRE, `GrpcHeartBeat()`)
    let payloads
    try {
      payloads = await this.wechatGateway.callApi('GrpcHeartBeat')
    } catch (e) {
      if (e.message !== EncryptionServiceError.INTERNAL_ERROR) {
        return null
      }
      throw e
    }
    if (payloads !== null && (payloads[3] !== 20 || payloads[5] !== 16)) {
      // This is might indicate something wrong with wechat connection, but not clear so far
      return null
    }
    return payloads
  }

  public async GrpcAutoLogin (): Promise<string> {

    let result: GrpcAutoLoginType
    try {
      result = await this.wechatGateway.callApi('GrpcAutoLogin')
    } catch (e) {
      if (e.message === EncryptionServiceError.NO_SESSION) {
        throw new Error(AutoLoginError.LOGIN_ERROR)
      }
      if (e.message !== EncryptionServiceError.INTERNAL_ERROR) {
        log.verbose(PRE, `GrpcAutoLogin() encountered unexpected error: ${e.stack}`)
      }
      throw new Error(AutoLoginError.CALL_FAILED)
    }

    /**
     * Redirect to another service endpoint, need second login request.
     */
    if (result.status === -301) {
      log.silly(PRE, `GrpcAutoLogin() redirect host ${JSON.stringify(result)}`)
      this.wechatGateway.switchHost({ shortHost: result.shortHost, longHost: result.longHost })
      // Max gap between the first and the redirect login api is 30 seconds
      try {
        result = await this.wechatGateway.callApi('GrpcAutoLogin')
      } catch (e) {
        if (e.message === EncryptionServiceError.NO_SESSION) {
          throw new Error(AutoLoginError.LOGIN_ERROR)
        } else if (e.message !== EncryptionServiceError.INTERNAL_ERROR) {
          log.verbose(PRE, `GrpcAutoLogin() encountered unexpected error: ${e.stack}`)
        }
        throw new Error(AutoLoginError.CALL_FAILED)
      }
    }

    switch (result.status) {

      /**
       * Successfully sign in to wechat.
       */
      case 0:
        log.verbose(PRE, `GrpcAutoLogin() success with result: ${JSON.stringify(result)}`)
        return result.userName

      /**
       * Wechat account has been logout or signed on another device: Mac or Web etc.
       */
      case -2023:
        log.verbose(PRE, `GrpcAutoLogin() login failed with result: ${JSON.stringify(result)}`)
        if (result.payload) {
          const parsedPayload = await loginErrorParser(result.payload)
          this.emit('error', new PadproAutoLoginError(
            parsedPayload.type,
            parsedPayload.message,
          ).toString())
        }
        throw new Error(AutoLoginError.LOGIN_ERROR)

      /**
       * Exceptions happened for wechat user status
       */
      case -100:
        log.verbose(PRE, `GrpcAutoLogin() login failed, usually this is disconnected by wechat.`)
        if (result.payload) {
          const parsedPayload = await loginErrorParser(result.payload)
          this.emit('error', new PadproAutoLoginError(
            parsedPayload.type,
            parsedPayload.message,
          ).toString())
        }
        throw new Error(AutoLoginError.LOGIN_ERROR)

      case -106:
        log.warn(PRE, `GrpcAutoLogin() login failed, this is not an expected status,
        if you see this, please open an issue and report to us with the detailed log.
        Here is the detailed response from wechat:\n${JSON.stringify(result)}`)
        if (result.payload) {
          const parsedPayload = await loginErrorParser(result.payload)
          this.emit('error', new PadproAutoLoginError(
            parsedPayload.type,
            parsedPayload.message,
          ).toString())
        }
        throw new Error(AutoLoginError.LOGIN_ERROR)

      /**
       * Unknown auto login status
       */
      default:
        log.warn(PRE, `GrpcAutoLogin() login failed with result: ${JSON.stringify(result)}`)
        throw new Error(AutoLoginError.LOGIN_ERROR)
    }
  }

  public async GrpcQRCodeLogin (userName: string, password: string): Promise<string> {
    log.info(PRE, `GrpcQRCodeLogin(${userName}, ${password})`)
    let result = await this.wechatGateway.callApi('GrpcQRCodeLogin', { userName, password })

    if (result.status === -301) {
      this.wechatGateway.switchHost({ shortHost: result.shortHost, longHost: result.longHost })
      log.silly(PRE, 'GrpcQRCodeLogin() Redirect to long connection')
      result = await await this.wechatGateway.callApi('GrpcQRCodeLogin', { userName, password })
    }

    return result.userName
  }

  public async GrpcCheckQRCode (): Promise<GrpcCheckQRCode> {
    log.verbose(PRE, `GrpcCheckQRCode()`)
    return this.wechatGateway.callApi('GrpcCheckQRCode')
  }

  protected reset (reason = 'unknown reason'): void {
    // TODO: do reset logic here
    log.verbose(PRE, 'reset(%s)', reason)

    this.emit('reset', reason)
  }

  public async stop (): Promise<void> {
    log.verbose(PRE, 'stop()')
  }

  /**
   * This function will fetch contact data for the given contact id(s)
   * @param contact This is either one wxid or an array of wxid
   */
  protected async GrpcGetContactPayload (contact: string, forceCall?: boolean)  : Promise<GrpcContactRawPayload | null>
  protected async GrpcGetContactPayload (contact: string[]): Promise<GrpcContactRawPayload[]>

  protected async GrpcGetContactPayload (
    contact: string | string[],
    forceCall?: boolean,
  )        : Promise<GrpcContactRawPayload | GrpcContactRawPayload[] | null> {
    log.silly(PRE, `GrpcGetContactPayload(${contact})`)
    let UserNameList: string
    if (typeof contact === 'string') {
      UserNameList = contact
    } else {
      UserNameList = contact.join(',')
    }

    let result: GrpcContactRawPayload[]
    try {
      result = await this.wechatGateway.callApi('GrpcGetContact', { UserNameList }, forceCall)
    } catch (e) {
      if (typeof contact === 'string') {
        return null
      } else {
        return []
      }
    }
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

    let result: GrpcRoomRawPayload[]
    try {
      result = await this.wechatGateway.callApi('GrpcGetContact', { UserNameList })
    } catch (e) {
      if (typeof room === 'string') {
        return null
      } else {
        return []
      }
    }
    // log.silly(PRE, `GrpcGetRoomPayload() result: ${JSON.stringify(result)}`)

    if (typeof room === 'string') {
      return result.length === 0 ? null : result[0]
    } else {
      return result
    }
  }

  /**
   * Get room member list for a given room id
   * @param roomId room id
   */
  public async GrpcGetChatRoomMember (
    roomId: string
  ): Promise<GrpcRoomMemberRawPayload | null> {
    log.silly(PRE, `GrpcGetChatRoomMember(${roomId})`)
    let result: GrpcRoomMemberRawPayload
    try {
      result = await this.wechatGateway.callApi('GrpcGetChatRoomMember', {
        Chatroom: roomId
      })
      return result
    } catch (e) {
      return null
    }
  }

  /**
   * Log out wechat
   */
  public async GrpcLogout () {
    log.silly(PRE, `GrpcLogout()`)
    try {
      await this.wechatGateway.callApi('GrpcLogout')
    } catch (e) {
      return
    }
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
    const result: GrpcGetContactQrcodePayload = await this.wechatGateway.callApi('GrpcGetContactQrcode', {
      Username: contactId,
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
      Cmdid    : 1,
      Country  : country,
      NickName : nickName,
      Province : province,
      Sex      : parseInt(sex, 10),
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
    const result = await this.wechatGateway.callApi('GrpcAddFriend', {
      Content: content,
      Encryptusername: stranger,
      Sence: type,
      Ticket: ticket,
      Type: 2,
    })
    return result
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
    const result = await this.wechatGateway.callApi('GrpcAcceptFriend', {
      Content: '',
      Encryptusername: stranger,
      Sence: 3,
      Ticket: ticket,
      Type: 3,
    })
    return result
  }

  /**
   * Search contact
   * @param contactId contact id
   */
  public async GrpcSearchContact (contactId: string) {
    log.silly(PRE, `GrpcSearchContact(${contactId})`)
    let result
    try {
      result = await this.wechatGateway.callApi('GrpcSearchContact', {
        Username: contactId,
      })
      return result
    } catch (e) {
      return null
    }
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
    atUserList?: string[],
  ) {
    log.silly(PRE, `GrpcSendMessage(${contactId}, ${content}, ${atUserList})`)

    let messageSource = ''
    if (atUserList) {
      messageSource = `${atUserList.join(',')}`
    }
    const result = await this.wechatGateway.callApi('GrpcSendMessage', {
      Content: content,
      MsgSource:  messageSource,
      ToUserName: contactId,
    })
    return result
  }

  /**
   * Send image, might be really slow when the picture is huge
   * @param contactId contact id to send image
   * @param data image data
   */
  public async GrpcSendImage (
    contactId: string,
    data: string,
  ) {
    log.silly(PRE, `GrpcSendImage() with total length ${data.length}`)
    const imageId = contactId + new Date().getTime().toString()
    const maxLength = 65535

    // TODO: optimize the logic here to send multiple packages at the same time
    let curPos = 0
    while (curPos < data.length) {
      log.silly(PRE, `GrpcSendImage() send message from pos ${curPos} to ${curPos + maxLength}`)
      const dataBuffer = Buffer.from(data, 'base64')
      const tmp = dataBuffer.slice(curPos, curPos + maxLength)
      const tmpData = tmp.toString('base64')
      try {
        await this.wechatGateway.callApi('GrpcSendImage', {
          ClientImgId: imageId,
          Data: tmpData,
          DataLen: tmp.length,
          StartPos: curPos,
          ToUserName: contactId,
          TotalLen: dataBuffer.length,
        })
      } catch (e) {
        log.verbose(PRE, `GrpcSendImage() failed:\n${e.stack}`)
        throw new Error(`Send image failed.`)
      }

      curPos = curPos + maxLength
    }
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
    format: number,
  ) {
    log.silly(PRE, `GrpcSendVoice(${contactId}, voice, ${voiceLength})`)
    await this.wechatGateway.callApi('GrpcSendVoice', {
      Data: data,
      EndFlag: 1,
      Length: data.length,
      Offset: 0,
      ToUserName: contactId,
      VoiceFormat: format,
      VoiceLength: voiceLength,
    })
  }

  /**
   * Send video message
   * @param contactId contact id
   * @param videoPayload video payload
   */
  public async GrpcSendVideo (
    contactId: string,
    videoPayload: PadproVideoMessagePayload,
  ) {
    log.silly(PRE, `GrpcSendVideo()`)
    await this.wechatGateway.callApi('GrpcSendVideo',  {
      ToUserName: contactId,
      ThumbTotalLen: videoPayload.cdnThumbLength,
      ThumbStartPos: videoPayload.cdnThumbLength,
      VideoTotalLen: videoPayload.length,
      VideoStartPos: videoPayload.length,
      PlayLength: videoPayload.playLength,
      AESKey: videoPayload.aesKey,
      CDNVideoUrl: videoPayload.cdnVideoUrl,
    })
  }

  /**
   * Send app message
   * @param contactId contact id
   * @param content app message xml content
   */
  public async GrpcSendApp (
    contactId: string,
    content: string,
  ) {
    log.silly(PRE, `GrpcSendApp(${contactId})`)
    const result = await this.wechatGateway.callApi('GrpcSendApp', {
      AppId: '',
      Content: content,
      ToUserName: contactId,
      Type: 5,
    })
    return result
  }

  /**
   * Get image from the message
   * @param content message content
   */
  public async GrpcGetMsgImage (
    message: PadproMessagePayload,
    imagePayload: PadproImageMessagePayload,
  ): Promise<string> {
    log.silly(PRE, `GrpcGetMsgImage()`)

    const MsgId = parseInt(message.messageId, 10)
    const imageBufferArray: Buffer[] = []

    let dataLen = 65536
    let startPos = 0
    const totalLength = imagePayload.length!

    while (startPos < totalLength) {
      dataLen = startPos + dataLen > totalLength ? totalLength - startPos : dataLen
      const result: GrpcGetMsgImageType = await this.wechatGateway.callApi('GrpcGetMsgImage', {
        DataLen: dataLen,
        MsgId,
        StartPos: startPos,
        ToUsername: message.toUser,
        TotalLen: totalLength,
      })

      const bufferData = Buffer.from(result.imageData, 'base64')
      imageBufferArray.push(bufferData)
      startPos += bufferData.length
    }
    return Buffer.concat(imageBufferArray).toString('base64')
  }

  /**
   * Get video from the message
   * @param content message content
   * TODO: This feature is not ready yet
   */
  public async GrpcGetMsgVideo (
    content: string,
  ): Promise<any> {
    log.silly(PRE, `GrpcGetMsgVideo(${content})`)
    // await this.wechatGateway.callApi('GrpcGetMsgVideo')
  }

  /**
   * Get voice from the message
   * @param content message content
   */
  public async GrpcGetMsgVoice (
    message: PadproMessagePayload,
    voicePayload: PadproVoiceMessagePayload,
  ): Promise<any> {
    log.silly(PRE, `GrpcGetMsgVoice()`)
    const MsgId = parseInt(message.messageId, 10)
    const voiceBufferArray: Buffer[] = []

    let dataLen = 65536
    let startPos = 0
    const totalLength = voicePayload.length
    const clientMsgId = voicePayload.clientMsgId

    while (startPos < totalLength) {
      dataLen = startPos + dataLen > totalLength ? totalLength - startPos : dataLen
      const result: GrpcGetMsgVoiceType = await this.wechatGateway.callApi('GrpcGetMsgVoice', {
        ClientMsgId: clientMsgId,
        DataLen: dataLen,
        MsgId,
        StartPos: startPos,
      })

      const bufferData = Buffer.from(result.voiceData, 'base64')
      voiceBufferArray.push(bufferData)
      startPos += bufferData.length
    }
    return Buffer.concat(voiceBufferArray).toString('base64')
  }

  /**
   * Share a contact card to another contact
   * @param toId contact id that receive this contact card
   * @param contactId contact that in the contact card
   * @param title the title of the card
   */
  public async GrpcShareCard (
    toId   : string,
    contact: PadproContactPayload,
  ) {
    log.silly(PRE, `GrpcShareCard(${toId}, ${contact.userName})`)
    const content = generateContactXMLMessage(contact)
    await this.wechatGateway.callApi('GrpcShareCard', {
      Content: content,
      MsgSource: '',
      ToUserName: toId,
      Type: PadproMessageType.ShareCard,
    })
  }

  /**
   * Get A8 key
   * @param contactId contact id
   * @param url url
   */
  public async GrpcGetA8Key (
    contactId: string,
    url: string,
  ): Promise<GrpcGetA8KeyType> {
    log.silly(PRE, `GrpcGetA8Key(${contactId}, ${url})`)
    return this.wechatGateway.callApi('GrpcGetA8Key', {
      ProtocolVer: 1,
      ReqUrl: url,
      Scene: GrpcA8KeyScene.ContactOrRoom,
      Username: contactId,
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
    const result: GrpcCreateRoomPayload = await this.wechatGateway.callApi('GrpcCreateRoom', {
      Membernames: contactIdList.join(',')
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
      ChatRoom: roomId,
      Cmdid: 16,
      Username: this.userId || '',
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
    log.silly(PRE, `GrpcAddRoomMember(${roomId}, ${contactId})`)
    let Membernames = ''
    if (typeof contactId === 'string') {
      Membernames = contactId
    } else {
      Membernames = contactId.join(',')
    }

    const result = await this.wechatGateway.callApi('GrpcAddRoomMember', {
      Membernames,
      Roomeid: roomId,
    })
    if (result !== null) {
      throw new Error('Add member to room failed.')
    }
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

  public async GrpcNewInit () {
    log.silly(PRE, `GrpcNewInit()`)
    let result
    try {
      result = this.wechatGateway.callApi('GrpcNewInit')
    } catch (e) {
      log.verbose(PRE, `GrpcNewInit() failed:\n${e.stack}`)
      return null
    }
    return result
  }

  public async GrpcGetLabelList () {
    log.silly(PRE, `GrpcGetLabelList()`)
    return this.wechatGateway.callApi('GrpcGetLabelList')
  }

  public async GrpcAddLabel (
    labelName: string,
  ) {
    log.silly(PRE, `GrpcAddLabel()`)
    return this.wechatGateway.callApi('GrpcAddLabel', {
      LabelName: labelName,
    })
  }

  /**
   * TODO: not working right now, need to fix this
   * @param contactId contact id
   * @param labelIds label ids
   */
  public async GrpcModifyLabelList (
    contactId: string,
    labelIds: number[],
  ) {
    log.silly(PRE, `GrpcModifyLabelList(${contactId}, ${labelIds})`)
    return this.wechatGateway.callApi('GrpcModifyLabelList', {
      Username: contactId,
      Labelids: labelIds.join(','),
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
