import { FileBox }            from 'file-box'
import {
  DebounceQueue,
  DelayQueueExecutor,
  ThrottleQueue,
}                             from 'rx-queue'
import { Subscription }       from 'rxjs'
import { StateSwitch }        from 'state-switch'

import uuid = require('uuid')

import {
  AutoLoginError,
  CheckQRCodeStatus,
  ContactType,
  EncryptionServiceError,
  GrpcContactRawPayload,
  GrpcDeletedPayload,
  GrpcMessagePayload,
  GrpcRoomRawPayload,
  GrpcSelfAvatarPayload,
  GrpcSelfAvatarType,
  GrpcSelfInfoPayload,
  GrpcSyncMessagePayload,
  PadproContactPayload,
  PadproMemberBrief,
  PadproMessagePayload,
  PadproMessageStatus,
  PadproMessageType,
  PadproRoomInvitationPayload,
  PadproRoomInviteEvent,
  PadproRoomMemberPayload,
  PadproRoomPayload,
}                             from '../schemas'

import { PadproGrpc } from './padpro-grpc'

import {
  fileBoxToQrcode,
  isRoomId,
  isStrangerV1,
  voicePayloadParser,
}                   from '../pure-function-helpers'

import {
  log,
  PADPRO_REPLAY_MESSAGE,
  WAIT_FOR_READY_TIME,
} from '../config'
import { retry, updateContact } from '../utils'

import {
  convertContact,
  convertMemberToContact,
  convertMessage,
  convertRoom,
  convertRoomMember,
} from '../converter'
import { CacheManager } from './cache-manager'

export interface ManagerOptions {
  token    : string,
}

const PRE = 'PadproManager'

export class PadproManager extends PadproGrpc {

  private loginScanQrCode? : string
  private loginScanStatus? : number
  private loginScanTimer?  : NodeJS.Timer
  private initDataTimer?   : NodeJS.Timer

  private readonly state                  : StateSwitch

  private debounceQueue?: DebounceQueue
  private debounceQueueSubscription?: Subscription

  private throttleQueue?: ThrottleQueue
  private throttleQueueSubscription?: Subscription

  private syncQueueExecutor: DelayQueueExecutor

  private selfContact: GrpcContactRawPayload

  private messageBuffer: GrpcMessagePayload[]

  private cacheManager?: CacheManager

  private contactAndRoomData?: {
    contactTotal: number,
    friendTotal: number,
    roomTotal: number,
    updatedTime: number,
    readyEmitted: boolean,
  }

  constructor (
    public options: ManagerOptions,
  ) {
    super()
    log.verbose(PRE, 'constructor()')

    this.state = new StateSwitch('PadproManager')

    this.selfContact = this.getEmptySelfContact()

    this.messageBuffer = []

    this.wechatGateway.on('newMessage', () => {
      if (this.userId) {
        void this.syncMessage()
      }
    })

    this.wechatGateway.on('rawMessage', () => {
      if (this.debounceQueue && this.throttleQueue) {
        this.debounceQueue.next('rawMessage')
        this.throttleQueue.next('rawMessage')
      }
    })

    this.wechatGateway.on('reset', async () => {
      log.info(PRE, `Connection has problem, reset self to recover the connection.`)
      this.emit('reset')
    })
    this.syncQueueExecutor = new DelayQueueExecutor(1000)
  }

  /**
   * *************************************************************************************************************
   *
   *                Initialize Section
   *
   * *************************************************************************************************************
   * *************************************************************************************************************
   */

  private initQueue () {

    this.debounceQueue = new DebounceQueue(30 * 1000)
    this.debounceQueueSubscription = this.debounceQueue.subscribe(() => {
      const heartbeatResult = this.GrpcHeartBeat()

      this.setContactAndRoomData()

      log.silly(PRE, `debounceQueue heartbeat result: ${JSON.stringify(heartbeatResult)}`)
    })

    this.throttleQueue = new ThrottleQueue(30 * 1000)
    this.throttleQueueSubscription = this.throttleQueue.subscribe(() => {
      log.silly(PRE, `throttleQueue emit heartbeat.`)
      this.emit('heartbeat')
    })
  }

