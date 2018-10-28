#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable

import test  from 'blue-tape'

import {
  PuppetRoomLeaveEvent,
  YOU,
}                               from 'wechaty-puppet'

import {
  PadproMessagePayload,
}                                 from '../schemas'

import { roomLeaveEventMessageParser }  from './room-event-leave-message-parser'

test('roomLeaveEventMessageParser() EN-bot-delete-other', async t => {
  const MESSAGE_PAYLOAD: PadproMessagePayload = {
    content      : 'You removed "李卓桓" from the group chat',
    fromUser     : '6061139518@chatroom',
    messageId    : '4444372134867544747',
    messageSource: '',
    messageType  : 10000,
    status       : 1,
    timestamp    : 1528751382,
    toUser       : 'wxid_5zj4i5htp9ih22',
  }
  const EXPECTED_EVENT: PuppetRoomLeaveEvent = {
    leaverNameList : ['李卓桓'],
    removerName    : YOU,
    roomId         : '6061139518@chatroom',
  }

  const payload = roomLeaveEventMessageParser(MESSAGE_PAYLOAD)
  // console.log('payload:', payload)
  t.deepEqual(payload, EXPECTED_EVENT, 'should parse room leave message payload')

})

test('roomLeaveEventMessageParser() EN-bot-delete-others', async t => {
  t.skip('the same as bot-delete-other')
})

test('roomLeaveEventMessageParser() EN-other-delete-bot', async t => {
  const MESSAGE_PAYLOAD: PadproMessagePayload = {
    content      : 'You were removed from the group chat by "李卓桓"',
    fromUser     : '3453262102@chatroom',
    messageId    : '2074127648966014259',
    messageSource: '',
    messageType  : 10000,
    status       : 1,
    timestamp    : 1528653673,
    toUser       : 'wxid_5zj4i5htp9ih22',
  }
  const EXPECTED_EVENT: PuppetRoomLeaveEvent = {
    leaverNameList : [YOU],
    removerName    : '李卓桓',
    roomId         : '3453262102@chatroom',
  }

  const roomLeaveEvent = roomLeaveEventMessageParser(MESSAGE_PAYLOAD)
  t.deepEqual(roomLeaveEvent, EXPECTED_EVENT, 'should parse event')
})

test('roomLeaveEventMessageParser() EN-other-delete-other', async t => {
  t.skip('can not detect')
})

test('roomLeaveEventMessageParser() EN-other-delete-others', async t => {
  t.skip('can not detect')
})
