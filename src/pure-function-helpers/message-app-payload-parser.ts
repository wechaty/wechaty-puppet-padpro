import { xmlToJson } from './xml-to-json'

import {
  PadproAppAttachPayload,
  PadproAppMessagePayload,
  PadproMessagePayload,
}                       from '../schemas'

import { log } from '../config'

import { isPayload } from './is-type'

export async function appMessageParser (rawPayload: PadproMessagePayload): Promise<PadproAppMessagePayload | null> {
  if (!isPayload(rawPayload)) {
    return null
  }

  const { content } = rawPayload

  interface XmlSchema {
    msg: {
      appmsg: {
        $: {
          appid: string,
          sdkver: string,
        },
        title: string,
        des: string,
        type: string,
        url: string,
        appattach: {
          totallen: string,
          attachid: string,
          emoticonmd5: string,
          fileext: string,
          cdnattachurl: string,
          cdnthumburl: string,
          cdnthumbmd5: string,
          cdnthumblength: string,
          cdnthumbwidth: string,
          cdnthumbheight: string,
          cdnthumbaeskey: string,
          aeskey: string,
          encryver: string,
          islargefilemsg: string,
          // filekey: string,
        },
        statextstr: string,
        thumburl: string,
        md5: any,
        recorditem?: string,
        weappinfo?: {
          username: string,
          appid: string,
          pagepath: string,
          version: string,
          weappiconurl: string,
          pkginfo?: {
            type: string,
            md5: string,
          },
        },
      },
      fromusername: string,
      appinfo: {
        appname: string,
        version: string,
      }
    }
  }

  const tryXmlText = content.replace(/^[^\n]+\n/, '')

  try {
    const jsonPayload: XmlSchema = await xmlToJson(tryXmlText)

    const { appinfo } = jsonPayload.msg;
    const { title, des, url, thumburl, type, md5, recorditem, weappinfo } = jsonPayload.msg.appmsg
    let appattach: PadproAppAttachPayload | undefined
    const tmp = jsonPayload.msg.appmsg.appattach
    if (tmp) {
      appattach = {
        aeskey        : tmp.aeskey,
        attachid      : tmp.attachid,
        cdnattachurl  : tmp.cdnattachurl,
        cdnthumburl   : tmp.cdnthumburl,
        cdnthumbmd5   : tmp.cdnthumbmd5,
        cdnthumblength: tmp.cdnthumblength,
        cdnthumbwidth : tmp.cdnthumbwidth,
        cdnthumbheight: tmp.cdnthumbheight,
        cdnthumbaeskey: tmp.cdnthumbaeskey,
        emoticonmd5   : tmp.emoticonmd5,
        encryver      : parseInt(tmp.encryver, 10),
        fileext       : tmp.fileext,
        totallen      : parseInt(tmp.totallen, 10),
        islargefilemsg: parseInt(tmp.islargefilemsg, 10),
      }
    }
    return {
      $appid: jsonPayload.msg.appmsg.$.appid,
      title,
      des,
      url,
      thumburl,
      md5,
      type: parseInt(type, 10),
      appattach,
      recorditem,
      weappinfo,
      appinfo,
    }
  } catch (e) {
    log.verbose(e.stack)
    return null
  }
}