  private setContactAndRoomData () {
    if (!this.cacheManager) {
      log.warn(PRE, `setContactAndRoomData() can not proceed due to no cache.`)
      return
    }
    const contactTotal = this.cacheManager.getContactCount()
    const roomTotal = this.cacheManager.getRoomCount()
    const friendTotal = this.cacheManager.getAllContacts().filter(contact => {
      isStrangerV1(contact.stranger)
    }).length
    const now = new Date().getTime()
    if (this.contactAndRoomData) {

      if (this.contactAndRoomData.contactTotal === contactTotal
       && this.contactAndRoomData.roomTotal    === roomTotal
       && this.contactAndRoomData.friendTotal  === friendTotal) {
        if (now - this.contactAndRoomData.updatedTime > WAIT_FOR_READY_TIME
          && !this.contactAndRoomData.readyEmitted) {
          log.info(PRE, `setContactAndRoomData() more than ${WAIT_FOR_READY_TIME / 1000 / 60} minutes no change on data, emit ready event.`)
          this.contactAndRoomData.readyEmitted = true
          this.emit('ready')
        }
        log.silly(PRE, `setContactAndRoomData() found contact, room, friend data no change.`)
      } else {
        log.silly(PRE, `setContactAndRoomData() found contact or room or friend change. Record changes...`)
        this.contactAndRoomData.contactTotal = contactTotal
        this.contactAndRoomData.roomTotal    = roomTotal
        this.contactAndRoomData.friendTotal  = friendTotal
        this.contactAndRoomData.updatedTime  = now
      }
    } else {
      log.silly(PRE, `setContactAndRoomData() initialize contact and room data.`)
      this.contactAndRoomData = {
        contactTotal,
        friendTotal,
        readyEmitted: false,
        roomTotal,
        updatedTime: now,
      }
    }
  }

  /**
   * Init data needed for Padpro, includes self contact data, all contact data, all room data and all room member data
   */
  private async initData (): Promise<void> {
    log.silly(PRE, `initData() started`)

    try {
      const result = await this.GrpcNewInit()
      await this.processMessages(result)
    } catch (e) {
      log.warn(`Error happened when calling GrpcNewInit: ${e.stack}`)
    }
    await this.initDataInternalLoop()
  }

  private async initDataInternalLoop (): Promise<void> {
    const data = await this.syncQueueExecutor.execute(() => this.GrpcSyncMessage())
    if (data === null) {
      await new Promise(r => setTimeout(r, 1000))
    } else if (data.length === 0) {
      if (this.state.off()) {
        log.verbose(PRE, `initDataInternalLoop() in off state, skip processing message.`)
        return
      }
      if (!this.cacheManager) {
        throw new Error(`${PRE} initDataInternalLoop() has no cache.`)
      }

      log.info(PRE, `initData() finished with contacts: ${this.cacheManager.getContactCount()}, rooms: ${this.cacheManager.getRoomCount()}`)
      return
    } else {
      await this.processMessages(data)
    }
    this.initDataTimer = setTimeout(async () => {
      this.initDataTimer = undefined
      await this.initDataInternalLoop()
    }, 500)
  }

  private async stopInitData (): Promise<void> {
    log.verbose(PRE, `stopInitData()`)
    if (this.initDataTimer) {
      clearTimeout(this.initDataTimer)
      this.initDataTimer = undefined
    }
  }

  private clearContactAndRoomData () {
    this.contactAndRoomData = undefined
  }

  /**
   * *************************************************************************************************************
   *
   *                Release Section
   *
   * *************************************************************************************************************
   * *************************************************************************************************************
   */

  private releaseQueue (): void {
    if (!this.throttleQueueSubscription ||
        !this.debounceQueueSubscription
    ) {
      log.warn(PRE, `releaseQueue() subscriptions have been released.`)
    } else {
      this.throttleQueueSubscription.unsubscribe()
      this.debounceQueueSubscription.unsubscribe()

      this.throttleQueueSubscription = undefined
      this.debounceQueueSubscription = undefined
    }

    if (!this.debounceQueue || !this.throttleQueue) {
      log.warn(PRE, `releaseQueue() queues have been released.`)
    } else {
      this.debounceQueue.unsubscribe()
      this.throttleQueue.unsubscribe()

      this.debounceQueue = undefined
      this.throttleQueue = undefined
    }
  }

  /**
   * *************************************************************************************************************
   *
   *                Life-cycle Section
   *
   * *************************************************************************************************************
   * *************************************************************************************************************
   */

  public async start (): Promise<void> {
    this.initQueue()

    log.verbose(PRE, `start()`)

    if (this.userId) {
      throw new Error('userId exist')
    }

    this.state.on('pending')

    const username = await this.tryAutoLogin()
    if (username) {
      await this.onLogin(username)
    } else {
      await this.startCheckScan()
    }

    this.state.on(true)
  }

