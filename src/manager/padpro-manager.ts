import fs     from 'fs-extra'
import os     from 'os'
import path   from 'path'

import { FileBox }            from 'file-box'
import { FlashStoreSync }     from 'flash-store'
import {
  DebounceQueue,
  ThrottleQueue,
}                             from 'rx-queue'
import { Subscription }       from 'rxjs'
import { StateSwitch }        from 'state-switch'

import {
  CheckQRCodeStatus,
  GrpcContactRawPayload,
  GrpcMessagePayload,
  GrpcRoomRawPayload,
  PadproContactPayload,
  PadproContinue,
  PadproMemberBrief,
  PadproMessagePayload,
  PadproMessageType,
  PadproRoomInvitationPayload,
  PadproRoomInviteEvent,
  PadproRoomMemberPayload,
  PadproRoomPayload,
}                             from '../schemas'

import { PadproGrpc } from './padpro-grpc'

import {
  fileBoxToQrcode,
  isContactId,
  isRoomId,
}                   from '../pure-function-helpers'

import { log } from '../config'
import { retry } from '../utils'

import {
  convertContact,
  convertMessage,
  convertRoom,
  convertRoomMember,
} from '../converter'
import { imagePayloadParser } from '../pure-function-helpers/message-image-payload-parser'

export interface ManagerOptions {
  endpoint : string,
  token    : string,
}

const PRE = 'PadproManager'

export class PadproManager extends PadproGrpc {

  private loginScanQrCode? : string
  private loginScanStatus? : number
  private loginScanTimer?  : NodeJS.Timer

  private cacheContactRawPayload?    : FlashStoreSync<string, PadproContactPayload>
  private cacheRoomMemberRawPayload? : FlashStoreSync<string, {
    [contactId: string]: PadproRoomMemberPayload,
  }>
  private cacheRoomRawPayload?       : FlashStoreSync<string, PadproRoomPayload>
  private cacheRoomInvitationRawPayload? : FlashStoreSync<string, PadproRoomInvitationPayload>

  private readonly state                  : StateSwitch

  private debounceQueue?: DebounceQueue
  private debounceQueueSubscription?: Subscription

  private throttleQueue?: ThrottleQueue
  private throttleQueueSubscription?: Subscription

  constructor (
    public options: ManagerOptions,
  ) {
    super(options.token, options.endpoint)
    log.verbose(PRE, 'constructor()')

    this.state = new StateSwitch('PadproManager')

    this.wechatGateway.on('newMessage', () => {
      void this.syncMessage()
    })

    this.wechatGateway.on('rawMessage', () => {
      if (this.debounceQueue && this.throttleQueue) {
        this.debounceQueue.next('rawMessage')
        this.throttleQueue.next('rawMessage')
      }
    })

    this.wechatGateway.on('logout', async () => {
      log.info(PRE, `Logged out on phone or log into another device.`)
      await this.logout()
      this.emit('logout')
    })
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

    this.debounceQueue = new DebounceQueue(20 * 1000)
    this.debounceQueueSubscription = this.debounceQueue.subscribe(() => {
      const heartbeatResult = this.GrpcHeartBeat()
      log.silly(PRE, `debounceQueue heartbeat result: ${JSON.stringify(heartbeatResult)}`)
    })

    this.throttleQueue = new ThrottleQueue(20 * 1000)
    this.throttleQueueSubscription = this.throttleQueue.subscribe(() => {
      log.silly(PRE, `throttleQueue emit heartbeat.`)
      this.emit('heartbeat')
    })
  }

