/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License")
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */

import flatten  from 'array-flatten'
import LRU      from 'lru-cache'
import path     from 'path'

import { FileBox }    from 'file-box'

import {
  ContactGender,
  ContactPayload,
  ContactType,

  FriendshipPayload,

  MessagePayload,
  MessageType,

  Puppet,
  PuppetOptions,

  Receiver,

  RoomInvitationPayload,
  RoomMemberPayload,
  RoomPayload,

  UrlLinkPayload,
}                                 from 'wechaty-puppet'

import {
  appMessageParser,
  contactRawPayloadParser,

  emojiPayloadParser,

  fileBoxToQrcode,

  friendshipConfirmEventMessageParser,
  friendshipRawPayloadParser,
  friendshipReceiveEventMessageParser,
  friendshipVerifyEventMessageParser,

  generateAppXMLMessage,
  generateAttachmentXMLMessageFromRaw,

  imagePayloadParser,

  isStrangerV1,
  isStrangerV2,

  messageRawPayloadParser,
  roomInviteEventMessageParser,
  roomJoinEventMessageParser,
  roomLeaveEventMessageParser,
  roomRawPayloadParser,
  roomTopicEventMessageParser,

  videoPayloadParser,
  voicePayloadParser,
}                                         from './pure-function-helpers'

import {
  log,
  MESSAGE_CACHE_AGE,
  MESSAGE_CACHE_MAX,
  PUPPET_PADPRO_TIMEOUT,
  SELF_QRCODE_MAX_RETRY,
  VERSION,
  WECHATY_PUPPET_PADPRO_ENDPOINT,
}                   from './config'

import {
  padproToken,
  qrCodeForChatie,
  retry,
}                   from './utils'

import { PadproManager } from './manager/padpro-manager'

import {
  CDNFileType,
  FriendshipPayloadReceive,
  GrpcContactRawPayload,
  GrpcVoiceFormat,
  PadproContactPayload,
  PadproMessagePayload,
  PadproMessageType,
  PadproRoomInvitationPayload,
  PadproRoomMemberPayload,
  PadproRoomPayload,
  SearchContactTypeStatus,
}                           from './schemas'

import { WechatGateway } from './gateway/wechat-gateway'
import { CDNManager } from './manager/cdn-manager'

let PADPRO_COUNTER = 0 // PuppetPadpro Instance Counter

const PRE = 'PuppetPadpro'

// Comment for now, since sending voice with mp3/wav has some blocker.
// const getWavInfoFromBuffer = promisify(wavFileInfo.infoByBuffer)

export class PuppetPadpro extends Puppet {
  public static readonly VERSION = VERSION

  private padproCounter: number
  private readonly cachePadproMessagePayload: LRU.Cache<string, PadproMessagePayload>

  private padproManager?: PadproManager
  private cdnManager?   : CDNManager

  constructor (
    public options: PuppetOptions = {},
  ) {
    super({
      timeout: PUPPET_PADPRO_TIMEOUT,  // Default set timeout to 4 minutes for PuppetPadpro
      ...options,
    })

    const lruOptions: LRU.Options = {
      max: MESSAGE_CACHE_MAX,
      dispose (key: string, val: any) {
        log.silly(PRE, `constructor() lruOptions.dispose(${key}, ${JSON.stringify(val)})`)
      },
      maxAge: MESSAGE_CACHE_AGE,
    }

    this.cachePadproMessagePayload = new LRU<string, PadproMessagePayload>(lruOptions)

    this.padproCounter = PADPRO_COUNTER++

    if (this.padproCounter > 0 && !this.options.token) {
      throw new Error([
        'You need to specify `token` when constructor PuppetPadpro because you have more than one instance. ',
        'see: https://github.com/Chatie/wechaty/issues/1367',
      ].join('\n'))
    }
  }

  public toString () {
    const text = super.toString()
    return text + `/PuppetPadpro#${this.padproCounter}`
  }

  public ding (data?: string): void {
    log.verbose(PRE, 'ding(%s)', data || '')

    if (!this.padproManager) {
      this.emit('error', new Error('no padpro Manager'))
      return
    }
    this.padproManager.ding(data)
    return
  }

  public startWatchdog (): void {
    log.verbose(PRE, 'startWatchdog()')

    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    /**
     * Use manager's heartbeat to feed dog
     */
    this.padproManager.on('heartbeat', (data: string) => {
      log.silly(PRE, 'startWatchdog() padproManager.on(heartbeat)')
      this.emit('watchdog', {
        data,
      })
    })

    this.emit('watchdog', {
      data: 'inited',
      type: 'startWatchdog()',
    })

  }

  public async start (): Promise<void> {
    log.verbose(PRE, `start() with ${this.memory.name}`)

    if (this.state.on()) {
      log.warn(PRE, 'start() already on(pending)?')
      await this.state.ready('on')
      return
    }

    /**
     * state has two main state: ON / OFF
     * ON (pending)
     * OFF (pending)
     */
    this.state.on('pending')

    await WechatGateway.init(
      this.options.token     || padproToken(),
      this.options.endpoint  || WECHATY_PUPPET_PADPRO_ENDPOINT,
    )

    const manager = this.padproManager = new PadproManager({
      token    : this.options.token     || padproToken(),
    })

    await this.startManager(manager)
    await this.startWatchdog()

    this.state.on(true)
  }

  protected async login (selfId: string): Promise<void> {
    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    this.cdnManager = new CDNManager()

    await super.login(selfId)
  }

  public async startManager (manager: PadproManager): Promise<void> {
    log.verbose(PRE, 'startManager()')

    if (this.state.off()) {
      throw new Error('startManager() state is off')
    }

    manager.removeAllListeners()
    manager.on('error',   e                                               => this.emit('error', e))
    manager.on('scan',    (qrcode: string, status: number, data?: string) => this.emit('scan', qrcode, status, data))
    manager.on('login',   (userId: string)                                => this.login(userId))
    manager.on('message', (rawPayload: PadproMessagePayload)              => this.onPadproMessage(rawPayload))
    manager.on('logout',  ()                                              => this.logout(true))
    manager.on('dong',    (data)                                          => this.emit('dong', data))
    manager.on('ready',   ()                                              => this.emit('ready'))

    manager.on('reset', async reason => {
      log.warn(PRE, 'startManager() manager.on(reset) for %s. Restarting PuppetPadpro ... ', reason)
      // Puppet Base class will deal with this RESET event for you.
      await this.emit('reset', reason)
    })

    await manager.start()
  }