  public async stop (): Promise<void> {
    log.verbose(PRE, `stop()`)

    this.state.off('pending')

    this.releaseQueue()

    this.wechatGateway.removeAllListeners()

    await this.stopCheckScan()
    await this.stopInitData()
    await super.stop()
    await CacheManager.release()

    this.userId          = undefined
    this.loginScanQrCode = undefined
    this.loginScanStatus = undefined
    this.messageBuffer   = []
    this.selfContact     = this.getEmptySelfContact()

    this.clearContactAndRoomData()

    this.state.off(true)
  }

  protected async onLogin (userId: string): Promise<void> {
    log.verbose(PRE, `login(%s)`, userId)

    if (this.userId) {
      log.verbose(PRE, `reconnected(${userId})`)
      return
    }

    await this.stopCheckScan()

    /**
     * Init persistence cache
     */
    await CacheManager.init(this.options.token, userId)
    this.cacheManager = CacheManager.Instance

    await this.initData()
  }

  public async logout (): Promise<void> {
    log.verbose(PRE, `logout()`)

    if (!this.userId) {
      log.verbose(PRE, 'logout() userId not exist, already logout-ed')
      return
    }

    this.releaseQueue()
    this.userId        = undefined
    this.messageBuffer = []
    this.selfContact   = this.getEmptySelfContact()

    await this.stopInitData()
    await CacheManager.release()
    this.cacheManager = undefined
    this.clearContactAndRoomData()
  }

  protected async stopCheckScan (): Promise<void> {
    log.verbose(PRE, `stopCheckScan()`)

    if (this.loginScanTimer) {
      clearTimeout(this.loginScanTimer)
      this.loginScanTimer = undefined
    }
    this.loginScanQrCode = undefined
    this.loginScanStatus = undefined
  }

  protected async startCheckScan (): Promise<void> {
    log.verbose(PRE, `startCheckScan()`)

    if (this.userId) {
      log.warn(PRE, 'startCheckScan() this.userId exist.')
      await this.onLogin(this.userId)
      return
    }

    if (this.loginScanTimer) {
      log.warn(PRE, 'startCheckScan() this.loginScanTimer exist.')
      return
    }

    const checkScanInternalLoop = async () => {
      log.silly(PRE, `startCheckScan() checkScanInternalLoop()`)

      await this.emitLoginQrcode()

      // While we want to Wait user response
      let waitUserResponse = true

      const clearStatus = () => {
        this.loginScanQrCode = undefined
        this.loginScanStatus = undefined
        waitUserResponse = false
      }

      while (waitUserResponse) {
        const result = await this.GrpcCheckQRCode()

        if (this.loginScanStatus !== result.Status && this.loginScanQrCode) {
          this.loginScanStatus = result.Status
          this.emit(
            'scan',
            this.loginScanQrCode,
            this.loginScanStatus,
          )
        }

        if (result.Status === CheckQRCodeStatus.WaitScan && result.ExpiredTime && result.ExpiredTime < 10) {
          // result.ExpiredTime is second, emit new QRCode 10 seconds before the old one expired
          clearStatus()
          break
        }

        switch (result.Status) {
          case CheckQRCodeStatus.WaitScan:
            log.silly(PRE, `checkQrcode: Please scan the Qrcode! Expired in ${result.ExpiredTime}`)
            break

          case CheckQRCodeStatus.WaitConfirm:
            log.silly(PRE, 'checkQrcode: Had scan the Qrcode, but not Login!')
            break

          case CheckQRCodeStatus.Confirmed:
            log.silly(PRE, 'checkQrcode: Trying to login... please wait')

            if (!result.Username || !result.Password) {
              throw Error('PuppetPadproManager, checkQrcode, cannot get username or password here, return!')
            }

            const username = await this.GrpcQRCodeLogin(result.Username, result.Password)

            await this.onLogin(username)
            return

          case CheckQRCodeStatus.Timeout:
            log.silly(PRE, 'checkQrcode: Timeout')
            clearStatus()
            break

          case CheckQRCodeStatus.Cancel:
            log.silly(PRE, 'user cancel')
            clearStatus()
            break

          default:
            log.warn(PRE, `startCheckScan() unknown CheckQRCodeStatus: ${result.Status}`)
            clearStatus()
            break
        }

        await new Promise(r => setTimeout(r, 1000))
      }

      this.loginScanTimer = setTimeout(async () => {
        this.loginScanTimer = undefined
        await checkScanInternalLoop()
      }, 1000)

      return
    }

    checkScanInternalLoop()
    .then(() => {
      log.silly(PRE, `startCheckScan() checkScanInternalLoop() resolved`)
    })
    .catch(e => {
      console.error(e)
      log.warn(PRE, `startCheckScan() checkScanLoop() exception: ${e}`)
      this.reset('startCheckScan() checkScanLoop() exception')
    })

    log.silly(PRE, `startCheckScan() checkScanInternalLoop() set`)
  }

