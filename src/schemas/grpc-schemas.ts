import { ContactGender } from 'wechaty-puppet'

import {
  CheckQRCodeStatus,
  ContactOperationBitVal,
  ContactOperationCmdId,
  PadproContinue,
  PadproMessageStatus,
  PadproMessageType,
  PadproRoomMemberFlag,
} from './padpro-enums'

/**
 * ******************************************************************************************************************
 * ----------------------------------------- Login related interface ------------------------------------------------
 * ******************************************************************************************************************
 * ******************************************************************************************************************
 */

export interface GrpcCheckQRCode {
  CheckTime? : number,
  ExpiredTime: number,                // 238,
  HeadImgUrl?: string,                // http://wx.qlogo.cn/mmhead/ver_1/NkOvv1rTx3Dsqpicnhe0j7cVOR3psEAVfuhFLbmoAcwaob4eENNZlp3KIEsMgibfH4kRjDicFFXN3qdP6SGRXbo7GBs8YpN52icxSeBUX8xkZBA/0,
  Nickname?  : string,                // 苏轼,
  Password?  : string,
  Status     : CheckQRCodeStatus,     // 2 = success
  Username?  : string,                // wxid_zj2cahpwzgie12
}

export interface GrpcGetQRCodeType {
  qr_code : string,
}

export interface GrpcQrcodeLoginType {
  status: number,
  longHost: string,
  shortHost: string,
  userName: string,
}

/**
 * ******************************************************************************************************************
 * ----------------------------------------- Contact related interface ----------------------------------------------
 * ******************************************************************************************************************
 * ******************************************************************************************************************
 */

// Contact payload
// [{
//   "Alias": "",
//   "BigHeadImgUrl": "http://wx.qlogo.cn/mmhead/KDLS0fhbCTJ0H7wsWRiaeMdibHvaeoZw1jQScfCqfVaPM/132",
//   "ChatRoomOwner": "",
//   "ChatroomVersion": 0
//   "City": "",
//   "ContactType": 0,
//   "EncryptUsername": "",
//   "ExtInfo": "",
//   "ExtInfoExt": "",
//   "LabelLists": "",
//   "MsgType": 2,
//   "NickName": "高原ོ",
//   "Province": "",
//   "Remark": "",
//   "Sex": 1,
//   "Signature": "",
//   "SmallHeadImgUrl": "http://wx.qlogo.cn/mmhead/KDLS0fhbCTJ0H7wsWRiaeMdibHvaeoZw1jQScfCqfVaPM/0",
//   "Ticket": "",
//   "UserName": "lylezhuifeng",
//   "VerifyFlag": 0,
// }]
export interface GrpcContactRawPayload {
  Alias          : string,
  BigHeadImgUrl  : string,
  City           : string,
  ContactType    : number,
  EncryptUsername: string,
  LabelLists     : string,
  MsgType        : PadproMessageType,
  NickName       : string,
  Province       : string,
  Remark         : string,
  Sex            : ContactGender,
  Signature      : string,
  SmallHeadImgUrl: string,
  Ticket         : string,
  UserName       : string,
  VerifyFlag     : number,
}

// {
//   "CurrentWxcontactSeq": 678982076,
//   "CurrentChatRoomContactSeq": 0,
//   "ContinueFlag": 1,
//   "UsernameLists": [{
//     "Username": "bbb"
//   }, {
//     "Username": "aaa"
//   }]
// }
export interface GrpcWxidItem {
  Username: string
}

export interface GrpcSyncContactPayload {
  CurrentWxcontactSeq: number,
  CurrentChatRoomContactSeq: number,
  ContinueFlag: PadproContinue,
  UsernameLists: GrpcWxidItem[]
}

/**
 * ******************************************************************************************************************
 * ----------------------------------------- Message related interface ----------------------------------------------
 * ******************************************************************************************************************
 * ******************************************************************************************************************
 */

