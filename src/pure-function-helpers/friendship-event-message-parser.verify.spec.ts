#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable

import test  from 'blue-tape'

import {
  PadproMessagePayload,
}                             from '../schemas'

import { friendshipVerifyEventMessageParser } from './friendship-event-message-parser'

test('friendshipVerifyEventMessageParser() EN', async t => {
  const MESSAGE_PAYLOAD: PadproMessagePayload = {
    content      : '李 卓 桓, .。, 。。 has enabled Friend Confirmation. <a href = "weixin: //findfriend/verifycontact">[Send a friend request]</a> to chat.',
    fromUser     : 'wxid_a8d806dzznm822',
    messageId    : '7907886189720444151',
    messageSource: '',
    messageType  : 10000,
    status       : 1,
    timestamp    : 1528786812,
    toUser       : 'wxid_5zj4i5htp9ih22',
  }

  const EXPECTED_CONTACT_ID = 'wxid_a8d806dzznm822'

  const contactId = friendshipVerifyEventMessageParser(MESSAGE_PAYLOAD)
  t.equal(contactId, EXPECTED_CONTACT_ID, 'should parse verify message to contact id')
})

test('friendshipVerifyEventMessageParser() ZH', async t => {
  const MESSAGE_PAYLOAD: PadproMessagePayload = {
    content      : 'Huan LI++开启了朋友验证，你还不是他（她）朋友。请先发送朋友验证请求，对方验证通过后，才能聊天。<a href = "weixin: //findfriend/verifycontact">发送朋友验证</a>',
    fromUser     : 'wxid_5zj4i5htp9ih22',
    messageId    : '887915103217822928',
    messageSource: '',
    messageType  : 10000,
    status       : 1,
    timestamp    : 1528787403,
    toUser       : 'wxid_a8d806dzznm822',
  }

  const EXPECTED_CONTACT_ID = 'wxid_5zj4i5htp9ih22'

  const contactId = friendshipVerifyEventMessageParser(MESSAGE_PAYLOAD)
  t.equal(contactId, EXPECTED_CONTACT_ID, 'should parse verify message to contact id')
})
