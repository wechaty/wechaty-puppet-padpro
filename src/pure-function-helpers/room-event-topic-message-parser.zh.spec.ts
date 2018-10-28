#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable

import test  from 'blue-tape'

import {
  PuppetRoomTopicEvent,
  YOU,
}                               from 'wechaty-puppet'

import {
  PadproMessagePayload,
}                               from '../schemas'

import { roomTopicEventMessageParser }  from './room-event-topic-message-parser'

test('roomTopicEventMessageParser() ZH-bot-modify-topic', async t => {
  const PADCHAT_MESSAGE_PAYLOAD_ROOM_TOPIC: PadproMessagePayload = {
    content      : '你修改群名为“新群名”',
    fromUser     : '5354656522@chatroom',
    messageId    : '778872444829065792',
    messageSource: '',
    messageType  : 10000,
    status       : 1,
    timestamp    : 1528657193,
    toUser       : 'lizhuohuan',
  }

  const EXPECTED_MESSAGE_PAYLOAD_ROOM_TOPIC: PuppetRoomTopicEvent = {
    changerName : YOU,
    roomId      : '5354656522@chatroom',
    topic       : '新群名',
  }

  const payload = roomTopicEventMessageParser(PADCHAT_MESSAGE_PAYLOAD_ROOM_TOPIC)
  // console.log('payload:', payload)
  t.deepEqual(payload, EXPECTED_MESSAGE_PAYLOAD_ROOM_TOPIC, 'should parse room topic message payload')
})

test('roomTopicEventMessageParser() ZH-other-modify-topic', async t => {
  const MESSAGE_PAYLOAD: PadproMessagePayload = {
    content      : '"李卓桓"修改群名为“新群名”',
    fromUser     : '5354656522@chatroom',
    messageId    : '4311778109694299650',
    messageSource: '',
    messageType  : 10000,
    status       : 1,
    timestamp    : 1528656552,
    toUser       : 'wxid_a8d806dzznm822',
  }

  const EXPECTED_MESSAGE_PAYLOAD_ROOM_TOPIC: PuppetRoomTopicEvent = {
    changerName : '李卓桓',
    roomId      : '5354656522@chatroom',
    topic       : '新群名',
  }

  const event = roomTopicEventMessageParser(MESSAGE_PAYLOAD)
  // console.log('payload:', payload)
  t.deepEqual(event, EXPECTED_MESSAGE_PAYLOAD_ROOM_TOPIC, 'should parse room topic message payload')
})
