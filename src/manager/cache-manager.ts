import fs     from 'fs-extra'
import os     from 'os'
import path   from 'path'

import { FlashStoreSync } from 'flash-store'

import { log } from '../config'
import {
  FileCache,
  PadproContactPayload,
  PadproRoomInvitationPayload,
  PadproRoomMemberPayload,
  PadproRoomPayload,
} from '../schemas'

const PRE = 'CacheManager'

export class CacheManager {

  /**
   * ************************************************************************
   *                Static Methods
   * ************************************************************************
   */
  private static _instance?: CacheManager

  public static get Instance () {
    if (!this._instance) {
      throw new Error(`${PRE} cache manager instance not initialized.`)
    }
    return this._instance
  }

  public static async init (
    token: string,
    userId: string,
  ) {
    log.info(PRE, `init()`)
    if (this._instance) {
      log.verbose(PRE, `init() CacheManager has been initialized, no need to initialize again.`)
      return
    }
    this._instance = new CacheManager()
    await this._instance.initCache(token, userId)
  }

  public static async release () {
    log.info(PRE, `release()`)
    if (!this._instance) {
      log.verbose(PRE, `release() CacheManager not exist, no need to release it.`)
      return
    }
    await this._instance.releaseCache()
    this._instance = undefined
  }

  /**
   * ************************************************************************
   *                Instance Methods
   * ************************************************************************
   */
  private cacheContactRawPayload?    : FlashStoreSync<string, PadproContactPayload>
  private cacheRoomMemberRawPayload? : FlashStoreSync<string, {
    [contactId: string]: PadproRoomMemberPayload,
  }>
  private cacheRoomRawPayload?       : FlashStoreSync<string, PadproRoomPayload>
  private cacheRoomInvitationRawPayload? : FlashStoreSync<string, PadproRoomInvitationPayload>
  private cacheFile? : FlashStoreSync<string, FileCache>

  /**
   * -------------------------------
   * Contact Section
   * --------------------------------
   */
  public getContact (
    contactId: string,
  ): PadproContactPayload | undefined {
    if (!this.cacheContactRawPayload) {
      throw new Error(`${PRE} getContact() has no cache.`)
    }
    return this.cacheContactRawPayload.get(contactId)
  }

  public setContact (
    contactId: string,
    payload: PadproContactPayload
  ): void {
    if (!this.cacheContactRawPayload) {
      throw new Error(`${PRE} setContact() has no cache.`)
    }
    this.cacheContactRawPayload.set(contactId, payload)
  }

  public deleteContact (
    contactId: string,
  ): void {
    if (!this.cacheContactRawPayload) {
      throw new Error(`${PRE} deleteContact() has no cache.`)
    }
    this.cacheContactRawPayload.delete(contactId)
  }

  public getContactIds (): string[] {
    if (!this.cacheContactRawPayload) {
      throw new Error(`${PRE} getContactIds() has no cache.`)
    }
    return [...this.cacheContactRawPayload.keys()]
  }

  public getAllContacts (): PadproContactPayload[] {
    if (!this.cacheContactRawPayload) {
      throw new Error(`${PRE} getAllContacts() has no cache.`)
    }
    return [...this.cacheContactRawPayload.values()]
  }

  public hasContact (contactId: string): boolean {
    if (!this.cacheContactRawPayload) {
      throw new Error(`${PRE} hasContact() has no cache.`)
    }
    return this.cacheContactRawPayload.has(contactId)
  }

  public getContactCount (): number {
    if (!this.cacheContactRawPayload) {
      throw new Error(`${PRE} getContactCount() has no cache.`)
    }
    return this.cacheContactRawPayload.size
  }

  /**
   * -------------------------------
   * Room Section
   * --------------------------------
   */
  public getRoom (
    roomId: string,
  ): PadproRoomPayload | undefined {
    if (!this.cacheRoomRawPayload) {
      throw new Error(`${PRE} getRoom() has no cache.`)
    }
    return this.cacheRoomRawPayload.get(roomId)
  }

  public setRoom (
    roomId: string,
    payload: PadproRoomPayload
  ): void {
    if (!this.cacheRoomRawPayload) {
      throw new Error(`${PRE} setRoom() has no cache.`)
    }
    this.cacheRoomRawPayload.set(roomId, payload)
  }

  public deleteRoom (
    roomId: string,
  ): void {
    if (!this.cacheRoomRawPayload) {
      throw new Error(`${PRE} setRoom() has no cache.`)
    }
    this.cacheRoomRawPayload.delete(roomId)
  }

  public getRoomIds (): string[] {
    if (!this.cacheRoomRawPayload) {
      throw new Error(`${PRE} getRoomIds() has no cache.`)
    }
    return [...this.cacheRoomRawPayload.keys()]
  }

  public getRoomCount (): number {
    if (!this.cacheRoomRawPayload) {
      throw new Error(`${PRE} getRoomCount() has no cache.`)
    }
    return this.cacheRoomRawPayload.size
  }

  public hasRoom (roomId: string): boolean {
    if (!this.cacheRoomRawPayload) {
      throw new Error(`${PRE} hasRoom() has no cache.`)
    }
    return this.cacheRoomRawPayload.has(roomId)
  }
  /**
   * -------------------------------
   * Room Member Section
   * --------------------------------
   */
  public getRoomMember (
    roomId: string,
  ): { [contactId: string]: PadproRoomMemberPayload } | undefined {
    if (!this.cacheRoomMemberRawPayload) {
      throw new Error(`${PRE} getRoomMember() has no cache.`)
    }
    return this.cacheRoomMemberRawPayload.get(roomId)
  }

