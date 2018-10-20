import { GrpcRoomMemberDetail, PadproRoomMemberPayload } from '../schemas'

export const convertRoomMember = (input: GrpcRoomMemberDetail): PadproRoomMemberPayload => {
  return {
    bigHeadUrl  : input.BigHeadImgUrl,
    contactId   : input.Username,
    displayName : input.DisplayName,
    inviterId   : input.InviterUserName,
    nickName    : input.NickName,
    smallHeadUrl: input.SmallHeadImgUrl,
  }
}