// {
//   "MsgId": 1093988990,
//   "FromUserName": "12511063195@chatroom",
//   "ToUserName": "lylezhuifeng",
//   "MsgType": 1,
//   "Content": "wxid_zovb9ol86m7l22:\n李佳丙-Thu Sep 27 2018 03:51:18 GMT+0000 (Coordinated Universal Time)",
//   "Status": 3,
//   "ImgStatus": 1,
//   "ImgBuf": null,
//   "CreateTime": 1538020278,
//   "MsgSource": "<msgsource>\n\t<silence>1</silence>\n\t<membercount>4</membercount>\n</msgsource>\n",
//   "PushContent": "",
//   "NewMsgId": 8342436108662474000
// }
export interface GrpcMessagePayload {
  MsgId: number,
  FromUserName: string,
  ToUserName: string,
  MsgType: PadproMessageType,
  Content: string,
  Status: PadproMessageStatus,
  ImgStatus: number,
  ImgBuf: string | null,
  CreateTime: number,
  MsgSource: string,
  PushContent: string,
  NewMsgId: number
}

/**
 * ******************************************************************************************************************
 * ----------------------------------------- Room related interface -------------------------------------------------
 * ******************************************************************************************************************
 * ******************************************************************************************************************
 */

// Room payload
// {
//   "Alias": "",
//   "BigHeadImgUrl": "http://wx.qlogo.cn/mmcrhead/22YD2oBcVUbuonH5SPq6GlD7fW1cHZiadZTGnAIny0PXdj7GEBYV3M5FHv3GicYBySftwQibDQiaahE0pU7phNiaH02wItnlKibOfp/0",
//   "ChatRoomOwner": "wxid_3xl8j2suau8b22",
//   "ChatroomVersion": 700001442
//   "City": "",
//   "ContactType": 0,
//   "EncryptUsername": "v1_97cdf15ad29268aff9af5c79ef0696c13711214e4c4bd9fba4ae17c4317b90907b4a738d9c31dabd9c710720f3936efd@stranger",
//   "ExtInfo": "[{\"Wxid\":\"wxid_1\",\"NickName\":\"nick\"},{\"Wxid\":\"wxid_2\",\"NickName\":\"nick\"}]",
//   "ExtInfoExt": "wxid_1,wxid_2"
//   "LabelLists": "",
//   "MsgType": 2,
//   "NickName": "Wechaty Developers' Home 2",
//   "Province": "",
//   "Remark": "",
//   "Sex": 0,
//   "Signature": "",
//   "SmallHeadImgUrl": "",
//   "Ticket": "",
//   "UserName": "5729603967@chatroom",
//   "VerifyFlag": 1,
// }
export interface GrpcRoomRawPayload {
  Alias          : string,
  BigHeadImgUrl  : string,
  ChatRoomOwner  : string,
  ChatroomVersion: number
  ContactType    : number,
  EncryptUsername: string,
  ExtInfo        : string,
  ExtInfoExt     : string,
  LabelLists     : string,
  MsgType        : PadproMessageType,
  NickName       : string,
  SmallHeadImgUrl: string,
  Ticket         : string,
  UserName       : string,
  VerifyFlag     : number,
}

// Room member payload
// {
//   "ChatroomUsername": "1111@chatroom",
//   "ServerVersion": 700000033,
//   "MemberDetails": [{
//     "Username": "wxid_z2",
//     "NickName": "小桔测试",
//     "DisplayName": "",
//     "BigHeadImgUrl": "http://wx.qlogo.cn/mmhead/ver_1/V9HJ2jFv1eS0a4yj",
//     "SmallHeadImgUrl": "http://wx.qlogo.cn/mmhead/ver_1/V9HJ2jFv1pxib6p",
//     "ChatroomMemberFlag": 0,
//     "InviterUserName": "wxid_zm"
//   }]
// }
export interface GrpcRoomMemberRawPayload {
  ChatroomUsername: string,
  ServerVersion: number,
  MemberDetails: GrpcRoomMemberDetail[],
}

export interface GrpcRoomMemberDetail {
  Username: string,
  NickName: string,
  DisplayName: string,
  BigHeadImgUrl: string,
  SmallHeadImgUrl: string,
  ChatroomMemberFlag: PadproRoomMemberFlag,
  InviterUserName: string,
}

export interface GrpcContactOperationOption {
  cmdid: ContactOperationCmdId,
  userId: string,
  bitVal?: ContactOperationBitVal,
  remark?: string,
}
