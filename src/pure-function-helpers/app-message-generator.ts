import { UrlLinkPayload, MiniProgramPayload } from 'wechaty-puppet'
import { PadproAppMessagePayload, PadproLocationMessagePayload, WechatAppMessageType } from '../schemas'

export const generateLocationMessage = (payload: PadproLocationMessagePayload): string => {
  return `
<location x="${payload.x || ''}" ` + ` y="${payload.y || ''}" ` + ` scale="${payload.scale || ''}" ` + `
  label="${payload.label || ''}" ` + ` maptype="${payload.mapType || ''}" ` + ` poiname="${payload.poiName || ''}" ` + `
  poiid="${payload.poiId || ''}" ` + ` fromusername="${payload.fromUsername || ''}" />`
}

export const generateAppXMLMessage = ({ title, description, url, thumbnailUrl }: UrlLinkPayload): string => {
  return ''
  + '<appmsg appid="" sdkver="0">'
  + `<title>${title}</title>`
  + `<des>${description}</des>`
  + `<type>${WechatAppMessageType.Url}</type>`
  + `<username></username>`
  + `<action>view</action>`
  + `<type>5</type>`
  + `<showtype>0</showtype>`
  + `<url>${url.replace(/&/g, '&amp;')}</url>`
  + `<contentattr>0</contentattr>`
  + `${thumbnailUrl ? '<thumburl>' + thumbnailUrl.replace(/&/g, '&amp;') + '</thumburl>' : ''}`
  + `</appmsg>`
}

export const generateMiniProgramXMLMessage = (payload: MiniProgramPayload): string => {
  return `
  <appmsg appid="" sdkver="0">
    <title>${payload.title}</title>
    <des>${payload.description}</des>
    <action/>
    <type>33</type>
    <showtype>0</showtype>
    <soundtype>0</soundtype>
    <mediatagname/>
    <messageext/>
    <messageaction/>
    <content/>
    <contentattr>0</contentattr>
    <url>https://mp.weixin.qq.com/mp/waerrpage?appid=${payload.appid}&amp;type=upgrade&amp;upgradetype=3#wechat_redirect</url>
    <lowurl/>
    <dataurl/>
    <lowdataurl/>
    <appattach>
      <totallen>0</totallen>
      <attachid/>
      <emoticonmd5/>
      <fileext/>
      <cdnthumburl></cdnthumburl>
      <cdnthumbmd5></cdnthumbmd5>
      <cdnthumblength></cdnthumblength>
      <cdnthumbwidth></cdnthumbwidth>
      <cdnthumbheight></cdnthumbheight>
      <cdnthumbaeskey></cdnthumbaeskey>
      <aeskey></aeskey>
      <encryver>0</encryver>
      <filekey></filekey>
    </appattach>
    <extinfo/>
    <sourceusername>${payload.username}@app</sourceusername>
    <sourcedisplayname>${payload.description}</sourcedisplayname>
    <thumburl/>
    <md5/>
    <statextstr/>
    <weappinfo>
      <username><![CDATA[${payload.username}@app]]></username>
      <appid><![CDATA[${payload.appid}]]></appid>
      <type>2</type>
      <version></version>
      <weappiconurl><![CDATA[]]></weappiconurl>
      <pagepath><![CDATA[${payload.pagepath}]]></pagepath>
      <shareId><![CDATA[0_${payload.appid}_858901320_1563444358_0]]></shareId>
      <appservicetype>0</appservicetype>
    </weappinfo>
  </appmsg>
  <fromusername></fromusername>
  <scene>0</scene>
  <appinfo>
    <version>1</version>
    <appname/>
  </appinfo>
  <commenturl/>`
}

export const generateAttachmentXMLMessageFromRaw = (payload: PadproAppMessagePayload): string => {
  return `
<appmsg appid="" sdkver="0">
  <title>${payload.title}</title>
  <des></des>
  <username />
  <action>view</action>
  <type>${payload.type}</type>
  <showtype>0</showtype>
  <content />
  <url />
  <lowurl />
  <dataurl />
  <lowdataurl />
  <contentattr>0</contentattr>
  <streamvideo>
    <streamvideourl />
    <streamvideototaltime>0</streamvideototaltime>
    <streamvideotitle />
    <streamvideowording />
    <streamvideoweburl />
    <streamvideothumburl />
    <streamvideoaduxinfo />
    <streamvideopublishid />
  </streamvideo>
  <canvasPageItem>
    <canvasPageXml>
      <![CDATA[]]>
    </canvasPageXml>
  </canvasPageItem>
  <appattach>
    <attachid>${payload.appattach && payload.appattach.attachid}</attachid>
    <cdnattachurl>${payload.appattach && payload.appattach.cdnattachurl}</cdnattachurl>
    <totallen>${payload.appattach && payload.appattach.totallen}</totallen>
    <aeskey>${payload.appattach && payload.appattach.aeskey}</aeskey>
    <encryver>${payload.appattach && payload.appattach.encryver}</encryver>
    <fileext>${payload.appattach && payload.appattach.fileext}</fileext>
    <islargefilemsg>${payload.appattach && payload.appattach.islargefilemsg}</islargefilemsg>
  </appattach>
  <extinfo />
  <thumburl />
  <mediatagname />
  <messageaction>
    <![CDATA[]]>
  </messageaction>
  <messageext>
    <![CDATA[]]>
  </messageext>
  <emoticongift>
    <packageflag>0</packageflag>
    <packageid />
  </emoticongift>
  <emoticonshared>
    <packageflag>0</packageflag>
    <packageid />
  </emoticonshared>
  <designershared>
    <designeruin>0</designeruin>
    <designername>null</designername>
    <designerrediretcturl>null</designerrediretcturl>
  </designershared>
  <emotionpageshared>
    <tid>0</tid>
    <title>null</title>
    <desc>null</desc>
    <iconUrl>null</iconUrl>
    <secondUrl>null</secondUrl>
    <pageType>0</pageType>
  </emotionpageshared>
  <webviewshared>
    <shareUrlOriginal />
    <shareUrlOpen />
    <jsAppId />
    <publisherId />
  </webviewshared>
  <template_id />
  <md5>${payload.md5 || ''}</md5>
  <weappinfo>
    <username />
    <appid />
    <appservicetype>0</appservicetype>
    <videopageinfo>
      <thumbwidth>0</thumbwidth>
      <thumbheight>0</thumbheight>
      <fromopensdk>0</fromopensdk>
    </videopageinfo>
  </weappinfo>
  <statextstr />
  <recorditem>
    <![CDATA[${payload.recorditem || ''}]]>
  </recorditem>
  <websearch>
    <rec_category>0</rec_category>
    <channelId>0</channelId>
  </websearch>
</appmsg>
<fromusername>${payload.fromusername}</fromusername>
<scene>0</scene>
<appinfo>
  <version>1</version>
  <appname></appname>
</appinfo>
<commenturl></commenturl>`
}
