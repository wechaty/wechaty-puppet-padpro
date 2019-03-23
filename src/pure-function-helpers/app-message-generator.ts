import { UrlLinkPayload } from 'wechaty-puppet'
import { PadproAppMessagePayload, WechatAppMessageType, PadproLocationMessagePayload } from '../schemas'

export const generateLocationMessage = (payload: PadproLocationMessagePayload): string => {
  return `<location x="${payload.x || ''}"` +
                  ` y="${payload.y || ''}"` +
                  ` scale="${payload.scale || ''}"` +
                  ` label="${payload.label || ''}"` +
                  ` maptype="${payload.mapType || ''}"` +
                  ` poiname="${payload.poiName || ''}"` +
                  ` poiid="${payload.poiId || ''}"` +
                  ` fromusername="${payload.fromUsername || ''}" />`
}

export const generateAppXMLMessage = ({ title, description, url, thumbnailUrl }: UrlLinkPayload): string => {
  return '' +
    '<appmsg appid="" sdkver="0">' +
      `<title>${title}</title>` +
      `<des>${description}</des>` +
      `<type>${WechatAppMessageType.Url}</type>` +
      `<username></username>` +
      `<action>view</action>` +
      `<type>5</type>` +
      `<showtype>0</showtype>` +
      `<url>${url.replace(/&/g, '&amp;')}</url>` +
      `<contentattr>0</contentattr>` +
      `${thumbnailUrl ? '<thumburl>' + thumbnailUrl.replace(/&/g, '&amp;') + '</thumburl>' : ''}` +
    `</appmsg>`
}

export const generateAttachmentXMLMessageFromRaw = (payload: PadproAppMessagePayload): string => {
  return `
	<appmsg appid="${payload.$appid}" sdkver="0">
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
			<canvasPageXml><![CDATA[]]></canvasPageXml>
		</canvasPageItem>
		<appattach>
			<attachid>${payload.appattach && payload.appattach.attachid}</attachid>
			<cdnattachurl>${payload.appattach && payload.appattach.cdnattachurl}</cdnattachurl>
			<cdnthumburl>${payload.appattach && payload.appattach.cdnthumburl}</cdnthumburl>
			<cdnthumblength>${payload.appattach && payload.appattach.cdnthumblength}</cdnthumblength>
			<cdnthumbwidth>${payload.appattach && payload.appattach.cdnthumbwidth}</cdnthumbwidth>
			<cdnthumbheight>${payload.appattach && payload.appattach.cdnthumbheight}</cdnthumbheight>
			<cdnthumbaeskey>${payload.appattach && payload.appattach.cdnthumbaeskey}</cdnthumbaeskey>
			<totallen>${payload.appattach && payload.appattach.totallen}</totallen>
			<aeskey>${payload.appattach && payload.appattach.aeskey}</aeskey>
			<encryver>${payload.appattach && payload.appattach.encryver}</encryver>
			<fileext>${payload.appattach && payload.appattach.fileext}</fileext>
			<islargefilemsg>${payload.appattach && payload.appattach.islargefilemsg}</islargefilemsg>
		</appattach>
		<extinfo />
		<thumburl />
		<mediatagname />
		<messageaction><![CDATA[]]></messageaction>
		<messageext><![CDATA[]]></messageext>
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
			<username><![CDATA[${payload.weappinfo && payload.weappinfo.username}]]</username>
			<appid><![CDATA[${payload.weappinfo && payload.weappinfo.appid}]]</appid>
			<pagepath><![CDATA[${payload.weappinfo && payload.weappinfo.pagepath}]]</pagepath>
			<version>${payload.weappinfo && payload.weappinfo.version}</version>
			<weappiconurl><![CDATA[${payload.weappinfo && payload.weappinfo.weappiconurl}]]</weappiconurl>
			<appservicetype>0</appservicetype>
			<pkginfo>
				<type>${payload.weappinfo && payload.weappinfo.pkginfo && payload.weappinfo.pkginfo.type}</type>
				<md5><![CDATA[${payload.weappinfo && payload.weappinfo.pkginfo && payload.weappinfo.pkginfo.md5}]]></md5>
			</pkginfo>
			<videopageinfo>
				<thumbwidth>0</thumbwidth>
				<thumbheight>0</thumbheight>
				<fromopensdk>0</fromopensdk>
			</videopageinfo>
		</weappinfo>
    <statextstr />
    <recorditem><![CDATA[${payload.recorditem || ''}]]></recorditem>
		<websearch>
			<rec_category>0</rec_category>
			<channelId>0</channelId>
		</websearch>
	</appmsg>
	<fromusername>${payload.fromusername}</fromusername>
	<scene>0</scene>
	<appinfo>
		<version>${payload.appinfo && payload.appinfo.version || '1'}</version>
		<appname>${payload.appinfo && payload.appinfo.appname}</appname>
	</appinfo>
	<commenturl></commenturl>`
}