  protected async onPadproMessage (rawPayload: PadproMessagePayload): Promise<void> {
    const messageType = rawPayload.messageType
    const messageId = rawPayload.messageId

    log.verbose(PRE, `onPadproMessage({id=${messageId}, type=${PadproMessageType[messageType]}(${messageType})})`)
    /**
     * 0. Discard messages when not logged in
     */
    if (!this.id) {
      log.warn(PRE, 'onPadproMessage(%s) discarded message because puppet is not logged-in', JSON.stringify(rawPayload))
      return
    }

    /**
     * 1. Sometimes will get duplicated same messages from rpc, drop the same message from here.
     */
    if (this.cachePadproMessagePayload.has(messageId)) {
      log.silly(PRE, `onPadproMessage(${messageId}) duplicate message: %s`)
      return
    }

    /**
     * 2. Save message for future usage
     */
    this.cachePadproMessagePayload.set(messageId, rawPayload)

    /**
     * 3. Check for Different Message Types
     */
    switch (messageType) {

      case PadproMessageType.VerifyMsg:
        this.emit('friendship', messageId)
        break

      case PadproMessageType.Recalled:
        /**
         * When someone joined the room invited by Bot,
         * the bot will receive a `recall-able` message for room event
         *
         * { content: '12740017638@chatroom:\n<sysmsg type="delchatroommember">\n\t<delchatroommember>\n\t\t<plain>
         *            <![CDATA[You invited 卓桓、Zhuohuan, 太阁_传话助手, 桔小秘 to the group chat.   ]]></plain>...,
         *  sub_type: 10002}
         */
        await Promise.all([
          this.onPadproMessageRoomEventJoin(rawPayload),
        ])
        break

      case PadproMessageType.Sys:
        await Promise.all([
          this.onPadproMessageFriendshipEvent(rawPayload),
          ////////////////////////////////////////////////
          this.onPadproMessageRoomEventJoin(rawPayload),
          this.onPadproMessageRoomEventLeave(rawPayload),
          this.onPadproMessageRoomEventTopic(rawPayload),
        ])
        break

      case PadproMessageType.App:
        await Promise.all([
          this.onPadproMessageRoomInvitation(rawPayload),
        ])
        break

      case PadproMessageType.StatusNotify:
        log.verbose(PRE, `onPadproMessage() status notify message`)
        break

      case PadproMessageType.Emoticon:
      case PadproMessageType.Image:
      case PadproMessageType.MicroVideo:
      case PadproMessageType.Video:

      default:
        this.emit('message', messageId)
        break
    }
  }

  protected async onPadproMessageRoomInvitation (rawPayload: PadproMessagePayload): Promise<void> {
    log.verbose(PRE, 'onPadproMessageRoomInvitation(%s)', rawPayload)
    const roomInviteEvent = await roomInviteEventMessageParser(rawPayload)

    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    if (roomInviteEvent) {
      await this.padproManager.saveRoomInvitationRawPayload(roomInviteEvent)

      this.emit('room-invite', roomInviteEvent.msgId)
    } else {
      this.emit('message', rawPayload.messageId)
    }
  }

  /**
   * Look for room join event
   */
  protected async onPadproMessageRoomEventJoin (rawPayload: PadproMessagePayload): Promise<void> {
    log.verbose(PRE, 'onPadproMessageRoomEventJoin({id=%s})', rawPayload.messageId)

    const roomJoinEvent = await roomJoinEventMessageParser(rawPayload)

    if (roomJoinEvent) {
      const inviteeNameList = roomJoinEvent.inviteeNameList
      const inviterName     = roomJoinEvent.inviterName
      const roomId          = roomJoinEvent.roomId
      log.silly(PRE, 'onPadproMessageRoomEventJoin() roomJoinEvent="%s"', JSON.stringify(roomJoinEvent))

      const inviteeIdList = await retry(async (retryException, attempt) => {
        log.verbose(PRE, 'onPadproMessageRoomEvent({id=%s}) roomJoin retry(attempt=%d)', attempt)

        const tryIdList = flatten<string>(
          await Promise.all(
            inviteeNameList.map(
              inviteeName => this.roomMemberSearch(roomId, inviteeName),
            ),
          ),
        )

        if (tryIdList.length) {
          return tryIdList
        }

        if (!this.padproManager) {
          throw new Error('no manager')
        }

        /**
         * Set Cache Dirty
         */
        await this.roomMemberPayloadDirty(roomId)

        return retryException(new Error('roomMemberSearch() not found'))

      }).catch(e => {
        log.warn(PRE, 'onPadproMessageRoomEvent({id=%s}) roomJoin retry() fail: %s', e.message)
        return [] as string[]
      })

      const inviterIdList = await this.roomMemberSearch(roomId, inviterName)

      if (inviterIdList.length < 1) {
        throw new Error('no inviterId found')
      } else if (inviterIdList.length > 1) {
        log.warn(PRE, 'onPadproMessageRoomEvent() case PadproMesssageSys: inviterId found more than 1, use the first one.')
      }

      const inviterId = inviterIdList[0]

      /**
       * Set Cache Dirty
       */
      await this.roomMemberPayloadDirty(roomId)
      await this.roomPayloadDirty(roomId)

      this.emit('room-join', roomId, inviteeIdList,  inviterId)
    }
  }