  private async syncMessage () {
    log.silly(PRE, `syncMessage()`)
    const messages = await this.syncQueueExecutor.execute(() => this.GrpcSyncMessage())
    if (messages === null) {
      log.verbose(PRE, `syncMessage() got empty response.`)
      return
    }
    log.verbose(PRE, `syncMessage() got ${messages.length} message(s).`)

    await this.processMessages(messages)
  }

  private async processMessages (
    messages: GrpcSyncMessagePayload[]
  ): Promise<void> {
    messages.forEach(async m => {

      if (this.state.off()) {
        log.verbose(PRE, `processMessages() in off state, skip processing message.`)
        return
      }
      if (!this.cacheManager) {
        throw new Error(`${PRE} processMessages() failed due to no cache manager.`)
      }
      /**
       * SyncMessage might return back contacts or other information
       * Process new synced contact information
       */
      if (m.MsgType === PadproMessageType.Contact) {
        const contactOrRoom = m as GrpcContactRawPayload | GrpcRoomRawPayload
        if (isRoomId(contactOrRoom.UserName)) {
          const room = contactOrRoom as GrpcRoomRawPayload

          if (this.state.off()) {
            log.verbose(PRE, `processMessages() in off state, skip processing message.`)
            return
          }
          const savedRoom = this.cacheManager.getRoom(room.UserName)
          const newRoom = convertRoom(room)
          if (newRoom.memberCount === 0) {
            return
          }
          if (!savedRoom || !this.memberIsSame(savedRoom.members, newRoom.members)) {
            const roomMemberDict = await this.syncRoomMember(newRoom.chatroomId)
            if (Object.keys(roomMemberDict).length === 0) {
              log.verbose(PRE, `syncContactsAndRooms() got deleted room: ${room.UserName}`)
              if (savedRoom) {
                this.roomRawPayloadDirty(room.UserName)
                this.roomMemberRawPayloadDirty(room.UserName)
              }
            } else {
              this.cacheManager.setRoom(room.UserName, convertRoom(room))
            }
          }

          if (this.state.off()) {
            log.verbose(PRE, `processMessages() in off state, skip processing message.`)
            return
          }
          this.cacheManager.setRoom(newRoom.chatroomId, newRoom)
        } else {
          if (this.state.off()) {
            log.verbose(PRE, `processMessages() in off state, skip processing message.`)
            return
          }
          const contact = contactOrRoom as GrpcContactRawPayload
          this.cacheManager.setContact(contact.UserName, convertContact(contact))
        }

        return
      }

      if (m.MsgType === PadproMessageType.Deleted) {
        const payload = m as GrpcDeletedPayload
        const contactOrRoomId = payload.Username
        if (isRoomId(contactOrRoomId)) {
          CacheManager.Instance.deleteRoom(contactOrRoomId)
          CacheManager.Instance.deleteRoomMember(contactOrRoomId)
        } else {
          CacheManager.Instance.deleteContact(contactOrRoomId)
        }
        return
      }

      if (m.MsgType === PadproMessageType.SelfInfo) {
        const payload = m as GrpcSelfInfoPayload

        this.selfContact.Alias = payload.Alias
        this.selfContact.City = payload.City
        this.selfContact.NickName = payload.NickName
        this.selfContact.Province = payload.Province
        this.selfContact.Sex = payload.Sex
        this.selfContact.Signature = payload.Signature
        this.selfContact.UserName = payload.UserName
        this.tryEmitLogin()
        return
      }

      if (m.MsgType === PadproMessageType.SelfAvatar) {
        const payload = m as GrpcSelfAvatarPayload
        if (payload.ImgType === GrpcSelfAvatarType.CURRENT) {
          /**
           * Bug data below, small head url actually contains big head url
           * So reverse the data below
           */
          this.selfContact.BigHeadImgUrl = payload.SmallHeadImgUrl
          this.selfContact.SmallHeadImgUrl = payload.BigHeadImgUrl
          this.tryEmitLogin()
        }
        return
      }

      /**
       * Filter out messages without message id, which means that is not a new message
       */
      const tmp = m as GrpcMessagePayload
      if (!tmp.MsgId) {
        log.verbose(PRE, `Ignore messages without message id. Ignored message type: 【${m.MsgType}】`)
        return
      }

      /**
       * Message emit here should all be valid message
       */
      // console.log(JSON.stringify(m))
      if (!this.userId) {
        this.messageBuffer.push(m as GrpcMessagePayload)
      } else {
        this.emit('message', convertMessage(m as GrpcMessagePayload))
      }
    })
  }

