import test from 'blue-tape'
import { imagePayloadParser } from './message-image-payload-parser'

import { PadproMessagePayload } from '../schemas'

const sampleImageMessage: PadproMessagePayload = {
  content      : '<?xml version="1.0"?>\n<msg>\n\t<img aeskey="cba5766c0515a49a5a0f9d988d1d8a79" encryver="1" cdnthumbaeskey="cba5766c0515a49a5a0f9d988d1d8a79" cdnthumburl="304e020100044730450201000204d8e50c6e02033d0af80204b830feb602045bf3b3df0420777869645f65326c633333617575363167323238385f313534323639373934390204010400010201000400" cdnthumblength="24131" cdnthumbheight="120" cdnthumbwidth="90" cdnmidheight="0" cdnmidwidth="0" cdnhdheight="0" cdnhdwidth="0" cdnmidimgurl="304e020100044730450201000204d8e50c6e02033d0af80204b830feb602045bf3b3df0420777869645f65326c633333617575363167323238385f313534323639373934390204010400010201000400" length="497863" cdnbigimgurl="304e020100044730450201000204d8e50c6e02033d0af80204b830feb602045bf3b3df0420777869645f65326c633333617575363167323238385f313534323639373934390204010400010201000400" hdlength="2729348" md5="d908713540f845d517f11cdf60def4a3" />\n</msg>\n',
  fromUser     : 'lylezhuifeng',
  messageId    : '1001921446',
  messageSource: '<msgsource>\n\t<img_file_name>DSCN1099.JPG</img_file_name>\n</msgsource>\n',
  messageType  : 3,
  status       : 3,
  timestamp    : 1542700123,
  toUser       : 'wxid_e2lc33auu61g22',
}

test('Should parse image message correctly', async (t) => {
  const payload = await imagePayloadParser(sampleImageMessage)
  const expectedResult = {
    aesKey: 'cba5766c0515a49a5a0f9d988d1d8a79',
    cdnBigImgUrl: '304e020100044730450201000204d8e50c6e02033d0af80204b830feb602045bf3b3df0420777869645f65326c633333617575363167323238385f313534323639373934390204010400010201000400',
    cdnHdHeight: 0,
    cdnHdWidth: 0,
    cdnMidHeight: 0,
    cdnMidImgUrl: '304e020100044730450201000204d8e50c6e02033d0af80204b830feb602045bf3b3df0420777869645f65326c633333617575363167323238385f313534323639373934390204010400010201000400',
    cdnMidWidth: 0,
    cdnThumbAesKey: 'cba5766c0515a49a5a0f9d988d1d8a79',
    cdnThumbHeight: 120,
    cdnThumbLength: 24131,
    cdnThumbUrl: '304e020100044730450201000204d8e50c6e02033d0af80204b830feb602045bf3b3df0420777869645f65326c633333617575363167323238385f313534323639373934390204010400010201000400',
    cdnThumbWidth: 90,
    encryVer: 1,
    hdLength: 2729348,
    length: 497863,
    md5: 'd908713540f845d517f11cdf60def4a3',
  }

  t.deepEqual(expectedResult, payload)
})
