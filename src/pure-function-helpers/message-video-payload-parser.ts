import { PadproMessagePayload, PadproVideoMessagePayload } from '../schemas'
import { isPayload } from './is-type'
import { xmlToJson } from './xml-to-json'

export async function videoPayloadParser (
  rawPayload: PadproMessagePayload,
): Promise<PadproVideoMessagePayload | null> {
  if (!isPayload(rawPayload)) {
    return null
  }

  const { content } = rawPayload
  // {
  //   "msg": {
  //     "videomsg": {
  //       "$": {
  //         "aeskey": "c5dc4bd564d4fcf986df91662da79fe5",
  //         "cdnthumbaeskey": "c5dc4bd564d4fcf986df91662da79fe5",
  //         "cdnvideourl": "304d020100044630440201000204d8e50c6e02032f4f560204d27ac2dc02045c258b39041f777869645f7830316a676c6e36396174683232355f313534353936343334340204010400040201000400",
  //         "cdnthumburl": "304d020100044630440201000204d8e50c6e02032f4f560204d27ac2dc02045c258b39041f777869645f7830316a676c6e36396174683232355f313534353936343334340204010400040201000400",
  //         "length": "588978",
  //         "playlength": "8",
  //         "cdnthumblength": "13558",
  //         "cdnthumbwidth": "68",
  //         "cdnthumbheight": "120",
  //         "fromusername": "lylezhuifeng",
  //         "md5": "3ef2c2ffcb53784f8352f0cdb891f851",
  //         "newmd5": "",
  //         "isad": "0"
  //       }
  //     }
  //   }
  // }
  interface XmlSchema {
    msg: {
      videomsg: {
        $: {
          aeskey: string,
          cdnthumbaeskey: string,
          cdnvideourl: string,
          cdnthumburl: string,
          length: string,
          playlength: string,
          cdnthumblength: string,
          cdnthumbwidth: string,
          cdnthumbheight: string,
          fromusername: string,
          md5: string,
          newmd5: string,
          isad: string,
        }
      }
    }
  }

  const tryXmlText = content.replace(/^[^\n]+\n/, '')

  try {
    const jsonPayload: XmlSchema = await xmlToJson(tryXmlText)
    const data = jsonPayload.msg.videomsg.$
    const result: PadproVideoMessagePayload = {
      aesKey: data.aeskey,
      cdnThumbAesKey: data.cdnthumbaeskey,
      cdnVideoUrl: data.cdnvideourl,
      cdnThumbUrl: data.cdnthumburl,
      length: parseInt(data.length, 10),
      playLength: parseInt(data.playlength, 10),
      cdnThumbLength: parseInt(data.cdnthumblength, 10),
      cdnThumbWidth: parseInt(data.cdnthumbwidth, 10),
      cdnThumbHeight: parseInt(data.cdnthumbheight, 10),
      fromUsername: data.fromusername,
      md5: data.md5,
      newMd5: data.newmd5,
      isAd: data.isad === '1',
    }

    return result
  } catch (e) {
    console.error(e)
    return null
  }
}