  private async initCache (
    token  : string,
    userId : string,
  ): Promise<void> {
    log.verbose(PRE, 'initCache(%s, %s)', token, userId)

    if (   this.cacheContactRawPayload
        || this.cacheRoomMemberRawPayload
        || this.cacheRoomRawPayload
        || this.cacheRoomInvitationRawPayload
    ) {
      throw new Error('cache exists')
    }

    const baseDir = path.join(
      os.homedir(),
      path.sep,
      '.wechaty',
      'puppet-padpro-cache',
      path.sep,
      token,
      path.sep,
      userId,
    )

    const baseDirExist = await fs.pathExists(baseDir)

    if (!baseDirExist) {
      await fs.mkdirp(baseDir)
    }

    this.cacheContactRawPayload        = new FlashStoreSync(path.join(baseDir, 'contact-raw-payload'))
    this.cacheRoomMemberRawPayload     = new FlashStoreSync(path.join(baseDir, 'room-member-raw-payload'))
    this.cacheRoomRawPayload           = new FlashStoreSync(path.join(baseDir, 'room-raw-payload'))
    this.cacheRoomInvitationRawPayload = new FlashStoreSync(path.join(baseDir, 'room-invitation-raw-payload'))

    await Promise.all([
      this.cacheContactRawPayload.ready(),
      this.cacheRoomMemberRawPayload.ready(),
      this.cacheRoomRawPayload.ready(),
      this.cacheRoomInvitationRawPayload.ready(),
    ])

    const roomMemberTotal = [...this.cacheRoomMemberRawPayload.values()].reduce(
      (acc, cur) => acc + Object.keys(cur).length, 0
    )

    const contactTotal = this.cacheContactRawPayload.size
    const roomTotal = this.cacheRoomRawPayload.size

    log.verbose(PRE, `initCache() inited ${contactTotal} Contacts, ${roomMemberTotal} RoomMembers, ${roomTotal} Rooms, cachedir="${baseDir}"`)
  }

  /**
   * *************************************************************************************************************
   *
   *                Release Section
   *
   * *************************************************************************************************************
   * *************************************************************************************************************
   */

  protected async releaseCache (): Promise<void> {
    log.verbose(PRE, 'releaseCache()')

    if (   this.cacheContactRawPayload
        && this.cacheRoomMemberRawPayload
        && this.cacheRoomRawPayload
        && this.cacheRoomInvitationRawPayload
    ) {
      log.silly(PRE, 'releaseCache() closing caches ...')

      await Promise.all([
        this.cacheContactRawPayload.close(),
        this.cacheRoomMemberRawPayload.close(),
        this.cacheRoomRawPayload.close(),
        this.cacheRoomInvitationRawPayload.close(),
      ])

      this.cacheContactRawPayload    = undefined
      this.cacheRoomMemberRawPayload = undefined
      this.cacheRoomRawPayload       = undefined
      this.cacheRoomInvitationRawPayload = undefined

      log.silly(PRE, 'releaseCache() cache closed.')
    } else {
      log.verbose(PRE, 'releaseCache() cache not exist.')
    }
  }

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
    await super.start()
    this.initQueue()

    log.verbose(PRE, `start()`)

    if (this.userId) {
      throw new Error('userId exist')
    }

    this.state.on('pending')

    // await this.tryAutoLogin()
    const succeed = await this.tryAutoLogin()
    if (!succeed) {
      await this.startCheckScan()
    }

