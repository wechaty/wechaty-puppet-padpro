import fs     from 'fs-extra'
import os     from 'os'
import path   from 'path'

import { FlashStore } from 'flash-store'

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
  private cacheContactRawPayload?    : FlashStore<string, PadproContactPayload>
  private cacheRoomMemberRawPayload? : FlashStore<string, {
    [contactId: string]: PadproRoomMemberPayload,
  }>
  private cacheRoomRawPayload?       : FlashStore<string, PadproRoomPayload>
  private cacheRoomInvitationRawPayload? : FlashStore<string, PadproRoomInvitationPayload>
  private cacheFile? : FlashStore<string, FileCache>

  /**
   * -------------------------------
   * Contact Section
   * --------------------------------
   */
  public async getContact (
    contactId: string,
  ): Promise<PadproContactPayload | undefined> {
    if (!this.cacheContactRawPayload) {
      throw new Error(`${PRE} getContact() has no cache.`)
    }
    return this.cacheContactRawPayload.get(contactId)
  }

  public async setContact (
    contactId: string,
    payload: PadproContactPayload
  ): Promise<void> {
    if (!this.cacheContactRawPayload) {
      throw new Error(`${PRE} setContact() has no cache.`)
    }
    await this.cacheContactRawPayload.set(contactId, payload)
  }

  public async deleteContact (
    contactId: string,
  ): Promise<void> {
    if (!this.cacheContactRawPayload) {
      throw new Error(`${PRE} deleteContact() has no cache.`)
    }
    await this.cacheContactRawPayload.delete(contactId)
  }

  public async getContactIds (): Promise<string[]> {
    if (!this.cacheContactRawPayload) {
      throw new Error(`${PRE} getContactIds() has no cache.`)
    }
    const result: string[] = []
    for await (const key of this.cacheContactRawPayload.keys()) {
      result.push(key)
    }

    return result
  }

  public async getAllContacts (): Promise<PadproContactPayload[]> {
    if (!this.cacheContactRawPayload) {
      throw new Error(`${PRE} getAllContacts() has no cache.`)
    }
    const result: PadproContactPayload[] = []
    for await (const value of this.cacheContactRawPayload.values()) {
      result.push(value)
    }
    return result
  }

  public async hasContact (contactId: string): Promise<boolean> {
    if (!this.cacheContactRawPayload) {
      throw new Error(`${PRE} hasContact() has no cache.`)
    }
    return this.cacheContactRawPayload.has(contactId)
  }

  public async getContactCount (): Promise<number> {
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
  public async getRoom (
    roomId: string,
  ): Promise<PadproRoomPayload | undefined> {
    if (!this.cacheRoomRawPayload) {
      throw new Error(`${PRE} getRoom() has no cache.`)
    }
    return this.cacheRoomRawPayload.get(roomId)
  }

  public async setRoom (
    roomId: string,
    payload: PadproRoomPayload
  ): Promise<void> {
    if (!this.cacheRoomRawPayload) {
      throw new Error(`${PRE} setRoom() has no cache.`)
    }
    await this.cacheRoomRawPayload.set(roomId, payload)
  }

  public async deleteRoom (
    roomId: string,
  ): Promise<void> {
    if (!this.cacheRoomRawPayload) {
      throw new Error(`${PRE} setRoom() has no cache.`)
    }
    await this.cacheRoomRawPayload.delete(roomId)
  }

  public async getRoomIds (): Promise<string[]> {
    if (!this.cacheRoomRawPayload) {
      throw new Error(`${PRE} getRoomIds() has no cache.`)
    }
    const result: string[] = []
    for await (const key of this.cacheRoomRawPayload.keys()) {
      result.push(key)
    }
    return result
  }

  public async getRoomCount (): Promise<number> {
    if (!this.cacheRoomRawPayload) {
      throw new Error(`${PRE} getRoomCount() has no cache.`)
    }
    return this.cacheRoomRawPayload.size
  }

  public async hasRoom (roomId: string): Promise<boolean> {
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
  public async getRoomMember (
    roomId: string,
  ): Promise<{ [contactId: string]: PadproRoomMemberPayload } | undefined> {
    if (!this.cacheRoomMemberRawPayload) {
      throw new Error(`${PRE} getRoomMember() has no cache.`)
    }
    return this.cacheRoomMemberRawPayload.get(roomId)
  }

  public async setRoomMember (
    roomId: string,
    payload: { [contactId: string]: PadproRoomMemberPayload }
  ): Promise<void> {
    if (!this.cacheRoomMemberRawPayload) {
      throw new Error(`${PRE} setRoomMember() has no cache.`)
    }
    await this.cacheRoomMemberRawPayload.set(roomId, payload)
  }

  public async deleteRoomMember (
    roomId: string,
  ): Promise<void> {
    if (!this.cacheRoomMemberRawPayload) {
      throw new Error(`${PRE} deleteRoomMember() has no cache.`)
    }
    await this.cacheRoomMemberRawPayload.delete(roomId)
  }

  /**
   * -------------------------------
   * Room Invitation Section
   * --------------------------------
   */
  public async getRoomInvitation (
    messageId: string,
  ): Promise<PadproRoomInvitationPayload | undefined> {
    if (!this.cacheRoomInvitationRawPayload) {
      throw new Error(`${PRE} getRoomInvitationRawPayload() has no cache.`)
    }
    return this.cacheRoomInvitationRawPayload.get(messageId)
  }

  public async setRoomInvitation (
    messageId: string,
    payload: PadproRoomInvitationPayload,
  ): Promise<void> {
    if (!this.cacheRoomInvitationRawPayload) {
      throw new Error(`${PRE} setRoomInvitationRawPayload() has no cache.`)
    }
    await this.cacheRoomInvitationRawPayload.set(messageId, payload)
  }

  public async deleteRoomInvitation (
    messageId: string,
  ): Promise<void> {
    if (!this.cacheRoomInvitationRawPayload) {
      throw new Error(`${PRE} deleteRoomInvitation() has no cache.`)
    }
    await this.cacheRoomInvitationRawPayload.delete(messageId)
  }

  /**
   * -------------------------------
   * CDN File Cache Section
   * --------------------------------
   */
  public async getFileCache (
    fileId: string
  ): Promise<FileCache | undefined> {
    if (!this.cacheFile) {
      throw new Error(`${PRE} getFileCache() has no cache.`)
    }

    const fileCache = await this.cacheFile.get(fileId)

    if (!fileCache) {
      return fileCache
    }

    return this.parseJSON(JSON.stringify(fileCache))
  }

  public async setFileCache (
    fileId: string,
    cache: FileCache
  ): Promise<void> {
    if (!this.cacheFile) {
      throw new Error(`${PRE} setFileCache() has no cache.`)
    }
    log.silly(PRE, `setFileCache(${fileId}, ${JSON.stringify(cache)})`)
    await this.cacheFile.set(fileId, cache)
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
        v !== null
        && typeof v === 'object'
        && 'type' in v
        && v.type === 'Buffer'
        && 'data' in v
        && Array.isArray(v.data)
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

    if (this.cacheContactRawPayload
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
      'flash-store-v0.14',
      path.sep,
      token,
      path.sep,
      userId,
    )

    const baseDirExist = await fs.pathExists(baseDir)

    if (!baseDirExist) {
      await fs.mkdirp(baseDir)
    }

    this.cacheContactRawPayload        = new FlashStore(path.join(baseDir, 'contact-raw-payload'))
    this.cacheRoomMemberRawPayload     = new FlashStore(path.join(baseDir, 'room-member-raw-payload'))
    this.cacheRoomRawPayload           = new FlashStore(path.join(baseDir, 'room-raw-payload'))
    this.cacheRoomInvitationRawPayload = new FlashStore(path.join(baseDir, 'room-invitation-raw-payload'))
    this.cacheFile                     = new FlashStore(path.join(baseDir, 'file-cache'))

    // await Promise.all([
    //   this.cacheContactRawPayload.(),
    //   this.cacheRoomMemberRawPayload.ready(),
    //   this.cacheRoomRawPayload.ready(),
    //   this.cacheRoomInvitationRawPayload.ready(),
    //   this.cacheFile.ready(),
    // ])

    const memberCounts: number[] = []
    for await (const value of this.cacheRoomMemberRawPayload.values()) {
      memberCounts.push(Object.keys(value).length)
    }
    const roomMemberTotal = memberCounts.reduce(
      (acc, cur) => acc + cur, 0
    )

    const contactTotal = this.cacheContactRawPayload.size
    const roomTotal = this.cacheRoomRawPayload.size

    log.verbose(PRE, `initCache() inited ${contactTotal} Contacts, ${roomMemberTotal} RoomMembers, ${roomTotal} Rooms, cachedir="${baseDir}"`)
  }

  private async releaseCache () {
    log.verbose(PRE, 'releaseCache()')

    if (this.cacheContactRawPayload
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
        this.cacheFile.close(),
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