  public setRoomMember (
    roomId: string,
    payload: { [contactId: string]: PadproRoomMemberPayload }
  ): void {
    if (!this.cacheRoomMemberRawPayload) {
      throw new Error(`${PRE} setRoomMember() has no cache.`)
    }
    this.cacheRoomMemberRawPayload.set(roomId, payload)
  }

  public deleteRoomMember (
    roomId: string,
  ): void {
    if (!this.cacheRoomMemberRawPayload) {
      throw new Error(`${PRE} deleteRoomMember() has no cache.`)
    }
    this.cacheRoomMemberRawPayload.delete(roomId)
  }

  /**
   * -------------------------------
   * Room Invitation Section
   * --------------------------------
   */
  public getRoomInvitation (
    messageId: string,
  ): PadproRoomInvitationPayload | undefined {
    if (!this.cacheRoomInvitationRawPayload) {
      throw new Error(`${PRE} getRoomInvitationRawPayload() has no cache.`)
    }
    return this.cacheRoomInvitationRawPayload.get(messageId)
  }

  public setRoomInvitation (
    messageId: string,
    payload: PadproRoomInvitationPayload,
  ): void {
    if (!this.cacheRoomInvitationRawPayload) {
      throw new Error(`${PRE} setRoomInvitationRawPayload() has no cache.`)
    }
    this.cacheRoomInvitationRawPayload.set(messageId, payload)
  }

  public deleteRoomInvitation (
    messageId: string,
  ): void {
    if (!this.cacheRoomInvitationRawPayload) {
      throw new Error(`${PRE} deleteRoomInvitation() has no cache.`)
    }
    this.cacheRoomInvitationRawPayload.delete(messageId)
  }

  /**
   * -------------------------------
   * CDN File Cache Section
   * --------------------------------
   */
  public getFileCache (
    fileId: string
  ): FileCache | undefined {
    if (!this.cacheFile) {
      throw new Error(`${PRE} getFileCache() has no cache.`)
    }

    const fileCache = this.cacheFile.get(fileId)

    if (!fileCache) {
      return fileCache
    }

    return this.parseJSON(JSON.stringify(fileCache))
  }

  public setFileCache (
    fileId: string,
    cache: FileCache
  ): void {
    if (!this.cacheFile) {
      throw new Error(`${PRE} setFileCache() has no cache.`)
    }
    log.silly(PRE, `setFileCache(${fileId}, ${JSON.stringify(cache)})`)
    this.cacheFile.set(fileId, cache)
  }

  /**
   * -------------------------------
   * Private Method Section
   * --------------------------------
   */

  private parseJSON (payload: any) {
    log.silly(PRE, `parseJSON(${payload})`)
    return JSON.parse(payload, (_, v) => {
      if (
        v !== null            &&
        typeof v === 'object' &&
        'type' in v           &&
        v.type === 'Buffer'   &&
        'data' in v           &&
        Array.isArray(v.data)
      ) {
        return Buffer.from(v.data)
      }
      return v
    })
  }

  private async initCache (
    token: string,
    userId: string,
  ): Promise<void> {
    log.verbose(PRE, 'initCache(%s, %s)', token, userId)

    if (   this.cacheContactRawPayload
        || this.cacheRoomMemberRawPayload
        || this.cacheRoomRawPayload
        || this.cacheRoomInvitationRawPayload
        || this.cacheFile
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
    this.cacheFile                     = new FlashStoreSync(path.join(baseDir, 'file-cache'))

    await Promise.all([
      this.cacheContactRawPayload.ready(),
      this.cacheRoomMemberRawPayload.ready(),
      this.cacheRoomRawPayload.ready(),
      this.cacheRoomInvitationRawPayload.ready(),
      this.cacheFile.ready(),
    ])

    const roomMemberTotal = [...this.cacheRoomMemberRawPayload.values()].reduce(
      (acc, cur) => acc + Object.keys(cur).length, 0
    )

    const contactTotal = this.cacheContactRawPayload.size
    const roomTotal = this.cacheRoomRawPayload.size

    log.verbose(PRE, `initCache() inited ${contactTotal} Contacts, ${roomMemberTotal} RoomMembers, ${roomTotal} Rooms, cachedir="${baseDir}"`)
  }

  private async releaseCache () {
    log.verbose(PRE, 'releaseCache()')

    if (   this.cacheContactRawPayload
        && this.cacheRoomMemberRawPayload
        && this.cacheRoomRawPayload
        && this.cacheRoomInvitationRawPayload
        && this.cacheFile
    ) {
      log.silly(PRE, 'releaseCache() closing caches ...')

      await Promise.all([
        this.cacheContactRawPayload.close(),
        this.cacheRoomMemberRawPayload.close(),
        this.cacheRoomRawPayload.close(),
        this.cacheRoomInvitationRawPayload.close(),
        this.cacheFile.close()
      ])

      this.cacheContactRawPayload    = undefined
      this.cacheRoomMemberRawPayload = undefined
      this.cacheRoomRawPayload       = undefined
      this.cacheRoomInvitationRawPayload = undefined
      this.cacheFile = undefined

      log.silly(PRE, 'releaseCache() cache closed.')
    } else {
      log.verbose(PRE, 'releaseCache() cache not exist.')
    }
  }

}
