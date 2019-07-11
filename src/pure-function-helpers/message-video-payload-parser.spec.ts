import test from 'blue-tape'

import { PadproMessagePayload } from '../schemas'
import { videoPayloadParser } from './message-video-payload-parser'

const sampleVideoMessage: PadproMessagePayload = {
  content: '<?xml version="1.0"?>\n<msg>\n\t<videomsg aeskey="c5dc4bd564d4fcf986df91662da79fe5" cdnthumbaeskey="c5dc4bd564d4fcf986df91662da79fe5" cdnvideourl="304d020100044630440201000204d8e50c6e02032f4f560204d27ac2dc02045c258b39041f777869645f7830316a676c6e36396174683232355f313534353936343334340204010400040201000400" cdnthumburl="304d020100044630440201000204d8e50c6e02032f4f560204d27ac2dc02045c258b39041f777869645f7830316a676c6e36396174683232355f313534353936343334340204010400040201000400" length="588978" playlength="8" cdnthumblength="13558" cdnthumbwidth="68" cdnthumbheight="120" fromusername="lylezhuifeng" md5="3ef2c2ffcb53784f8352f0cdb891f851" newmd5="" isad="0" />\n</msg>\n',
  data: null,
  fromUser: 'lylezhuifeng',
  messageId: '1006687798',
  messageSource: '<msgsource />\n',
  messageType: 43,
  status: 3,
  timestamp: 1545964345,
  toUser: 'wxid_x01jgln69ath22',
}

test('Should parse emoji message correctly', async (t) => {
  const payload = await videoPayloadParser(sampleVideoMessage)
  const expectedResult = {
    aesKey: 'c5dc4bd564d4fcf986df91662da79fe5',
    cdnThumbAesKey: 'c5dc4bd564d4fcf986df91662da79fe5',
    cdnThumbHeight: 120,
    cdnThumbLength: 13558,
    cdnThumbUrl: '304d020100044630440201000204d8e50c6e02032f4f560204d27ac2dc02045c258b39041f777869645f7830316a676c6e36396174683232355f313534353936343334340204010400040201000400',
    cdnThumbWidth: 68,
    cdnVideoUrl: '304d020100044630440201000204d8e50c6e02032f4f560204d27ac2dc02045c258b39041f777869645f7830316a676c6e36396174683232355f313534353936343334340204010400040201000400',
    fromUsername: 'lylezhuifeng',
    isAd: false,
    length: 588978,
    md5: '3ef2c2ffcb53784f8352f0cdb891f851',
    newMd5: '',
    playLength: 8,
  }

  t.deepEqual(payload, expectedResult)
})