  private tryEmitLogin () {
    if (this.selfContact.UserName !== ''
      && this.selfContact.BigHeadImgUrl !== 'null'
      && this.selfContact.SmallHeadImgUrl !== 'null'
      && !this.userId) {

      if (!this.cacheManager) {
        throw Error(`${PRE} tryEmitLogin() has no contact cache.`)
      }
      this.cacheManager.setContact(this.selfContact.UserName, convertContact(this.selfContact))
      this.userId = this.selfContact.UserName
      this.emit('login', this.selfContact.UserName)
      this.releaseBufferedMessage()
    }
  }

  private releaseBufferedMessage () {
    while (this.messageBuffer.length > 0) {
      const message = this.messageBuffer.shift()
      this.emit('message', convertMessage(message!))
    }
  }

  /**
   * Return an empty contact which can be used as the self contact
   * Fix issue when avatar is empty, initialize the head img url as a string 'null'
   */
  private getEmptySelfContact () {
    return {
      Alias          : '',
      BigHeadImgUrl  : 'null',
      City           : '',
      ContactType    : ContactType.Personal,
      EncryptUsername: '',
      LabelLists     : '',
      MsgType        : PadproMessageType.Contact,
      NickName       : '',
      Province       : '',
      Remark         : '',
      Sex            : 0,
      Signature      : '',
      SmallHeadImgUrl: 'null',
      Ticket         : '',
      UserName       : '',
      VerifyFlag     : 0,
    }
  }

  /**
   * Get voice data in base64 string for a given message
   * @param payload message payload which to retrieve the voice data
   */
  public async getMsgVoice (payload: PadproMessagePayload): Promise<string> {
    const voicePayload = await voicePayloadParser(payload)
    if (voicePayload === null) {
      log.error(PRE, `Can not parse voice message, content: ${payload.content}`)
      return ''
    }

    const result = await this.GrpcGetMsgVoice(payload, voicePayload)

    return result
  }

  protected async tryAutoLogin (): Promise<string | undefined> {
    log.verbose(PRE, `tryAutoLogin()`)

    try {
      const result = await this.GrpcAutoLogin()
      return result
    } catch (e) {
      switch (e.message) {
        case AutoLoginError.UNKNOWN_STATUS:
          log.warn(PRE, `tryAutoLogin receive unknown api call status, if you keep seeing this status, please file an issue with detailed log to us, we will fix it ASAP.`)
          break
        case AutoLoginError.CALL_FAILED:
          await new Promise(r => setTimeout(r, 5000))
          return this.tryAutoLogin()
        case AutoLoginError.USER_LOGOUT:
          // Stop auto login since user has logged out
          break
        case EncryptionServiceError.NO_SESSION:
          // Stop auto login since this is the first time login
          break

        default:
          // Some other errors related to connection, retry the login
          await new Promise(r => setTimeout(r, 5000))
          return this.tryAutoLogin()
      }
      log.verbose(PRE, `tryAutoLogin() failed: ${e}`)
    }
    return undefined
  }

  protected async emitLoginQrcode (): Promise<void> {
    log.verbose(PRE, `emitLoginQrCode()`)

    if (this.loginScanQrCode) {
      throw new Error('qrcode exist')
    }

    const result = await this.GrpcGetQRCode()

    const fileBox = FileBox.fromBase64(result.qrCode, 'qrcode.jpg')
    const qrcodeDecoded = await fileBoxToQrcode(fileBox)

    this.loginScanQrCode = qrcodeDecoded
    this.loginScanStatus = CheckQRCodeStatus.WaitScan

    this.emit(
      'scan',
      this.loginScanQrCode,
      this.loginScanStatus,
    )
  }

