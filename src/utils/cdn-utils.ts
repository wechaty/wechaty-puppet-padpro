import {
  CDNCheckMd5Request,
  CDNCheckMd5Response,
  CDNDownloadDataRequest,
  CDNDownloadDataResponse,
  CDNUploadDataRequest,
  CDNUploadDataResponse,
} from '../schemas'

import { packCdnData, unpackCdnData } from '../pure-function-helpers'

import { log } from '../config'

const PRE = 'CDNUtils'

export const packDownloadRequest = (request: CDNDownloadDataRequest): Buffer => {
  return packCdnData(request)
}

export const unpackDownloadRequest = (buf: Buffer): CDNDownloadDataRequest => {
  const rawReq = unpackCdnData(buf)
  return {
    acceptdupack: parseInt(rawReq.acceptdupack.toString(), 10),
    authkey: rawReq.authkey,
    clientostype: rawReq.clientostype.toString(),
    clientversion: parseInt(rawReq.clientversion.toString(), 10),
    downpicformat: parseInt(rawReq.downpicformat.toString(), 10),
    fileid: rawReq.fileid.toString(),
    filetype: parseInt(rawReq.filetype.toString(), 10),
    ipseq: parseInt(rawReq.ipseq.toString(), 10),
    largesvideo: parseInt(rawReq.largesvideo.toString(), 10),
    lastretcode: parseInt(rawReq.lastretcode.toString(), 10),
    nettype: parseInt(rawReq.nettype.toString(), 10),
    rangeend: parseInt(rawReq.rangeend.toString(), 10),
    rangestart: parseInt(rawReq.rangestart.toString(), 10),
    safeproto: parseInt(rawReq.safeproto.toString(), 10),
    seq: parseInt(rawReq.seq.toString(), 10),
    sourceflag: parseInt(rawReq.sourceflag.toString(), 10),
    ver: parseInt(rawReq.ver.toString(), 10),
    weixinnum: parseInt(rawReq.weixinnum.toString(), 10),
    wxautostart: parseInt(rawReq.wxautostart.toString(), 10),
    wxchattype: parseInt(rawReq.wxchattype.toString(), 10),
    wxmsgflag: rawReq.wxmsgflag.length === 0 ? null : parseInt(rawReq.wxmsgflag.toString(), 10),
  }
}

export const unpackDownloadResponse = (rawResponse: Buffer): CDNDownloadDataResponse => {
  const rawRes = unpackCdnData(rawResponse)
  return {
    'filedata': rawRes.filedata,
    'isgetcdn': parseInt(rawRes.isgetcdn.toString(), 10),
    'isoverload': parseInt(rawRes.isoverload.toString(), 10),
    'isretry': parseInt(rawRes.isretry.toString(), 10),
    'rangeend': parseInt(rawRes.rangeend.toString(), 10),
    'rangestart': parseInt(rawRes.rangestart.toString(), 10),
    'retcode': parseInt(rawRes.retcode.toString(), 10),
    'retrysec': parseInt(rawRes.retrysec.toString(), 10),
    'rsppicformat': parseInt(rawRes.rsppicformat.toString(), 10),
    'seq': parseInt(rawRes.seq.toString(), 10),
    'substituteftype': parseInt(rawRes.substituteftype.toString(), 10),
    'totalsize': parseInt(rawRes.totalsize.toString(), 10),
    'ver': parseInt(rawRes.ver.toString(), 10),
    'x-ClientIp': rawRes['x-ClientIp'].toString(),
  }
}

export const packCheckMd5Request = (request: CDNCheckMd5Request): Buffer => {
  return packCdnData(request)
}

export const unpackCheckMd5Request = (buf: Buffer): CDNCheckMd5Request => {
  const rawReq = unpackCdnData(buf)
  return {
    acceptdupack: parseInt(rawReq.acceptdupack.toString(), 10),
    advideoflag: parseInt(rawReq.advideoflag.toString(), 10),
    authkey: rawReq.authkey,
    clientostype: rawReq.clientostype.toString(),
    clientversion: parseInt(rawReq.clientversion.toString(), 10),
    enablehit: parseInt(rawReq.enablehit.toString(), 10),
    filemd5: rawReq.filemd5.toString(),
    filetype: parseInt(rawReq.filetype.toString(), 10),
    largesvideo: parseInt(rawReq.largesvideo.toString(), 10),
    nettype: parseInt(rawReq.nettype.toString(), 10),
    safeproto: parseInt(rawReq.safeproto.toString(), 10),
    seq: parseInt(rawReq.seq.toString(), 10),
    touser: rawReq.touser.toString(),
    ver: parseInt(rawReq.ver.toString(), 10),
    weixinnum: parseInt(rawReq.weixinnum.toString(), 10),
    wxchattype: parseInt(rawReq.wxchattype.toString(), 10),
  }
}

