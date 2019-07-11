#!/usr/bin/env ts-node

/**
 * Water mark html page
 * https://www.cnblogs.com/daixinyu/p/6715398.html
 */
import fs   from 'fs-extra'
import path from 'path'

import { FlashStoreSync } from 'flash-store'

import {
  PadproContactPayload,
  PadproRoomMemberPayload,
  PadproRoomPayload,
}                             from '../src/schemas'

import {
  log,
}          from '../src/config'

let cacheContactRawPayload    : FlashStoreSync<string, PadproContactPayload>
let cacheRoomRawPayload       : FlashStoreSync<string, PadproRoomPayload>
let cacheRoomMemberRawPayload : FlashStoreSync<string, {
  [contactId: string]: PadproRoomMemberPayload,
}>

async function main () {
  const workdir = process.env.STORE_HOME
  if (!workdir) {
    log.info('Dumper', 'main() Usage: `STORE_HOME=xxx dumper.ts')
    throw new Error('STORE_HOME env var not set')
  }

  if (!await fs.pathExists(workdir)) {
    throw new Error('path not exist: ' + workdir)
  }

  cacheContactRawPayload    = new FlashStoreSync(path.join(workdir, 'contact-raw-payload'))
  cacheRoomRawPayload       = new FlashStoreSync(path.join(workdir, 'room-raw-payload'))
  cacheRoomMemberRawPayload = new FlashStoreSync(path.join(workdir, 'room-member-raw-payload'))

  await Promise.all([
    cacheContactRawPayload.ready(),
    cacheRoomRawPayload.ready(),
    cacheRoomMemberRawPayload.ready(),
  ])

  const roomMemberTotalNum = [...cacheRoomMemberRawPayload.values()].reduce(
    (accuVal, currVal) => {
      return accuVal + Object.keys(currVal).length
    },
    0,
  )

  log.warn('Dumper', 'main() Store status: contact: %d, room: %d, room members: %d',
    cacheContactRawPayload.size,
    cacheRoomRawPayload.size,
    roomMemberTotalNum,
  )

  dumpHtml()

}

function dumpHtml () {
  // dumpRooms()
  dumpRoomMembers()
  // dumpContacts()
}

/**
 * Cotnacts
 */
export function dumpContacts () {
  // let n = 0

  for (const payload of cacheContactRawPayload.values()) {
    if (!payload.userName) {
      continue
    }
  }
}

/**
 * Rooms
 */
export function dumpRooms () {
  // let n = 0

  for (const payload of cacheRoomRawPayload.values()) {
    if (!payload.chatroomId) {
      continue
    }
  }
}

/**
 * Room Members
 */
export function dumpRoomMembers () {
  // let n = 0

  for (const [roomid, memberDictPayload] of cacheRoomMemberRawPayload) {
    const roomPayload = cacheRoomRawPayload.get(roomid)
    if (!roomPayload) {
      continue
    }

    for (const memberWxid of Object.keys(memberDictPayload)) {
      const memberPayload = memberDictPayload[memberWxid]

      if (!memberPayload.contactId) {
        continue
      }
    }
  }
}

main()
  .catch(console.error)
