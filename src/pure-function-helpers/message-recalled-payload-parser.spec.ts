import test from 'blue-tape'
import {
  recalledPayloadParser
} from './message-recalled-payload-parser'

import { PadproMessagePayload } from '../schemas'

const sampleRecallMessage: PadproMessagePayload = {
  content: '<sysmsg type=\"revokemsg\">\n\t<revokemsg>\n\t\t<session>lylezhuifeng</session>\n\t\t<msgid>1062840772</msgid>\n\t\t<newmsgid>6275297999442173836</newmsgid>\n\t\t<replacemsg><![CDATA[\"高原ོ\" 撤回了一条消息]]></replacemsg>\n\t</revokemsg>\n</sysmsg>\n',
  data: null,
  fromUser: 'lylezhuifeng',
  messageId: '1062840773',
  messageSource: '',
  messageType: 10002,
  status: 4,
  timestamp: 1553631714,
  toUser: 'wxid_zovb9ol86m7l22'
}

const sampleRecallMessage2: PadproMessagePayload = {
  content: 'lylezhuifeng:\n<sysmsg type="revokemsg"><revokemsg><session>15291924753@chatroom</session><msgid>1672039011</msgid><newmsgid>183097594359897772</newmsgid><replacemsg><![CDATA["高原ོ" 撤回了一条消息]]></replacemsg></revokemsg></sysmsg>',
  data: null,
  fromUser: '15291924753@chatroom',
  messageId: '1672039012',
  messageSource: '',
  messageType: 10002,
  status: 4,
  timestamp: 1554279858,
  toUser: 'wxid_zovb9ol86m7l22'
}

test('Should parse recall message correctly', async (t) => {
  const payload = await recalledPayloadParser(sampleRecallMessage)
  const expectedResult = {
    session: 'lylezhuifeng',
    msgId: '1062840772',
    newMsgId: '6275297999442173836',
    replaceMsg: '"高原ོ" 撤回了一条消息',
  }

  t.deepEqual(payload, expectedResult)
})

test('Should parse recall message in room correctly', async (t) => {
  const payload = await recalledPayloadParser(sampleRecallMessage2)
  const expectedResult = {
    session: '15291924753@chatroom',
    msgId: '1672039011',
    newMsgId: '183097594359897772',
    replaceMsg: '"高原ོ" 撤回了一条消息',
  }

  t.deepEqual(payload, expectedResult)
})
