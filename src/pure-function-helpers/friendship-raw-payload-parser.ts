import { xmlToJson } from './xml-to-json'

import { FriendshipType } from 'wechaty-puppet'

import {
  FriendshipPayload,
  FriendshipPayloadConfirm,
  FriendshipPayloadReceive,
  FriendshipPayloadVerify,
  PadproFriendshipPayload,
  PadproMessagePayload,
}                                 from '../schemas'

import {
  friendshipConfirmEventMessageParser,
  friendshipReceiveEventMessageParser,
  friendshipVerifyEventMessageParser,
}                                         from './friendship-event-message-parser'

export async function friendshipRawPayloadParser (
  rawPayload: PadproMessagePayload,
) : Promise<FriendshipPayload> {

  if (friendshipConfirmEventMessageParser(rawPayload)) {
    /**
     * 1. Confirm Event
     */
    return friendshipRawPayloadParserConfirm(rawPayload)

  } else if (friendshipVerifyEventMessageParser(rawPayload)) {
    /**
     * 2. Verify Event
     */
    return friendshipRawPayloadParserVerify(rawPayload)

  } else if (await friendshipReceiveEventMessageParser(rawPayload)) {
    /**
     * 3. Receive Event
     */
    return friendshipRawPayloadParserReceive(rawPayload)

  } else {
    throw new Error('event type is neither confirm nor verify, and not receive')
  }
}

async function friendshipRawPayloadParserConfirm (
  rawPayload: PadproMessagePayload,
): Promise<FriendshipPayload> {
  const payload: FriendshipPayloadConfirm = {
    contactId : rawPayload.fromUser,
    id        : rawPayload.messageId,
    type      : FriendshipType.Confirm,
    timestamp : rawPayload.timestamp,
  }
  return payload
}

function friendshipRawPayloadParserVerify (
  rawPayload: PadproMessagePayload,
): FriendshipPayload {
  const payload: FriendshipPayloadVerify = {
    contactId : rawPayload.fromUser,
    id        : rawPayload.messageId,
    type      : FriendshipType.Verify,
    timestamp : rawPayload.timestamp,
  }
  return payload
}

async function friendshipRawPayloadParserReceive (
  rawPayload: PadproMessagePayload,
) {
  const tryXmlText = rawPayload.content

  interface XmlSchema {
    msg?: {
      $: PadproFriendshipPayload,
    },
  }

  const jsonPayload: XmlSchema = await xmlToJson(tryXmlText) // , { object: true })

  if (!jsonPayload.msg) {
    throw new Error('no msg found')
  }
  const padchatFriendshipPayload: PadproFriendshipPayload = jsonPayload.msg.$

  const friendshipPayload: FriendshipPayloadReceive = {
    contactId : padchatFriendshipPayload.fromusername,
    hello     : padchatFriendshipPayload.content,
    id        : rawPayload.messageId,
    stranger  : padchatFriendshipPayload.encryptusername,
    ticket    : padchatFriendshipPayload.ticket,
    type      : FriendshipType.Receive,
    timestamp : rawPayload.timestamp,
  }

  return friendshipPayload
}
