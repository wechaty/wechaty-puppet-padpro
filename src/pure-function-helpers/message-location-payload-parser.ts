import { PadproLocationMessagePayload, PadproMessagePayload } from '../schemas'
import { isPayload } from './is-type'
import { xmlToJson } from './xml-to-json'

export async function locationPayloadParser (rawPayload: PadproMessagePayload): Promise<PadproLocationMessagePayload | null> {
  if (!isPayload(rawPayload)) {
    return null
  }

  const { content } = rawPayload

  // TODO: put the json payload here in comments

  interface XmlSchema {
    msg: {
      location: {
        $: {
          x: string,
          y: string,
          scale: string,
          label: string,
          maptype: string,
          poiname: string,
          poiid: string,
          fromusername: string,
        }
      }
    }
  }

  const tryXmlText = content.replace(/^[^\n]+\n/, '')

  try {
    const jsonPayload: XmlSchema = await xmlToJson(tryXmlText)

    const data = jsonPayload.msg.location.$
    const result: PadproLocationMessagePayload = {
      x: parseFloat(data.x),
      y: parseFloat(data.y),
      scale: parseInt(data.scale, 10),
      label: data.label,
      mapType: data.maptype,
      poiName: data.poiname,
      poiId: data.poiid,
      fromUsername: data.fromusername,
    }

    return result
  } catch (e) {
    console.error(e)
    return null
  }
}