  public getContactIdList (): string[] {
    log.verbose(PRE, 'getContactIdList()')
    if (!this.cacheManager) {
      throw new Error(`${PRE} getContactIdList() cache not initialized`)
    }
    const contactIdList = this.cacheManager.getContactIds()
    log.silly(PRE, `getContactIdList() = ${contactIdList.length}`)
    return contactIdList
  }

  public getRoomIdList (): string[] {
    log.verbose(PRE, 'getRoomIdList()')
    if (!this.cacheManager) {
      throw new Error('cache not initialized')
    }
    const roomIdList = this.cacheManager.getRoomIds()
    log.verbose(PRE, `getRoomIdList() = ${roomIdList.length}`)
    return roomIdList
  }

  public roomMemberRawPayloadDirty (
    roomId: string,
  ): void {
    log.verbose(PRE, `roomMemberRawPayloadDirty(${roomId})`)
    if (this.state.off()) {
      log.verbose(PRE, `roomMemberRawPayloadDirty() in off state, skip processing message.`)
      return
    }
    if (!this.cacheManager) {
      throw new Error('cache not initialized')
    }
    this.cacheManager.deleteRoomMember(roomId)
  }

  public async getRoomMemberIdList (
    roomId: string,
    dirty = false,
  ): Promise<string[]> {
    log.verbose(PRE, `getRoomMemberIdList(${roomId})`)
    if (!this.cacheManager) {
      throw new Error(`${PRE} getRoomMemberIdList() cache not initialized.`)
    }

    if (dirty) {
      this.roomMemberRawPayloadDirty(roomId)
    }

    const memberRawPayloadDict = this.cacheManager.getRoomMember(roomId)
                                || await this.syncRoomMember(roomId)

    if (!memberRawPayloadDict) {
      throw new Error(`roomId not found: ${roomId}`)
    }

    const memberIdList = Object.keys(memberRawPayloadDict)

    log.verbose(PRE, `getRoomMemberIdList(${roomId}) length=${memberIdList.length}`)
    return memberIdList
  }

  public roomRawPayloadDirty (
    roomId: string,
  ): void {
    log.verbose(PRE, `roomRawPayloadDirty(${roomId})`)
    if (this.state.off()) {
      log.verbose(PRE, `roomRawPayloadDirty() in off state, skip processing message.`)
      return
    }
    if (!this.cacheManager) {
      throw new Error('cache not inited' )
    }
    this.cacheManager.deleteRoom(roomId)
  }

  public async roomMemberRawPayload (roomId: string): Promise<{ [contactId: string]: PadproRoomMemberPayload }> {
    log.verbose(PRE, `roomMemberRawPayload(${roomId})`)

    if (!this.cacheManager) {
      throw new Error(`${PRE} roomMemberRawPayload() cache not inited.`)
    }

    const memberRawPayloadDict = this.cacheManager.getRoomMember(roomId)
                                || await this.syncRoomMember(roomId)

    if (!memberRawPayloadDict) {
      throw new Error(`roomId not found: ${roomId}`)
    }

    return memberRawPayloadDict
  }

  public async syncRoomMember (
    roomId: string,
  ): Promise<{ [contactId: string]: PadproRoomMemberPayload }> {
    log.silly(PRE, `syncRoomMember(${roomId})`)

    const memberRawPayload = await this.GrpcGetChatRoomMember(roomId)

    if (!memberRawPayload || !('ChatroomUsername' in memberRawPayload)) {
      this.roomMemberRawPayloadDirty(roomId)
      this.roomRawPayloadDirty(roomId)

      return {}
    }

    const memberList = memberRawPayload.MemberDetails

    if (memberList === null) {
      log.verbose(PRE, `syncRoomMember(${roomId}) got empty member list, should be a deleted room`)
      return {}
    }

    log.silly(PRE, `syncRoomMember(${roomId}) total ${memberList.length} members`)

    const memberDict: { [contactId: string]: PadproRoomMemberPayload } = {}

    if (this.state.off()) {
      log.verbose(PRE, `syncRoomMember() in off state, skip processing message.`)
      return {}
    }
    if (!this.cacheManager) {
      throw new Error('contact cache not inited when sync room member')
    }
    for (const memberPayload of memberList) {
      const contactId  = memberPayload.Username
      const contact = convertMemberToContact(memberPayload)
      if (!this.cacheManager.hasContact(contactId)) {
        this.cacheManager.setContact(contactId, contact)
      }
      memberDict[contactId] = convertRoomMember(memberPayload)
    }

    const oldMemberDict = this.cacheManager.getRoomMember(roomId)
    const newMemberDict = {
      ...oldMemberDict,
      ...memberDict,
    }
    this.cacheManager.setRoomMember(roomId, newMemberDict)

    return newMemberDict
  }

