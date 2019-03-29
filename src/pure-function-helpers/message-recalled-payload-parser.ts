import { PadproMessagePayload, PadproRecalledMessagePayload } from '../schemas'
import { isPayload } from './is-type'
import { xmlToJson } from './xml-to-json'

export async function recalledPayloadParser (
  rawPayload: PadproMessagePayload
): Promise<PadproRecalledMessagePayload | null> {
  if (!isPayload(rawPayload)) {
    return null
  }

  const { content } = rawPayload
  // {
  //   revokemsg: {
  //     session: 'lylezhuifeng',
  //     msgid: '1062840772',
  //     newmsgid: '6275297999442173836',
  //     replacemsg: '"高原ོ" 撤回了一条消息'
  //   }
  // }

  interface XmlSchema {
    revokemsg: {
      session: string,
      msgid: string,
      newmsgid: string,
      replacemsg: string,
    }
  }

  const tryXmlText = content.replace(/^[^\n]+\n/, '')

  try {
    const jsonPayload: XmlSchema = await xmlToJson(tryXmlText)
    const result: PadproRecalledMessagePayload = {
      session: jsonPayload.revokemsg.session,
      msgId: jsonPayload.revokemsg.msgid,
      newMsgId: jsonPayload.revokemsg.newmsgid,
      replaceMsg: jsonPayload.revokemsg.replacemsg,
    }

    return result
  } catch (e) {
    return null
  }
}