export const unpackCheckMd5Response = (rawResponse: Buffer): CDNCheckMd5Response => {
  const rawRes = unpackCdnData(rawResponse)

  const result: CDNCheckMd5Response = {
    existflag: parseInt(rawRes.existflag.toString(), 10),
    retcode: parseInt(rawRes.retcode.toString(), 10),
    seq: parseInt(rawRes.seq.toString(), 10),
    ver: parseInt(rawRes.ver.toString(), 10),
  }
  if (rawRes.aeskey) {
    result.aeskey = rawRes.aeskey
  }
  if (rawRes.fileid) {
    result.fileid = rawRes.fileid.toString()
  }
  if (rawRes.midimglen) {
    result.midimglen = parseInt(rawRes.midimglen.toString(), 10)
  }
  if (rawRes.cachesize) {
    result.cachesize = parseInt(rawRes.cachesize.toString(), 10)
  }

  log.silly(PRE, `checkMd5Response - ${JSON.stringify(result)}`)

  return result
}

export const packUploadRequest = (request: CDNUploadDataRequest): Buffer => {
  return packCdnData(request)
}

export const unpackUploadRequest = (buf: Buffer): CDNUploadDataRequest => {
  const rawReq = unpackCdnData(buf)
  return {
    acceptdupack: parseInt(rawReq.acceptdupack.toString(), 10),
    advideoflag: parseInt(rawReq.advideoflag.toString(), 10),
    apptype: parseInt(rawReq.apptype.toString(), 10),
    authkey: rawReq.authkey,
    blockmd5: rawReq.blockmd5.toString(),
    clientostype: rawReq.clientostype.toString(),
    clientversion: parseInt(rawReq.clientversion.toString(), 10),
    compresstype: parseInt(rawReq.compresstype.toString(), 10),
    enablehit: parseInt(rawReq.enablehit.toString(), 10),
    encthumbcrc: parseInt(rawReq.encthumbcrc.toString(), 10),
    existancecheck: parseInt(rawReq.existancecheck.toString(), 10),
    filedata: rawReq.filedata,
    filedatamd5: rawReq.filedatamd5.toString(),
    filekey: rawReq.filekey.toString(),
    filemd5: rawReq.filemd5.toString(),
    filetype: parseInt(rawReq.filetype.toString(), 10),
    hasthumb: parseInt(rawReq.hasthumb.toString(), 10),
    ipseq: parseInt(rawReq.ipseq.toString(), 10),
    largesvideo: parseInt(rawReq.largesvideo.toString(), 10),
    lastretcode: parseInt(rawReq.lastretcode.toString(), 10),
    localname: rawReq.localname.toString(),
    nettype: parseInt(rawReq.nettype.toString(), 10),
    nocheckaeskey: parseInt(rawReq.nocheckaeskey.toString(), 10),
    rangeend: parseInt(rawReq.rangeend.toString(), 10),
    rangestart: parseInt(rawReq.rangestart.toString(), 10),
    rawfilemd5: rawReq.rawfilemd5.toString(),
    rawthumbmd5: rawReq.rawthumbmd5.length === 0 ? null : rawReq.rawthumbmd5.toString(),
    rawthumbsize: parseInt(rawReq.rawthumbsize.toString(), 10),
    rawtotalsize: parseInt(rawReq.rawtotalsize.toString(), 10),
    safeproto: parseInt(rawReq.safeproto.toString(), 10),
    seq: parseInt(rawReq.seq.toString(), 10),
    sourceflag: parseInt(rawReq.sourceflag.toString(), 10),
    thumbtotalsize: parseInt(rawReq.thumbtotalsize.toString(), 10),
    totalsize: parseInt(rawReq.totalsize.toString(), 10),
    touser: rawReq.touser.toString(),
    ver: parseInt(rawReq.ver.toString(), 10),
    weixinnum: parseInt(rawReq.weixinnum.toString(), 10),
    wxchattype: parseInt(rawReq.wxchattype.toString(), 10),
  }
}

export const unpackUploadResponse = (rawResponse: Buffer): CDNUploadDataResponse => {
  const rawRes = unpackCdnData(rawResponse)
  const result: CDNUploadDataResponse = {
    'existflag': rawRes.retrysec && parseInt(rawRes.existflag.toString(), 10),
    'filekey': rawRes.filekey && rawRes.filekey.toString(),
    'isgetcdn': rawRes.isgetcdn && parseInt(rawRes.isgetcdn.toString(), 10),
    'isoverload': rawRes.isoverload && parseInt(rawRes.isoverload.toString(), 10),
    'isretry': rawRes.isretry && parseInt(rawRes.isretry.toString(), 10),
    'rangeend': rawRes.rangeend && parseInt(rawRes.rangeend.toString(), 10),
    'rangestart': rawRes.rangestart && parseInt(rawRes.rangestart.toString(), 10),
    'retcode': rawRes.retcode && parseInt(rawRes.retcode.toString(), 10),
    'retrysec': rawRes.retrysec && parseInt(rawRes.retrysec.toString(), 10),
    'seq': rawRes.seq && parseInt(rawRes.seq.toString(), 10),
    'ver': rawRes.ver && parseInt(rawRes.ver.toString(), 10),
    'x-ClientIp': rawRes['x-ClientIp'] && rawRes['x-ClientIp'].toString(),
  }
  if (rawRes.fileid) {
    result.fileid = rawRes.fileid.toString()
  }

  return result
}