  /**
   * Treat the payload dirty as a force refresh data to avoid lose weixin from contact
   * @param contactId contact id
   */
  public async contactRawPayloadDirty (
    contactId: string,
    forceCall?: boolean,
  ): Promise<void> {
    log.verbose(PRE, `contactRawPayloadDirty(${contactId})`)
    if (!this.cacheManager) {
      throw new Error('cache not inited' )
    }
    const previous = this.cacheManager.getContact(contactId)
    if (!previous) {
      log.verbose(PRE, `contactRawPayloadDirty() trying to dirty a contact that does not exist in cache.`)
      return
    }
    const current = await this.GrpcGetContactPayload(contactId, forceCall)
    if (current === null) {
      log.verbose(PRE, `contactRawPayloadDirty() found invalid contact, remove it from cache.`)
      this.cacheManager.deleteContact(contactId)
    } else {
      const updatedContact = updateContact(previous, current)
      this.cacheManager.setContact(contactId, updatedContact)
    }
  }

  public async contactRawPayload (contactId: string): Promise<PadproContactPayload> {

    const rawPayload = await retry(async (retryException) => {

      if (!this.cacheManager) {
        throw new Error('no cache')
      }

      if (this.cacheManager.hasContact(contactId)) {
        return this.cacheManager.getContact(contactId)
      }

      const tryRawPayload =  await this.GrpcGetContactPayload(contactId)

      if (tryRawPayload && tryRawPayload.UserName) {
        const payload = convertContact(tryRawPayload)
        this.cacheManager.setContact(contactId, payload)
        return payload
      } else if (tryRawPayload) {
        // If the payload is valid but we don't have UserName inside it,
        // consider this payload as invalid one and do not retry
        return null
      }
      return retryException(new Error('tryRawPayload empty'))
    })

    if (!rawPayload) {
      throw new Error('no raw payload')
    }
    return rawPayload
  }

  public async roomRawPayload (id: string): Promise<PadproRoomPayload> {

    const rawPayload = await retry(async (retryException, attempt) => {
      log.silly(PRE, `roomRawPayload(${id}) retry() attempt=${attempt}`)

      if (!this.cacheManager) {
        throw new Error('no cache')
      }

      if (this.cacheManager.hasRoom(id)) {
        return this.cacheManager.getRoom(id)
      }

      const tryRawPayload = await this.GrpcGetRoomPayload(id)

      if (tryRawPayload /* && tryRawPayload.user_name */) {
        const payload = convertRoom(tryRawPayload)
        this.cacheManager.setRoom(id, payload)
        return payload
      }
      return retryException(new Error('tryRawPayload empty'))
    })

    if (!rawPayload) {
      throw new Error('no raw payload')
    }
    return rawPayload
  }

  public async roomInvitationRawPayload (roomInvitationId: string): Promise<PadproRoomInvitationPayload> {
    log.verbose(PRE, `roomInvitationRawPayload(${roomInvitationId})`)
    if (!this.cacheManager) {
      throw new Error('no cache')
    }

    const payload = await this.cacheManager.getRoomInvitation(roomInvitationId)

    if (payload) {
      return payload
    } else {
      throw new Error(`can not get invitation with invitation id: ${roomInvitationId}`)
    }
  }

  public async roomInvitationRawPayloadDirty (roomInvitationId: string): Promise<void> {
    log.verbose(PRE, `roomInvitationRawPayloadDirty(${roomInvitationId})`)
    if (!this.cacheManager) {
      throw new Error('no cache')
    }

    await this.cacheManager.deleteRoomInvitation(roomInvitationId)
  }

  public async saveRoomInvitationRawPayload (roomInvitation: PadproRoomInviteEvent): Promise<void> {
    log.verbose(PRE, `saveRoomInvitationRawPayload(${JSON.stringify(roomInvitation)})`)
    const { msgId, roomName, url, fromUser, timestamp } = roomInvitation

    if (!this.cacheManager) {
      throw new Error(`${PRE} saveRoomInvitationRawPayload() has no cache.`)
    }
    this.cacheManager.setRoomInvitation(msgId, {
      fromUser,
      id: msgId,
      roomName,
      timestamp,
      url,
    })
  }