  /**
   * Look for room leave event
   */
  protected async onPadproMessageRoomEventLeave (rawPayload: PadproMessagePayload): Promise<void> {
    log.verbose(PRE, 'onPadproMessageRoomEventLeave({id=%s})', rawPayload.messageId)

    const roomLeaveEvent = roomLeaveEventMessageParser(rawPayload)

    if (roomLeaveEvent) {
      const leaverNameList = roomLeaveEvent.leaverNameList
      const removerName    = roomLeaveEvent.removerName
      const roomId         = roomLeaveEvent.roomId
      log.silly(PRE, 'onPadproMessageRoomEventLeave() roomLeaveEvent="%s"', JSON.stringify(roomLeaveEvent))

      const leaverIdList = flatten<string>(
        await Promise.all(
          leaverNameList.map(
            leaverName => this.roomMemberSearch(roomId, leaverName),
          ),
        ),
      )
      const removerIdList = await this.roomMemberSearch(roomId, removerName)
      if (removerIdList.length < 1) {
        throw new Error('no removerId found')
      } else if (removerIdList.length > 1) {
        log.warn(PRE, 'onPadproMessage() case PadproMesssageSys: removerId found more than 1, use the first one.')
      }
      const removerId = removerIdList[0]

      if (!this.padproManager) {
        throw new Error('no padproManager')
      }

      /**
       * Set Cache Dirty
       */
      await this.roomMemberPayloadDirty(roomId)
      await this.roomPayloadDirty(roomId)

      this.emit('room-leave',  roomId, leaverIdList, removerId)
    }
  }

  /**
   * Look for room topic event
   */
  protected async onPadproMessageRoomEventTopic (rawPayload: PadproMessagePayload): Promise<void> {
    log.verbose(PRE, 'onPadproMessageRoomEventTopic({id=%s})', rawPayload.messageId)

    const roomTopicEvent = roomTopicEventMessageParser(rawPayload)

    if (roomTopicEvent) {
      const changerName = roomTopicEvent.changerName
      const newTopic    = roomTopicEvent.topic
      const roomId      = roomTopicEvent.roomId
      log.silly(PRE, 'onPadproMessageRoomEventTopic() roomTopicEvent="%s"', JSON.stringify(roomTopicEvent))

      const roomOldPayload = await this.roomPayload(roomId)
      const oldTopic       = roomOldPayload.topic

      const changerIdList = await this.roomMemberSearch(roomId, changerName)
      if (changerIdList.length < 1) {
        throw new Error('no changerId found')
      } else if (changerIdList.length > 1) {
        log.warn(PRE, 'onPadproMessage() case PadproMesssageSys: changerId found more than 1, use the first one.')
      }
      const changerId = changerIdList[0]

      if (!this.padproManager) {
        throw new Error('no padproManager')
      }
      /**
       * Set Cache Dirty
       */
      await this.roomPayloadDirty(roomId)

      this.emit('room-topic',  roomId, newTopic, oldTopic, changerId)
    }
  }

  protected async onPadproMessageFriendshipEvent (rawPayload: PadproMessagePayload): Promise<void> {
    log.verbose(PRE, 'onPadproMessageFriendshipEvent({id=%s})', rawPayload.messageId)
    /**
     * 1. Look for friendship confirm event
     */
    const friendshipConfirmContactId = friendshipConfirmEventMessageParser(rawPayload)
    /**
     * 2. Look for friendship receive event
     */
    const friendshipReceiveContactId = await friendshipReceiveEventMessageParser(rawPayload)
    /**
     * 3. Look for friendship verify event
     */
    const friendshipVerifyContactId = friendshipVerifyEventMessageParser(rawPayload)

    if (   friendshipConfirmContactId
        || friendshipReceiveContactId
        || friendshipVerifyContactId
    ) {
      // Maybe load contact here since we know a new friend is added
      this.emit('friendship', rawPayload.messageId)
    }
  }

  public async stop (): Promise<void> {
    log.verbose(PRE, 'stop()')

    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    if (this.state.off()) {
      log.warn(PRE, 'stop() is called on a OFF puppet. await ready(off) and return.')
      await this.state.ready('off')
      return
    }

    this.state.off('pending')

    // this.watchdog.sleep()
    await this.logout(true)

    await this.padproManager.stop()

    this.padproManager.removeAllListeners()
    this.padproManager = undefined

    await WechatGateway.release()
    this.state.off(true)
  }

  public async logout (shallow = false): Promise<void> {
    log.verbose(PRE, 'logout()')

    if (!this.id) {
      log.warn(PRE, 'logout() this.id not exist')
      return
    }

    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    this.emit('logout', this.id) // be care we will throw above by logonoff() when this.user===undefined
    this.id = undefined

    if (!shallow) {
      await this.padproManager.GrpcLogout()
    }

    await this.padproManager.logout()
  }

  /**
   *
   * Contact
   *
   */
  public contactAlias (contactId: string)                      : Promise<string>
  public contactAlias (contactId: string, alias: string | null): Promise<void>

  public async contactAlias (contactId: string, alias?: string | null): Promise<void | string> {
    log.verbose(PRE, 'contactAlias(%s, %s)', contactId, alias)

    if (typeof alias === 'undefined') {
      const payload = await this.contactPayload(contactId)
      return payload.alias || ''
    }

    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    await this.padproManager.GrpcSetContactAlias(contactId, alias || '')
    await this.contactPayloadDirty(contactId)

    return
  }

  public async contactValidate (contactId: string): Promise<boolean> {
    log.verbose(PRE, 'contactValid(%s)', contactId)

    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    try {
      await this.padproManager.contactRawPayload(contactId)
      return true
    } catch (e) {
      return false
    }
  }

  public async contactList (): Promise<string[]> {
    log.verbose(PRE, 'contactList()')

    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    const contactIdList = this.padproManager.getContactIdList()

    return contactIdList
  }

  public async contactAvatar (contactId: string)                : Promise<FileBox>
  public async contactAvatar (contactId: string, file: FileBox) : Promise<void>

  public async contactAvatar (contactId: string, file?: FileBox): Promise<void | FileBox> {
    log.verbose(PRE, 'contactAvatar(%s%s)',
                                  contactId,
                                  file ? (', ' + file.name) : '',
                )

    /**
     * 1. set avatar for user self
     */
    if (file) {
      if (contactId !== this.selfId()) {
        throw new Error('can not set avatar for others')
      }
      if (!this.padproManager) {
        throw new Error('no padpro manager')
      }
      // await this.padproManager.WXSetHeadImage(await file.toBase64())
      return
    }

    /**
     * 2. get avatar
     */
    const payload = await this.contactPayload(contactId)

    if (!payload.avatar) {
      throw new Error('no avatar')
    }

    const fileBox = FileBox.fromUrl(
      payload.avatar,
      `wechaty-contact-avatar-${payload.name}.jpg`,
    )
    return fileBox
  }

