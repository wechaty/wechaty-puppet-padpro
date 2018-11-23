import test from 'blue-tape'

import { PadproMessagePayload } from '../schemas'
import { voicePayloadParser } from './message-voice-payload-parser'

const sampleImageMessage: PadproMessagePayload = {
  content      : '<msg><voicemsg endflag=\"1\" length=\"4717\" voicelength=\"2940\" clientmsgid=\"49241db6222faf921440323412e3e046wxid_e2lc33auu61g2294_1542698594\" fromusername=\"lylezhuifeng\" downcount=\"0\" cancelflag=\"0\" voiceformat=\"4\" forwardflag=\"0\" bufid=\"361243502115160428\" /></msg>',
  fromUser     : 'lylezhuifeng',
  messageId    : '1001921437',
  messageSource: '<msgsource />\n',
  messageType  : 34,
  status       : 3,
  timestamp    : 1542698680,
  toUser       : 'wxid_e2lc33auu61g22',
}

test('Should parse emoji message correctly', async (t) => {
  const payload = await voicePayloadParser(sampleImageMessage)
  const expectedResult = {
    bufId: 361243502115160450,
    cancelFlag: 0,
    clientMsgId: '49241db6222faf921440323412e3e046wxid_e2lc33auu61g2294_1542698594',
    downCount: 0,
    endFlag: 1,
    forwardFlag: 0,
    fromUsername: 'lylezhuifeng',
    length: 4717,
    voiceFormat: 4,
    voiceLength: 2940
  }

  t.deepEqual(payload, expectedResult)
})
