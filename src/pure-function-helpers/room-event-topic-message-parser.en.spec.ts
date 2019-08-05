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

test('roomTopicEventMessageParser() EN-other-modify-topic', async t => {
  const MESSAGE_PAYLOAD: PadproMessagePayload = {
    content      : '"李卓桓" changed the group name to "新群名"',
    fromUser     : '5354656522@chatroom',
    messageId    : '1699332376319377977',
    messageSource: '',
    messageType  : 10000,
    status       : 1,
    timestamp    : 1528656400,
    toUser       : 'wxid_5zj4i5htp9ih22',
  }
  const EXPECTED_EVENT: PuppetRoomTopicEvent = {
    changerName : '李卓桓',
    roomId      : '5354656522@chatroom',
    topic       : '新群名',
    timestamp   : 1528656400,
  }

  const event = roomTopicEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})

test('roomTopicEventMessageParser() EN-bot-modify-topic', async t => {
  const MESSAGE_PAYLOAD: PadproMessagePayload = {
    content      : 'You changed the group name to "morning"',
    fromUser     : '5354656522@chatroom',
    messageId    : '2814971487727313057',
    messageSource: '',
    messageType  : 10000,
    status       : 1,
    timestamp    : 1528750817,
    toUser       : 'wxid_5zj4i5htp9ih22',
  }
  const EXPECTED_EVENT: PuppetRoomTopicEvent = {
    changerName : YOU,
    roomId      : '5354656522@chatroom',
    topic       : 'morning',
    timestamp   : 1528750817,
  }

  const event = roomTopicEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(event, EXPECTED_EVENT, 'should parse event')
})
