import { log } from '../config'

import { GrpcRoomMemberDetail, PadproRoomMemberPayload } from '../schemas'

const PRE = 'RoomMemberConverter'

export const convertRoomMember = (input: GrpcRoomMemberDetail): PadproRoomMemberPayload => {
  try {
    return {
      bigHeadUrl  : input.BigHeadImgUrl,
      contactId   : input.Username,
      displayName : input.DisplayName,
      inviterId   : input.InviterUserName,
      nickName    : input.NickName,
      smallHeadUrl: input.SmallHeadImgUrl,
    }
  } catch (e) {
    log.error(PRE, `Convert room member failed: failed room member: ${JSON.stringify(input)}`)
    throw e
  }
}