    this.state.on(true)
  }

  public async stop (): Promise<void> {
    log.verbose(PRE, `stop()`)

    this.state.off('pending')

    this.releaseQueue()

    await this.stopCheckScan()
    await super.stop()
    await this.releaseCache()

    this.userId          = undefined
    this.loginScanQrCode = undefined
    this.loginScanStatus = undefined

    this.state.off(true)
  }

  protected async onLogin (userId: string): Promise<void> {
    log.verbose(PRE, `login(%s)`, userId)

    if (this.userId) {
      log.verbose(PRE, `reconnected(${userId})`)
      return
    }
    this.userId = userId

    await this.stopCheckScan()

    /**
     * Init persistence cache
     */
    await this.initCache(this.options.token, this.userId)

    /**
     * Refresh the login-ed user payload
     */
    if (this.cacheContactRawPayload) {
      this.cacheContactRawPayload.delete(this.userId)
      await this.contactRawPayload(this.userId)
    }

    this.emit('login', this.userId)
  }

  public async logout (): Promise<void> {
    log.verbose(PRE, `logout()`)

    if (!this.userId) {
      log.verbose(PRE, 'logout() userId not exist, already logout-ed')
      return
    }

    this.releaseQueue()
    this.userId = undefined
    await this.releaseCache()

    await this.startCheckScan()
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
          if (result.Status === CheckQRCodeStatus.WaitScan) {
            this.emit(
              'scan',
              this.loginScanQrCode,
              this.loginScanStatus,
            )
          }
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
      console.log(e)
      log.warn(PRE, `startCheckScan() checkScanLoop() exception: ${e}`)
      this.reset('startCheckScan() checkScanLoop() exception')
    })

    log.silly(PRE, `startCheckScan() checkScanInternalLoop() set`)
  }

  private async syncMessage () {
    const messages = await this.GrpcSyncMessage()
    if (messages === null) {
      log.verbose(PRE, `syncMessage() got empty response.`)
      return
    }
    log.verbose(PRE, `syncMessage() got ${messages.length} message(s).`)

    messages.forEach(async m => {

      /**
       * SyncMessage might return back contacts or other information
       * Process new synced contact information
       */
      if (m.MsgType === PadproMessageType.Contact) {
        const contactOrRoom = m as GrpcContactRawPayload | GrpcRoomRawPayload
        if (isRoomId(contactOrRoom.UserName)) {
          const room = contactOrRoom as GrpcRoomRawPayload
          if (!this.cacheRoomRawPayload) {
            throw Error(`${PRE} Room cache not initialized when sync message`)
          }
          const savedRoom = this.cacheRoomRawPayload.get(room.UserName)
          const newRoom = convertRoom(room)

          if (!savedRoom || !this.memberIsSame(savedRoom.members, newRoom.members)) {
            await this.syncRoomMember(newRoom.chatroomId)
          }

          this.cacheRoomRawPayload.set(newRoom.chatroomId, newRoom)
        } else {
          const contact = contactOrRoom as GrpcContactRawPayload
          if (!this.cacheContactRawPayload) {
            throw Error(`${PRE} Contact cache not initialized when sync message`)
          }
          this.cacheContactRawPayload.set(contact.UserName, convertContact(contact))
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
      console.log(JSON.stringify(m))
      this.emit('message', convertMessage(m as GrpcMessagePayload))
    })
  }

  /**
   * Get image data in base64 string for a given message
   * @param payload message payload which to retrieve the image data
   */
  public async getMsgImage (payload: PadproMessagePayload): Promise<string> {
    const imagePayload = await imagePayloadParser(payload)
    if (imagePayload === null) {
      log.error(PRE, `Can not parse image message, content: ${payload.content}`)
      return ''
    }

    if (imagePayload.cdnBigImgUrl && imagePayload.hdLength) {
      /**
       * High Definition image message
       * Retrieve image data from server
       */
      const result = await this.GrpcGetMsgImage(payload, imagePayload)
      return result
    } else {
      /**
       * Low Definition image message
       * Use image data stored in data field
       */
      return payload.data || ''
    }
  }

  protected async tryAutoLogin (): Promise<boolean> {
    log.verbose(PRE, `tryAutoLogin()`)

    // TODO: Auto login not working right now, will always fallback to QRCode login right now
    try {
      const username = await this.GrpcAutoLogin()
      await this.onLogin(username)
      return true
    } catch (e) {
      log.verbose(PRE, `tryAutoLogin() failed: ${e}`)
      return false
    }
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
    if (!this.cacheContactRawPayload) {
      throw new Error('cache not initialized')
    }
    const contactIdList = [...this.cacheContactRawPayload.keys()]
    log.silly(PRE, `getContactIdList() = ${contactIdList.length}`)
    return contactIdList
  }

  public getRoomIdList (): string[] {
    log.verbose(PRE, 'getRoomIdList()')
    if (!this.cacheRoomRawPayload) {
      throw new Error('cache not initialized')
    }
    const roomIdList = [...this.cacheRoomRawPayload.keys()]
    log.verbose(PRE, `getRoomIdList() = ${roomIdList.length}`)
    return roomIdList
  }

  public roomMemberRawPayloadDirty (
    roomId: string,
  ): void {
    log.verbose(PRE, `roomMemberRawPayloadDirty(${roomId})`)
    if (!this.cacheRoomMemberRawPayload) {
      throw new Error('cache not initialized')
    }
    this.cacheRoomMemberRawPayload.delete(roomId)
  }

  public async getRoomMemberIdList (
    roomId: string,
    dirty = false,
  ): Promise<string[]> {
    log.verbose(PRE, `getRoomMemberIdList(${roomId})`)
    if (!this.cacheRoomMemberRawPayload) {
      throw new Error('cache not initialized')
    }

    if (dirty) {
      this.roomMemberRawPayloadDirty(roomId)
    }

    const memberRawPayloadDict = this.cacheRoomMemberRawPayload.get(roomId)
                                || await this.syncRoomMember(roomId)

    if (!memberRawPayloadDict) {
      // or return [] ?
      throw new Error(`roomId not found: ${roomId}`)
    }

    const memberIdList = Object.keys(memberRawPayloadDict)

    // console.log('memberRawPayloadDict:', memberRawPayloadDict)
    log.verbose(PRE, `getRoomMemberIdList(${roomId}) length=${memberIdList.length}`)
    return memberIdList
  }

  public roomRawPayloadDirty (
    roomId: string,
  ): void {
    log.verbose(PRE, `roomRawPayloadDirty(${roomId})`)
    if (!this.cacheRoomRawPayload) {
      throw new Error('cache not inited' )
    }
    this.cacheRoomRawPayload.delete(roomId)
  }

  public async roomMemberRawPayload (roomId: string): Promise<{ [contactId: string]: PadproRoomMemberPayload }> {
    log.verbose(PRE, `roomMemberRawPayload(${roomId})`)

    if (!this.cacheRoomMemberRawPayload) {
      throw new Error('cache not inited' )
    }

    const memberRawPayloadDict = this.cacheRoomMemberRawPayload.get(roomId)
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

    for (const memberPayload of memberList) {
      const      contactId  = memberPayload.Username
      memberDict[contactId] = convertRoomMember(memberPayload)
    }

    if (!this.cacheRoomMemberRawPayload) {
      throw new Error('cache not inited' )
    }

    const oldMemberDict = this.cacheRoomMemberRawPayload.get(roomId)
    const newMemberDict = {
      ...oldMemberDict,
      ...memberDict,
    }
    this.cacheRoomMemberRawPayload.set(roomId, newMemberDict)

    return newMemberDict
  }

  public async syncContactsAndRooms (): Promise<void> {
    log.verbose(PRE, `syncContactsAndRooms()`)

    let contactAndRoomIdList: string[] = []
    let contactSeq = 0
    let roomSeq = 0

    let cont = true
    while (cont && this.state.on() && this.userId) {
      log.silly(PRE, `syncContactsAndRooms() fetched ${contactAndRoomIdList.length} ids.`)
      const syncContactPayload = await this.GrpcSyncContact(contactSeq, roomSeq)
      const {
        CurrentWxcontactSeq,
        CurrentChatRoomContactSeq,
        ContinueFlag,
        UsernameLists
      } = syncContactPayload

      contactAndRoomIdList = contactAndRoomIdList.concat(UsernameLists.map(x => x.Username))
      contactSeq = CurrentWxcontactSeq
      roomSeq = CurrentChatRoomContactSeq
      cont = ContinueFlag === PadproContinue.Go

      await new Promise(r => setTimeout(r, 500))
    }

    log.info(PRE, `syncContactAndRooms() got ${contactAndRoomIdList.length} contacts and rooms in total.`)

    if (!this.cacheContactRawPayload || !this.cacheRoomRawPayload || !this.cacheRoomMemberRawPayload) {
      throw new Error('no cache when syncing contacts and rooms')
    }
    const contactIdList = contactAndRoomIdList.filter(id => isContactId(id))
    const roomIdList = contactAndRoomIdList.filter(id => isRoomId(id))

    for (let i = 0; i < contactIdList.length; i += 20) {
      const ids = contactIdList.slice(i, i + 20)
      const rawContactPayloads = await this.GrpcGetContactPayload(ids)

      for (const payload of rawContactPayloads) {
        this.cacheContactRawPayload.set(payload.UserName, convertContact(payload))
      }
      await new Promise(r => setTimeout(r, 500))
    }

    for (let i = 0; i < roomIdList.length; i += 20) {
      const ids = roomIdList.slice(i, i + 20)
      const rawRoomPayloads = await this.GrpcGetRoomPayload(ids)

      for (const payload of rawRoomPayloads) {
        const roomMemberDict = await this.syncRoomMember(payload.UserName)
        if (Object.keys(roomMemberDict).length === 0) {
          log.verbose(PRE, `syncContactsAndRooms() got deleted room: ${payload.UserName}`)
        } else {
          this.cacheRoomRawPayload.set(payload.UserName, convertRoom(payload))
        }
      }
      await new Promise(r => setTimeout(r, 500))
    }

    this.emit('ready')
  }

  public contactRawPayloadDirty (
    contactId: string,
  ): void {
    log.verbose(PRE, `contactRawPayloadDirty(${contactId})`)
    if (!this.cacheContactRawPayload) {
      log.error(PRE, `contactRawPayloadDirty() cache not inited`)
      throw new Error('cache not inited' )
    }
    this.cacheContactRawPayload.delete(contactId)
  }

  public async contactRawPayload (contactId: string): Promise<PadproContactPayload> {
    log.silly(PRE, `contactRawPayload(${contactId})`)

    const rawPayload = await retry(async (retryException, attempt) => {
      log.silly(PRE, `contactRawPayload(${contactId}) retry() attempt=${attempt}`)

      if (!this.cacheContactRawPayload) {
        log.error(PRE, `contactRawPayload() cache not inited`)
        throw new Error('no cache')
      }

      if (this.cacheContactRawPayload.has(contactId)) {
        return this.cacheContactRawPayload.get(contactId)
      }

      const tryRawPayload =  await this.GrpcGetContactPayload(contactId)

      if (tryRawPayload && tryRawPayload.UserName) {
        const payload = convertContact(tryRawPayload)
        this.cacheContactRawPayload.set(contactId, payload)
        return payload
      } else if (tryRawPayload) {
        // If the payload is valid but we don't have UserName inside it,
        // consider this payload as invalid one and do not retry
        // Correct me if I am wrong here
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
    log.verbose(PRE, `roomRawPayload(${id})`)

    const rawPayload = await retry(async (retryException, attempt) => {
      log.silly(PRE, `roomRawPayload(${id}) retry() attempt=${attempt}`)

      if (!this.cacheRoomRawPayload) {
        log.error(PRE, `roomRawPayload() cache not inited.`)
        throw new Error('no cache')
      }

      if (this.cacheRoomRawPayload.has(id)) {
        return this.cacheRoomRawPayload.get(id)
      }

      const tryRawPayload = await this.GrpcGetRoomPayload(id)

      if (tryRawPayload /* && tryRawPayload.user_name */) {
        const payload = convertRoom(tryRawPayload)
        this.cacheRoomRawPayload.set(id, payload)
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
    if (!this.cacheRoomInvitationRawPayload) {
      throw new Error('no cache')
    }

    const payload = await this.cacheRoomInvitationRawPayload.get(roomInvitationId)

    if (payload) {
      return payload
    } else {
      throw new Error(`can not get invitation with invitation id: ${roomInvitationId}`)
    }
  }

  public async roomInvitationRawPayloadDirty (roomInvitationId: string): Promise<void> {
    log.verbose(PRE, `roomInvitationRawPayloadDirty(${roomInvitationId})`)
    if (!this.cacheRoomInvitationRawPayload) {
      throw new Error('no cache')
    }

    await this.cacheRoomInvitationRawPayload.delete(roomInvitationId)
  }

  public async saveRoomInvitationRawPayload (roomInvitation: PadproRoomInviteEvent): Promise<void> {
    log.verbose(PRE, `saveRoomInvitationRawPayload(${JSON.stringify(roomInvitation)})`)
    const { msgId, roomName, url, fromUser, timestamp } = roomInvitation

    if (!this.cacheRoomInvitationRawPayload) {
      throw new Error('no cache')
    }

    this.cacheRoomInvitationRawPayload.set(msgId, {
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
    this.contactRawPayloadDirty(this.userId)
  }

  public async updateSelfSignature (signature: string): Promise<void> {
    if (!this.userId) {
      throw Error('Can not update user self signature since no user id exist. Probably user not logged in yet')
    }
    const self = await this.contactRawPayload(this.userId)
    const { nickName, sex, country, province, city } = self

    await this.GrpcSetUserInfo(nickName, signature, sex.toString(), country, province, city)
    this.contactRawPayloadDirty(this.userId)
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