  public ding (data?: string): void {
    log.verbose(PRE, `ding(${data || ''})`)
    if (this.wechatGateway.isAlive()) {
      this.emit('dong')
    }
  }

  public async updateSelfName (newName: string): Promise<void> {
    if (!this.userId) {
      throw Error('Can not update user self name since no user id exist. Probably user not logged in yet')
    }
    const self = await this.contactRawPayload(this.userId)
    const { signature, sex, country, province, city } = self

    await this.GrpcSetUserInfo(newName, signature, sex.toString(), country, province, city)
    await this.contactRawPayloadDirty(this.userId)
  }

  public async updateSelfSignature (signature: string): Promise<void> {
    if (!this.userId) {
      throw Error('Can not update user self signature since no user id exist. Probably user not logged in yet')
    }
    const self = await this.contactRawPayload(this.userId)
    const { nickName, sex, country, province, city } = self

    await this.GrpcSetUserInfo(nickName, signature, sex.toString(), country, province, city)
    await this.contactRawPayloadDirty(this.userId)
  }

  public async shareContactCard (
    toId     : string,
    contactId: string,
  ): Promise<void> {
    let contactRawPayload: PadproContactPayload
    try {
      contactRawPayload = await this.contactRawPayload(contactId)
    } catch (e) {
      throw new Error(`NOT_FOUND, Can not find contact with contact id ${contactId}.`)
    }

    if (contactRawPayload.ticket) {
      throw new Error(`NOT_FRIEND, contact id ${contactId} is not friend of bot.`)
    }

    await this.GrpcShareCard(toId, contactRawPayload)
  }

  public async GrpcSendMessage (
    contactId: string,
    content: string,
    atUserList?: string[],
  ) {
    const result = await super.GrpcSendMessage(contactId, content, atUserList)
    if (PADPRO_REPLAY_MESSAGE) {
      this.replayTextMsg(contactId, content)
    }
    return result
  }

  public async GrpcSendImage (
    contactId: string,
    data: string,
  ) {
    await super.GrpcSendImage(contactId, data)
    if (PADPRO_REPLAY_MESSAGE) {
      this.replayImageMsg(contactId, data)
    }
  }

  public async GrpcSendApp (
    contactId: string,
    content: string,
  ) {
    await super.GrpcSendApp(contactId, content)
    if (PADPRO_REPLAY_MESSAGE) {
      this.replayAppMsg(contactId, content)
    }
  }
  private replayTextMsg (to: string, text: string, atUserList?: string[]): void {
    const payload = this.generateBaseMsg(to)
    payload.messageType = PadproMessageType.Text
    payload.content = text
    if (atUserList) {
      payload.messageSource = `<msgsource>\n\t<atuserlist>${atUserList.join(',')}</atuserlist>\n</msgsource>\n`
    }
    log.silly(PRE, 'replayTextMsg replaying message: %s', JSON.stringify(payload))
    this.emit('message', payload)
  }

  private replayImageMsg (to: string, data: string): void {
    const payload = this.generateBaseMsg(to)
    payload.messageType = PadproMessageType.Image
    payload.data = data
    log.silly(PRE, 'replayImageMsg replaying message: %s', JSON.stringify(payload))
    this.emit('message', payload)
  }

  private replayAppMsg (to: string, content: string): void {
    const payload = this.generateBaseMsg(to)
    payload.messageType = PadproMessageType.App
    payload.content = `<msg>${content}</msg>`
    log.silly(PRE, 'replayAppMsg replaying message: %s', JSON.stringify(payload))
    this.emit('message', payload)
  }

  private generateBaseMsg (to: string): PadproMessagePayload {
    const msg: PadproMessagePayload = {
      content: '',
      fromUser: this.userId!,
      messageId: uuid.v4(),
      messageSource: '',
      messageType: PadproMessageType.Text,
      status: PadproMessageStatus.One,
      timestamp: new Date().getTime() / 1000,
      toUser: to,
    }
    log.silly(PRE, 'generateBaseMsg(%s) %s', to, JSON.stringify(msg))
    return msg
  }

  private memberIsSame (memberA: PadproMemberBrief[], memberB: PadproMemberBrief[]): boolean {
    const hashMemberA: { [id: string]: string } = {}
    memberA.forEach(m => { hashMemberA[m.userName] = m.nickName || '' })
    return memberB.map(m => {
      const nickName = hashMemberA[m.userName]
      return nickName === '' || (nickName && m.nickName === nickName)
    }).filter(x => !x).length > 0
  }

}

export default PadproManager
