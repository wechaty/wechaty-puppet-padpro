import { GrpcRoomRawPayload, PadproRoomPayload } from '../schemas'

export const convertRoom = (input: GrpcRoomRawPayload): PadproRoomPayload => {
  // input.ExtInfo = "[{\"Wxid\":\"wxid_1\",\"NickName\":\"nick\"},{\"Wxid\":\"wxid_2\",\"NickName\":\"nick\"}]",
  const memberList: Array<{ NickName: string, Wxid: string }> = JSON.parse(input.ExtInfo)
  return {
    alias          : input.Alias,
    bigHeadUrl     : input.BigHeadImgUrl,
    chatRoomOwner  : input.ChatRoomOwner,
    chatroomId     : input.UserName,
    chatroomVersion: input.ChatroomVersion,
    contactType    : input.ContactType,
    labelLists     : input.LabelLists,
    memberCount    : memberList.length,
    members        : memberList.map(m => ({ userName: m.Wxid, nickName: m.NickName })),
    nickName       : input.NickName,
    smallHeadUrl   : input.SmallHeadImgUrl,
    stranger       : input.EncryptUsername,
    ticket         : input.Ticket,
  }
}
