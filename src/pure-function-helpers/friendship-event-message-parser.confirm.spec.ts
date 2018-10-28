#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable

import test  from 'blue-tape'

import {
  PadproMessagePayload,
}                             from '../schemas'

import { friendshipConfirmEventMessageParser } from './friendship-event-message-parser'

test('friendshipConfirmEventMessageParser() EN-confirm-by-other', async t => {
  const MESSAGE_PAYLOAD: PadproMessagePayload = {
    content      : `I've accepted your friend request. Now let's chat!`,
    fromUser     : 'wxid_a8d806dzznm822',
    messageId    : '7195763643366256289',
    messageSource: '',
    messageType  : 1,
    status       : 1,
    timestamp    : 1528787010,
    toUser       : 'wxid_5zj4i5htp9ih22',
  }

  const EXPECTED_CONTACT_ID = 'wxid_a8d806dzznm822'

  const contactName = friendshipConfirmEventMessageParser(MESSAGE_PAYLOAD)
  t.equal(contactName, EXPECTED_CONTACT_ID, 'should parse message to contact id')
})

test('friendshipConfirmEventMessageParser() EN-confirm-by-bot', async t => {
  const MESSAGE_PAYLOAD: PadproMessagePayload = {
    content      : 'You have added 李卓桓 as your WeChat contact. Start chatting!',
    fromUser     : 'lizhuohuan',
    messageId    : '4530350877549544428',
    messageSource: '',
    messageType  : 10000,
    status       : 1,
    timestamp    : 1528786605,
    toUser       : 'wxid_5zj4i5htp9ih22',
  }
  const EXPECTED_CONTACT_ID = 'lizhuohuan'

  const contactName = friendshipConfirmEventMessageParser(MESSAGE_PAYLOAD)
  t.equal(contactName, EXPECTED_CONTACT_ID, 'should parse message to contact id')
})

test('friendshipConfirmEventMessageParser() ZH-confirm-by-other', async t => {
  t.skip('tbw')
})

test('friendshipConfirmEventMessageParser() ZH-confirm-by-bot', async t => {
  const MESSAGE_PAYLOAD: PadproMessagePayload = {
    content      : '你已添加了Huan LI++，现在可以开始聊天了。',
    fromUser     : 'wxid_5zj4i5htp9ih22',
    messageId    : '6366033312578557207',
    messageSource: '',
    messageType  : 10000,
    status       : 1,
    timestamp    : 1528787010,
    toUser       : 'wxid_a8d806dzznm822',
  }
  const EXPECTED_CONTACT_ID = 'wxid_5zj4i5htp9ih22'

  const contactName = friendshipConfirmEventMessageParser(MESSAGE_PAYLOAD)
  t.equal(contactName, EXPECTED_CONTACT_ID, 'should parse message to contact id')
})
