#!/usr/bin/env ts-node

// tslint:disable:max-line-length
// tslint:disable:no-shadowed-variable

import test  from 'blue-tape'

import {
  ContactGender,
  ContactPayload,
  ContactType,
}                       from 'wechaty-puppet'

import {
  PadproContactPayload,
}                             from '../schemas'

import { contactRawPayloadParser } from './contact-raw-payload-parser'

test('contactRawPayloadParser', async t => {
  const PADCHAT_CONTACT_PAYLOAD_PERSONAL: PadproContactPayload = {
    bigHeadUrl  : 'http://wx.qlogo.cn/mmhead/ver_1/xfCMmibHH74xGLoyeDFJadrZXX3eOEznPefiaCa3iczxZGMwPtDuSbRQKx3Xdm18un303mf0NFia3USY2nO2VEYILw/0',
    city        : 'Haidian',
    contactType : ContactType.Personal,
    country     : 'CN',
    labelLists  : '1',
    nickName    : '梦君君',
    province    : 'Beijing',
    remark      : '女儿',
    sex         : ContactGender.Female,
    signature   : 'Stay+Foolish',
    smallHeadUrl: 'http: //wx.qlogo.cn/mmhead/ver_1/xfCMmibHH74xGLoyeDFJadrZXX3eOEznPefiaCa3iczxZGMwPtDuSbRQKx3Xdm18un303mf0NFia3USY2nO2VEYILw/132',
    stranger    : 'v1_0468f2cd3f0efe7ca2589d57c3f9ba952a3789e41b6e78ee00ed53d1e6096b88@stranger',
    ticket      : '',
    userName    : 'mengjunjun001',
  }

  const PADCHAT_CONTACT_PAYLOAD_OFFICIAL: PadproContactPayload = {
    bigHeadUrl  : 'http://wx.qlogo.cn/mmhead/ver_1/TR8EDh3MgMsu20pxjrDPBpaGySuEAGf3MUuoeUOV2LiaqvZxeMqb1U7hgiciaQZBC8LYN0boVLCKOIYg71pxdl1fQabiaxsn7CnNeGWVrK3jSIY/0',
    city        : 'Haidian',
    contactType : ContactType.Personal,
    country     : 'CN',
    labelLists  : '',
    nickName    : '李卓桓',
    province    : 'Beijing',
    remark      : '',
    sex         : 0,
    signature   : 'CARPE+DIEM+-+if+not+us,+who?+if+not+now,+when?',
    smallHeadUrl: 'http: //wx.qlogo.cn/mmhead/ver_1/TR8EDh3MgMsu20pxjrDPBpaGySuEAGf3MUuoeUOV2LiaqvZxeMqb1U7hgiciaQZBC8LYN0boVLCKOIYg71pxdl1fQabiaxsn7CnNeGWVrK3jSIY/132',
    stranger    : 'v1_cd6656d42f505e5ffbb7eab65fed448fc8f02eade29a873ec3e758c7553db424@stranger',
    ticket      : '',
    userName    : 'gh_59d7c8ad720c',
  }

  const EXPECTED_CONTACT_PAYLOAD_PERSONAL: ContactPayload = {
    alias     : '女儿',
    avatar    : 'http://wx.qlogo.cn/mmhead/ver_1/xfCMmibHH74xGLoyeDFJadrZXX3eOEznPefiaCa3iczxZGMwPtDuSbRQKx3Xdm18un303mf0NFia3USY2nO2VEYILw/0',
    city      : 'Haidian',
    gender    : ContactGender.Female,
    id        : 'mengjunjun001',
    name      : '梦君君',
    province  : 'Beijing',
    signature : 'Stay Foolish',
    type      : ContactType.Personal,
  }

  const EXPECTED_CONTACT_PAYLOAD_OFFICIAL: ContactPayload = {
    alias     : '',
    avatar    : 'http://wx.qlogo.cn/mmhead/ver_1/TR8EDh3MgMsu20pxjrDPBpaGySuEAGf3MUuoeUOV2LiaqvZxeMqb1U7hgiciaQZBC8LYN0boVLCKOIYg71pxdl1fQabiaxsn7CnNeGWVrK3jSIY/0',
    city      : 'Haidian',
    gender    : ContactGender.Unknown,
    id        : 'gh_59d7c8ad720c',
    name      : '李卓桓',
    province  : 'Beijing',
    signature : 'CARPE DIEM+-+if+not+us,+who?+if+not+now,+when?',
    type      : ContactType.Official,
  }

  const resultPersonal = contactRawPayloadParser(PADCHAT_CONTACT_PAYLOAD_PERSONAL)
  t.deepEqual(resultPersonal, EXPECTED_CONTACT_PAYLOAD_PERSONAL, 'should parse ContactPayload for personal account payload')

  const resultOfficial = contactRawPayloadParser(PADCHAT_CONTACT_PAYLOAD_OFFICIAL)
  t.deepEqual(resultOfficial, EXPECTED_CONTACT_PAYLOAD_OFFICIAL, 'should parse ContactPayload for official account payload')

  t.throws(() => contactRawPayloadParser({} as any), 'should throw exception for invalid object')
  t.throws(() => contactRawPayloadParser(undefined as any), 'should throw exception for undifined')
})
