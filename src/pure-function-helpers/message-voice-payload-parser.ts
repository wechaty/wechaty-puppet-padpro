import { GrpcVoiceFormat, PadproMessagePayload, PadproVoiceMessagePayload } from '../schemas'
import { isPayload } from './is-type'
import { xmlToJson } from './xml-to-json'

export async function voicePayloadParser (rawPayload: PadproMessagePayload): Promise<PadproVoiceMessagePayload | null> {
  if (!isPayload(rawPayload)) {
    return null
  }

  const { content } = rawPayload
  // {
  //   "msg": {
  //     "voicemsg": {
  //       "$": {
  //         "endflag": "1",
  //         "length": "102775",
  //         "voicelength": "59520",
  //         "clientmsgid": "49241db6222faf921440323412e3e046wxid_e2lc33auu61g2296_1542698621",
  //         "fromusername": "lylezhuifeng",
  //         "downcount": "0",
  //         "cancelflag": "0",
  //         "voiceformat": "4",
  //         "forwardflag": "0",
  //         "bufid": "7278996868784324976"
  //       }
  //     }
  //   }
  // }
  interface XmlSchema {
    msg: {
      voicemsg: {
        $: {
          endflag: string,
          length: string,
          voicelength: string,
          clientmsgid: string,
          fromusername: string,
          downcount: string,
          cancelflag: string,
          voiceformat: string,
          forwardflag: string,
          bufid: string,
        }
      }
    }
  }

  const tryXmlText = content.replace(/^[^\n]+\n/, '')

  try {
    const jsonPayload: XmlSchema = await xmlToJson(tryXmlText)
    console.log(JSON.stringify(jsonPayload))
    const data = jsonPayload.msg.voicemsg.$
    const result: PadproVoiceMessagePayload = {
      bufId: parseInt(data.bufid, 10),
      cancelFlag: parseInt(data.cancelflag, 10),
      clientMsgId: data.clientmsgid,
      downCount: parseInt(data.downcount, 10),
      endFlag: parseInt(data.endflag, 10),
      forwardFlag: parseInt(data.forwardflag, 10),
      fromUsername: data.fromusername,
      length: parseInt(data.length, 10),
      voiceFormat: parseInt(data.voiceformat, 10) as GrpcVoiceFormat,
      voiceLength: parseInt(data.voicelength, 10),
    }

    return result
  } catch (e) {
    console.error(e)
    return null
  }
}