  public async contactSelfQrcode (): Promise<string> {
    log.verbose(PRE, 'contactSelfQrcode()')

    const contactId = this.selfId()

    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    const contactPayload = await this.contactPayload(contactId)
    const contactName    = contactPayload.alias || contactPayload.name || contactPayload.id

    return this.getQRCode(this.padproManager, contactName, contactId)
  }

  private async getQRCode (
    manager    : PadproManager,
    contactName: string,
    contactId  : string,
    counter?   : number
  )            : Promise<string> {
    const result = await manager.GrpcGetContactQrcode(contactId)
    const base64 = result.QrcodeBuf

    const fileBox = FileBox.fromBase64(base64, `${contactName}.jpg`)
    try {
      // There are some styles of qrcode can not be parsed by the library we are using,
      // So added a retry mechanism here to guarantee the qrcode
      // But still sometimes, the qrcode would be not available
      // So in the error message, let the user to do a retry
      return await fileBoxToQrcode(fileBox)
    } catch (e) {
      if (!counter) {
        counter = 1
      }
      if (counter > SELF_QRCODE_MAX_RETRY) {
        log.verbose(PRE, `contactQrcode(${contactId}) get qrcode , this should happen very rare`)
        throw Error('Unable to get qrcode for self, Please try , this issue usually won\'t happen frequently, retry should fix it. If not, please open an issue on https://github.com/lijiarui/wechaty-puppet-padpro')
      }
      return this.getQRCode(manager, contactName, contactId, ++ counter)
    }
  }

  public async contactPayloadDirty (contactId: string): Promise<void> {
    log.verbose(PRE, 'contactPayloadDirty(%s)', contactId)

    if (this.padproManager) {
      await this.padproManager.contactRawPayloadDirty(contactId)
    }

    await super.contactPayloadDirty(contactId)
  }

  public async contactRawPayload (contactId: string): Promise<PadproContactPayload> {

    if (!this.id) {
      throw Error('bot not login!')
    }

    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }
    const rawPayload = await this.padproManager.contactRawPayload(contactId)

    return rawPayload
  }

  public async contactRawPayloadParser (rawPayload: PadproContactPayload): Promise<ContactPayload> {

    const payload: ContactPayload = contactRawPayloadParser(rawPayload)

    if (rawPayload.stranger && isStrangerV1(rawPayload.stranger)) {
      payload.friend = true
    } else {
      payload.friend = false
    }

    // Considered to be unnecessary for now, try to disable first
    //
    // if (!this.padproManager) {
    //   throw new Error('no padpro manager')
    // }
    // const searchResult = await this.padproManager.GrpcSearchContact(rawPayload.userName)
    // let friend: undefined | boolean
    // if (searchResult) {
    //   if (searchResult.status === -24 && !searchResult.user_name) {
    //     friend = false
    //   } else if (  isStrangerV1(searchResult.user_name)
    //             || isStrangerV2(searchResult.user_name)
    //   ) {
    //     friend = false
    //   }
    // }
    return payload
  }

  /**
   * Overwrite the Puppet.contactPayload()
   */
  public async contactPayload (
    contactId: string,
  ): Promise<ContactPayload> {

    try {
      const payload = await super.contactPayload(contactId)
      return payload
    } catch (e) {
      log.silly(PRE, `contactPayload(${contactId}) exception: ${e.message}`)
      log.silly(PRE, `contactPayload(${contactId}) get failed for %s, try load from room member data source`)
    }

    const rawPayload = await this.contactRawPayload(contactId)

    if (!rawPayload || Object.keys(rawPayload).length <= 0) {
      log.silly(PRE, `contactPayload(${contactId}) rawPayload not exist`)

      const roomList = await this.contactRoomList(contactId)
      log.silly(PRE, `contactPayload(${contactId}) found ${roomList.length} rooms`)

      if (roomList.length > 0) {
        const roomId = roomList[0]
        const roomMemberPayload = await this.roomMemberPayload(roomId, contactId)
        if (roomMemberPayload) {

          const payload: ContactPayload = {
            avatar : roomMemberPayload.avatar,
            gender : ContactGender.Unknown,
            id     : roomMemberPayload.id,
            name   : roomMemberPayload.name,
            type   : ContactType.Personal,
          }

          this.cacheContactPayload.set(contactId, payload)
          log.silly(PRE, `contactPayload(${contactId}) cache SET`)

          return payload
        }
      }
      throw new Error('no raw payload')
    }

    return this.contactRawPayloadParser(rawPayload)
  }

  /**
   *
   * Message
   *
   */
  public async messageFile (messageId: string): Promise<FileBox> {
    log.warn(PRE, 'messageFile(%s)', messageId)

    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    const rawPayload = await this.messageRawPayload(messageId)
    const payload    = await this.messagePayload(messageId)

    let filename = payload.filename || payload.id

    let result

    switch (payload.type) {
      case MessageType.Audio:
        const voicePayload = await voicePayloadParser(rawPayload)
        if (voicePayload === null) {
          log.error(PRE, `Can not parse image message, content: ${rawPayload.content}`)
          return FileBox.fromBase64('', filename)
        }
        const name = `${rawPayload.messageId}.${voicePayload.voiceLength}.slk`
        if (rawPayload.data !== undefined && rawPayload.data !== null) {
          result = rawPayload.data
        } else {
          result = await this.padproManager.getMsgVoice(rawPayload)
        }

        return FileBox.fromBase64(result, name)

      case MessageType.Emoticon:
        const emojiPayload = await emojiPayloadParser(rawPayload)
        if (emojiPayload) {
          return FileBox.fromUrl(emojiPayload.cdnurl, `${filename}.gif`)
        } else {
          throw new Error('Can not get emoji file from the message')
        }

      case MessageType.Image:
        const imagePayload = await imagePayloadParser(rawPayload)
        if (imagePayload === null) {
          log.error(PRE, `Can not parse image message, content: ${rawPayload.content}`)
          return FileBox.fromBase64('', filename)
        }
        if (imagePayload.hdLength) {
          if (!this.cdnManager) {
            throw new Error(`CDN manager not exist`)
          }
          result = (await this.cdnManager.downloadFile(
            imagePayload.cdnBigImgUrl!,
            imagePayload.aesKey,
            imagePayload.hdLength,
            CDNFileType.IMAGE,
          )).toString('base64')
        } else {
          result = await this.padproManager.GrpcGetMsgImage(
            rawPayload,
            imagePayload,
          )
        }

        return FileBox.fromBase64(result, filename)

      case MessageType.Video:
        const videoPayload = await videoPayloadParser(rawPayload)
        if (videoPayload === null) {
          log.error(PRE, `Can not parse video message, content: ${rawPayload.content}`)
          return FileBox.fromBase64('', filename)
        }
        if (!this.cdnManager) {
          throw new Error(`CDN manager not exist`)
        }
        result = await this.cdnManager.downloadFile(
          videoPayload.cdnVideoUrl,
          videoPayload.aesKey,
          videoPayload.length,
          CDNFileType.VIDEO,
        )
        return FileBox.fromBase64(result.toString('base64'), filename)

      case MessageType.Attachment:
        const attachmentPayload = await appMessageParser(rawPayload)
        if (attachmentPayload === null || !attachmentPayload.appattach) {
          log.verbose(PRE, `Can not parse attachment message, content: ${rawPayload.content}`)
          return FileBox.fromBase64('', 'empty-file')
        }
        const cdnInfo = attachmentPayload.appattach
        filename = attachmentPayload.title

        if (!this.cdnManager) {
          throw new Error(`${PRE} messageFile() can not get file from message since cdn manager is not inited.`)
        }
        const data = await this.cdnManager.downloadFile(
          cdnInfo.cdnattachurl || '',
          cdnInfo.aeskey || '',
          cdnInfo.totallen || 0,
          CDNFileType.ATTACHMENT,
        )

        return FileBox.fromBase64(
          data.toString('base64'),
          filename,
        )

      default:
        log.warn(PRE, 'messageFile(%s) unsupport type: %s(%s) because it is not fully implemented yet, PR is welcome.',
                                  messageId,
                                  PadproMessageType[rawPayload.messageType],
                                  rawPayload.messageType,
                )
        const base64 = 'Tm90IFN1cHBvcnRlZCBBdHRhY2htZW50IEZpbGUgVHlwZSBpbiBNZXNzYWdlLgpTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9DaGF0aWUvd2VjaGF0eS9pc3N1ZXMvMTI0OQo='
        filename = 'wechaty-puppet-padpro-message-attachment-' + messageId + '.txt'

        return FileBox.fromBase64(
          base64,
          filename,
        )
    }
  }

  public async messageUrl (messageId: string): Promise<UrlLinkPayload> {

    const rawPayload = await this.messageRawPayload(messageId)
    const payload = await this.messagePayload(messageId)

    if (payload.type !== MessageType.Url) {
      throw new Error('Can not get url from non url payload')
    } else {
      const appPayload = await appMessageParser(rawPayload)
      if (appPayload) {
        return {
          description: appPayload.des,
          thumbnailUrl: appPayload.thumburl,
          title: appPayload.title,
          url: appPayload.url,
        }
      } else {
        throw new Error('Can not parse url message payload')
      }
    }
  }

  public async messageRawPayload (id: string): Promise<PadproMessagePayload> {
    const rawPayload = this.cachePadproMessagePayload.get(id)

    if (!rawPayload) {
      throw new Error('no rawPayload')
    }

    return rawPayload
  }

  public async messageRawPayloadParser (rawPayload: PadproMessagePayload): Promise<MessagePayload> {
    log.verbose(PRE, 'messageRawPayloadParser({messageId="%s"})', rawPayload.messageId)

    const payload: MessagePayload = await messageRawPayloadParser(rawPayload)

    log.silly(PRE, 'messagePayload(%s)', JSON.stringify(payload))
    return payload
  }

  public async messageSendText (
    receiver   : Receiver,
    text       : string,
    atUserList?: string[],
  ): Promise<void> {
    log.verbose(PRE, 'messageSend(%s, %s)', JSON.stringify(receiver), text)

    // Send to the Room if there's a roomId
    const id = receiver.roomId || receiver.contactId

    if (!id) {
      throw Error('no id')
    }
    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }
    await this.padproManager.GrpcSendMessage(id, text, atUserList)
  }

  public async messageSendFile (
    receiver : Receiver,
    file     : FileBox,
  ): Promise<void> {
    log.verbose(PRE, `messageSendFile("${JSON.stringify(receiver)}", ${file})`)

    // Send to the Room if there's a roomId
    const id = receiver.roomId || receiver.contactId

    if (!id) {
      throw new Error('no id!')
    }

    if (!this.padproManager) {
      throw new Error(`${PRE} no padpro manager`)
    }

    if (!this.cdnManager) {
      throw new Error(`${PRE} no cdn manager`)
    }

    // this needs to run before mimeType is available
    await file.ready()

    const type = (file.mimeType && file.mimeType !== 'application/octet-stream')
      ? file.mimeType
      : path.extname(file.name)

    log.silly(PRE, `fileType ${type}`)
    switch (type) {
      /**
       * Comment for now, since sending voice with mp3/wav has some blocker.
       */
      // case 'audio/wav':
      // case '.wav':
      //   try {
      //     const buffer = await file.toBuffer()
      //     const { duration: voiceLength } = await getWavInfoFromBuffer(buffer.slice(0, 40), null)
      //     await this.padproManager.GrpcSendVoice(
      //       id,
      //       await file.toBase64(),
      //       voiceLength,
      //       GrpcVoiceFormat.Wave,
      //     )
      //   } catch (e) {
      //     throw Error('Can not send voice wav')
      //   }
      //   break

      // case 'audio/mp3':
      // case '.mp3':
      //   try {
      //     const voiceLength = getMp3Duration(await file.toBuffer())
      //     await this.padproManager.GrpcSendVoice(
      //       id,
      //       await file.toBase64(),
      //       voiceLength,
      //       GrpcVoiceFormat.Mp3,
      //     )
      //   } catch (e) {
      //     throw Error('Can not send voice mp3')
      //   }
      //   break

      case '.slk':
        try {
          // TODO: temporary hack solution, replace this when there is metadata in FileBox object
          // make sure it is grabbing the second to the last argument as length
          const voiceLength = parseInt(file.name.split('.').slice(-2, -1)[0], 10)
          await this.padproManager.GrpcSendVoice(
            id,
            await file.toBase64(),
            voiceLength,
            GrpcVoiceFormat.Silk,
          )
        } catch (e) {
          throw Error('Can not send voice file, voice length not found from file name, please use voice file generated by wechaty, and don\' modify the file object')
        }
        break

      case 'image/jpeg':
      case 'image/png':
      case '.jpg':
      case '.jpeg':
      case '.png':
        try {
          await this.padproManager.GrpcSendImage(
            id,
            await file.toBase64(),
          )
        } catch (e) {
          throw Error('Cannot send Image')
        }
        break

      case '.mp4':
        throw new Error('Sending Video not supported yet.')

      default:
        const appPayload = await this.cdnManager.uploadFile(
          id,
          await file.toBase64(),
          file.name,
          path.extname(file.name),
        )
        const content = generateAttachmentXMLMessageFromRaw(appPayload)
        await this.padproManager.GrpcSendApp(id, content)
        break
    }
  }

  public async messageSendContact (
    receiver  : Receiver,
    contactId : string,
  ): Promise<void> {
    log.verbose(PRE, `messageSendContact("${JSON.stringify(receiver)}", ${contactId})`)

    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    // Send to the Room if there's a roomId
    const id = receiver.roomId || receiver.contactId

    if (!id) {
      throw Error('no id')
    }

    await this.padproManager.shareContactCard(id, contactId)
  }

  public async messageSendUrl (
    receiver: Receiver,
    urlLinkPayload: UrlLinkPayload
  ): Promise<void> {
    log.verbose(PRE, `messageSendLink("${JSON.stringify(receiver)}", ${JSON.stringify(urlLinkPayload)})`)

    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    // Send to the Room if there's a roomId
    const id = receiver.roomId || receiver.contactId

    if (!id) {
      throw Error('no id')
    }

    await this.padproManager.GrpcSendApp(id, generateAppXMLMessage(urlLinkPayload))
  }

  public async messageForward (
    receiver  : Receiver,
    messageId : string,
  ): Promise<void> {
    log.verbose(PRE, `messageForward(${JSON.stringify(receiver)}, ${messageId})`)

    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    const payload = await this.messagePayload(messageId)

    if (payload.type === MessageType.Text) {
      if (!payload.text) {
        throw new Error('no text')
      }
      await this.messageSendText(
        receiver,
        payload.text,
      )
    } else if (payload.type === MessageType.Audio) {
      const rawPayload = await this.messageRawPayload(messageId)

      const id = receiver.roomId || receiver.contactId
      if (!id) {
        throw Error(`Can not find the receiver id for forwarding voice message(${rawPayload.messageId}), forward voice message failed`)
      }
      let data: string
      const voicePayload = await voicePayloadParser(rawPayload)
      if (voicePayload === null) {
        log.error(PRE, `Can not parse voice message, content: ${rawPayload.content}`)
        throw new Error(`Can not parse voice message.`)
      }

      if (rawPayload.data !== undefined && rawPayload.data !== null) {
        data = rawPayload.data
      } else {
        data = await this.padproManager.getMsgVoice(rawPayload)
      }

      await this.padproManager.GrpcSendVoice(
        id,
        data,
        voicePayload.voiceLength,
        GrpcVoiceFormat.Silk,
      )
    } else if (payload.type === MessageType.Url) {
      await this.messageSendUrl(
        receiver,
        await this.messageUrl(messageId)
      )
    } else if (payload.type === MessageType.Attachment) {
      await this.forwardAttachment(receiver, messageId)
    } else if (payload.type === MessageType.Video) {
      await this.forwardVideo(receiver, messageId)
    } else {
      await this.messageSendFile(
        receiver,
        await this.messageFile(messageId),
      )
    }
  }

  private async forwardAttachment (
    receiver: Receiver,
    messageId: string,
  ): Promise<void> {
    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    const rawPayload = await this.messageRawPayload(messageId)

    // Send to the Room if there's a roomId
    const id = receiver.roomId || receiver.contactId

    if (!id) {
      throw new Error('There is no receiver id when trying to forward attachment.')
    }
    const appPayload = await appMessageParser(rawPayload)
    if (appPayload === null) {
      throw new Error('Can not forward attachment, failed to parse xml message.')
    }

    const content = generateAttachmentXMLMessageFromRaw(appPayload)
    await this.padproManager.GrpcSendApp(id, content)
  }

  private async forwardVideo (
    receiver: Receiver,
    messageId: string,
  ): Promise<void> {
    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    const rawPayload = await this.messageRawPayload(messageId)

    // Send to the Room if there's a roomId
    const id = receiver.roomId || receiver.contactId

    if (!id) {
      throw new Error('There is no receiver id when trying to forward attachment.')
    }
    const videoPayload = await videoPayloadParser(rawPayload)
    if (videoPayload === null) {
      throw new Error('Can not forward video, failed to parse xml message.')
    }
    await this.padproManager.GrpcSendVideo(id, videoPayload)
  }

  /**
   *
   * Room
   *
   */
  public async roomMemberPayloadDirty (roomId: string) {

    if (this.padproManager) {
      await this.padproManager.roomMemberRawPayloadDirty(roomId)
    }

    await super.roomMemberPayloadDirty(roomId)
  }

  public async roomMemberRawPayload (
    roomId    : string,
    contactId : string,
  ): Promise<PadproRoomMemberPayload> {

    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    const memberDictRawPayload = await this.padproManager.roomMemberRawPayload(roomId)

    return memberDictRawPayload[contactId]
  }

  public async roomMemberRawPayloadParser (
    rawPayload: PadproRoomMemberPayload,
  ): Promise<RoomMemberPayload> {

    const payload: RoomMemberPayload = {
      avatar    : rawPayload.bigHeadUrl,
      id        : rawPayload.contactId,
      inviterId : rawPayload.inviterId,
      name      : rawPayload.nickName,
      roomAlias : rawPayload.displayName,
    }

    return payload
  }

  public async roomPayloadDirty (roomId: string): Promise<void> {

    if (this.padproManager) {
      this.padproManager.roomRawPayloadDirty(roomId)
    }

    await super.roomPayloadDirty(roomId)
  }

  public async roomRawPayload (
    roomId: string,
  ): Promise<PadproRoomPayload> {

    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    const rawPayload = await this.padproManager.roomRawPayload(roomId)

    if (!rawPayload.chatroomId) rawPayload.chatroomId = roomId
    return rawPayload
  }

  public async roomRawPayloadParser (rawPayload: PadproRoomPayload): Promise<RoomPayload> {

    const payload: RoomPayload = roomRawPayloadParser(rawPayload)
    return payload
  }

  public async roomMemberList (roomId: string): Promise<string[]> {
    log.verbose(PRE, `roomMemberList(${roomId})`)

    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    const memberIdList = await this.padproManager.getRoomMemberIdList(roomId)
    log.silly(PRE, `roomMemberList() = ${memberIdList.length}`)

    if (memberIdList.length <= 0) {
      await this.roomPayloadDirty(roomId)
    }

    return memberIdList
  }

  public async roomValidate (roomId: string): Promise<boolean> {
    log.verbose(PRE, `roomValid(${roomId})`)
    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }
    const exist = await this.padproManager.GrpcGetChatRoomMember(roomId)
    return !!exist
  }

  public async roomList (): Promise<string[]> {
    log.verbose(PRE, 'roomList()')

    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    const roomIdList = await this.padproManager.getRoomIdList()
    log.silly(PRE, `roomList()=${roomIdList.length}`)

    return roomIdList
  }

  public async roomDel (
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose(PRE, `roomDel(${roomId}, ${contactId})`)

    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    const memberIdList = await this.roomMemberList(roomId)
    if (memberIdList.includes(contactId)) {
      await this.padproManager.GrpcDeleteRoomMember(roomId, contactId)
    } else {
      log.warn(PRE, `roomDel() room(${roomId}) has no member contact(${contactId})`)
    }
  }

  public async roomQrcode (roomId: string): Promise<string> {
    log.verbose(PRE, 'roomQrcode(%s)', roomId)

    const memberIdList = await this.roomMemberList(roomId)
    if (!memberIdList.includes(this.selfId())) {
      throw new Error(`userSelf not in this room: ${roomId}`)
    }

    const result = await this.padproManager!.GrpcGetContactQrcode(roomId)
    const base64 = result.QrcodeBuf

    const roomPayload = await this.roomPayload(roomId)
    const roomName    = roomPayload.topic || roomPayload.id
    const fileBox     = FileBox.fromBase64(base64, `${roomName}-qrcode.jpg`)
    await fileBox.toFile()

    const qrcode = await fileBoxToQrcode(fileBox)

    return qrcode
  }

  public async roomAvatar (roomId: string): Promise<FileBox> {
    log.verbose(PRE, 'roomAvatar(%s)', roomId)

    const payload = await this.roomPayload(roomId)

    if (payload.avatar) {
      return FileBox.fromUrl(payload.avatar)
    }

    log.warn(PRE, 'roomAvatar() avatar not found, use the chatie default.')
    return qrCodeForChatie()
  }

  public async roomAdd (
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose(PRE, `roomAdd(${roomId}, ${contactId})`)

    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    // XXX: did there need to calc the total number of the members in this room?
    // if n <= 40 then add() else invite() ?
    try {
      log.verbose(PRE, `roomAdd(${roomId}, ${contactId}) try to Add`)
      await this.padproManager.GrpcAddRoomMember(roomId, contactId)
    } catch (e) {
      // FIXME
      console.error(e)
      log.warn(PRE, `roomAdd() Add exception: ${e}`)
      log.verbose(PRE, `roomAdd(${roomId}, ${contactId}) try to Invite`)
      await this.padproManager.GrpcInviteRoomMember(roomId, contactId)
    }

    // Reload room information here
    await this.roomMemberPayloadDirty(roomId)
    await new Promise(r => setTimeout(r, 500))
    await this.roomMemberPayload(roomId, contactId)
  }

  public async roomTopic (roomId: string)                : Promise<string>
  public async roomTopic (roomId: string, topic: string) : Promise<void>

  public async roomTopic (
    roomId: string,
    topic?: string,
  ): Promise<void | string> {
    log.verbose(PRE, `roomTopic(${roomId}, ${topic})`)

    if (typeof topic === 'undefined') {
      const payload = await this.roomPayload(roomId)
      return payload.topic
    }

    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    await this.padproManager.GrpcSetRoomName(roomId, topic)
    /**
     * Give server some time to refresh the API payload
     * when we have to make sure the data is the latest.
     */
    await this.roomPayloadDirty(roomId)
    await new Promise(r => setTimeout(r, 500))
    await this.roomPayload(roomId)

    return
  }

  public async roomCreate (
    contactIdList : string[],
    topic         : string,
  ): Promise<string> {
    log.verbose(PRE, `roomCreate(${contactIdList}, ${topic})`)

    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    const payload = await this.padproManager.GrpcCreateRoom(contactIdList)
    const roomId = payload.Roomeid

    // Load new created room payload
    await this.roomPayload(roomId)

    return roomId
  }

  public async roomQuit (roomId: string): Promise<void> {
    log.verbose(PRE, `roomQuit(${roomId})`)

    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    await this.padproManager.GrpcQuitRoom(roomId)

    // Clean Cache
    await this.roomMemberPayloadDirty(roomId)
    await this.roomPayloadDirty(roomId)
  }

  public async roomAnnounce (roomId: string)             : Promise<string>
  public async roomAnnounce (roomId: string, text: string) : Promise<void>

  public async roomAnnounce (roomId: string, text?: string): Promise<void | string> {
    log.verbose(PRE, `roomAnnounce(${roomId}, ${text ? text : ''})`)

    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    if (text) {
      await this.padproManager.GrpcSetRoomAnnouncement(roomId, text)
    } else {
      log.warn('Getting room announcement is not supported by wechaty-puppet-padpro.')
      return ''
    }
  }

  public async roomInvitationRawPayload (roomInvitationId: string): Promise<PadproRoomInvitationPayload> {
    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    return this.padproManager.roomInvitationRawPayload(roomInvitationId)
  }

  public async roomInvitationRawPayloadParser (rawPayload: PadproRoomInvitationPayload): Promise<RoomInvitationPayload> {
    return {
      id: rawPayload.id,
      inviterId: rawPayload.fromUser,
      roomMemberCount: 0,
      roomMemberIdList: [],
      roomTopic: rawPayload.roomName,
      timestamp: rawPayload.timestamp
    }
  }

  public async roomInvitationAccept (roomInvitationId: string): Promise<void> {

    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    let res: string = ''
    try {
      const payload = await this.padproManager.roomInvitationRawPayload(roomInvitationId)
      const shareUrl = payload.url

      const response = await this.padproManager.GrpcGetA8Key(this.selfId(), shareUrl)

      res = await require('request-promise')({
        method: 'POST',
        simple: false,
        uri: response.Url,
      })
    } catch (e) {
      throw new Error('UNKNOWN: Unexpected error happened when trying to accept invitation\n' + e)
    }

    if (res.indexOf('你无法查看被转发过的邀请') !== -1 || res.indexOf('Unable to view forwarded invitations') !== -1) {
      throw new Error('FORWARDED: Accept invitation failed, this is a forwarded invitation, can not be accepted')
    } else if (res.indexOf('你未开通微信支付') !== -1 || res.indexOf('You haven\'t enabled WeChat Pay') !== -1
              || res.indexOf('你需要实名验证后才能接受邀请') !== -1) {
      throw new Error('WXPAY: The user need to enable wechaty pay(微信支付) to join the room, this is requested by Wechat.')
    } else if (res.indexOf('该邀请已过期') !== -1 || res.indexOf('Invitation expired') !== -1) {
      throw new Error('EXPIRED: The invitation is expired, please request the user to send again')
    } else if (res.indexOf('群聊邀请操作太频繁请稍后再试') !== -1 || res.indexOf('操作太频繁，请稍后再试') !== -1) {
      throw new Error('FREQUENT: Room invitation operation too frequent.')
    } else if (res.indexOf('已达群聊人数上限') !== -1) {
      throw new Error('LIMIT: The room member count has reached the limit.')
    } else if (res.indexOf('该群因违规已被限制使用，无法添加群成员') !== -1) {
      throw new Error('INVALID: This room has been mal used, can not add new members.')
    }
  }

  /**
   *
   * Friendship
   *
   */
  public async friendshipAdd (
    contactId : string,
    hello     : string,
  ): Promise<void> {
    log.verbose(PRE, `friendshipAdd(${contactId}, ${hello})`)

    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    const rawSearchPayload: GrpcContactRawPayload = await this.padproManager.GrpcSearchContact(contactId)

    console.log(JSON.stringify(rawSearchPayload, null, 2))
    /**
     * If the contact is not stranger, than using WXSearchContact can get userName
     */
    if (rawSearchPayload.UserName !== '' && !isStrangerV1(rawSearchPayload.UserName) && !isStrangerV2(rawSearchPayload.UserName)) {
      log.warn(PRE, `friendshipAdd ${contactId} has been friend with bot, no need to send friend request!`)
      return
    }

    let strangerV1
    let strangerV2
    if (isStrangerV1(rawSearchPayload.Ticket)) {
      strangerV1 = rawSearchPayload.Ticket
      strangerV2 = rawSearchPayload.UserName
    } else if (isStrangerV2(rawSearchPayload.Ticket)) {
      strangerV2 = rawSearchPayload.Ticket
      strangerV1 = rawSearchPayload.UserName
    } else {
      throw new Error('stranger neither v1 nor v2!')
    }

    // Issue #1252 : what's wrong here?, Trying to fix now...

    await this.padproManager.GrpcAddFriend(
      strangerV1 || '',
      strangerV2 || '',
      SearchContactTypeStatus.WXID, // default
      hello,
    )
  }

  public async friendshipAccept (
    friendshipId : string,
  ): Promise<void> {
    log.verbose(PRE, `friendshipAccept(${friendshipId})`)

    const payload = await this.friendshipPayload(friendshipId) as any as FriendshipPayloadReceive

    if (!payload.ticket) {
      throw new Error('no ticket')
    }
    if (!payload.stranger) {
      throw new Error('no stranger')
    }

    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    await this.padproManager.GrpcAcceptFriend(
      payload.stranger,
      payload.ticket,
    )
  }

  public async friendshipRawPayloadParser (rawPayload: PadproMessagePayload) : Promise<FriendshipPayload> {
    log.verbose(PRE, `friendshipRawPayloadParser({id=${rawPayload.messageId}})`)

    const payload: FriendshipPayload = await friendshipRawPayloadParser(rawPayload)
    return payload
  }

  public async friendshipRawPayload (friendshipId: string): Promise<PadproMessagePayload> {
    log.verbose(PRE, 'friendshipRawPayload(%s)', friendshipId)

    /**
     * Friendship shares Cache with the Message RawPayload
     */
    const rawPayload = this.cachePadproMessagePayload.get(friendshipId)
    if (!rawPayload) {
      throw new Error(`no rawPayload for id ${friendshipId}`)
    }

    return rawPayload
  }

  public unref (): void {
    log.verbose(PRE, 'unref ()')

    super.unref()

    if (this.padproManager) {
      // TODO: this.padproManager.unref()
    }
  }

  public async contactSelfName (newName: string) : Promise<void> {
    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    await this.padproManager.updateSelfName(newName)
    await this.contactPayloadDirty(this.selfId())
  }

  public async contactSelfSignature (signature: string) : Promise<void> {
    if (!this.padproManager) {
      throw new Error('no padpro manager')
    }

    await this.padproManager.updateSelfSignature(signature)
    await this.contactPayloadDirty(this.selfId())
  }
}

export default PuppetPadpro
