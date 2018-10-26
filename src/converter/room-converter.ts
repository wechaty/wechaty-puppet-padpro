import {
  log
} from '../config'

import {
  GrpcRoomRawPayload,
  PadproRoomPayload
} from '../schemas'

const PRE = 'RoomConverter'

export const convertRoom = (input: GrpcRoomRawPayload): PadproRoomPayload => {
  try {
    // input.ExtInfo = "[{\"Wxid\":\"wxid_1\",\"NickName\":\"nick\"},{\"Wxid\":\"wxid_2\",\"NickName\":\"nick\"}]",
    // input.ExtInfo = "wxid_1,wxid_2"

    let memberList: Array < {
      NickName?: string,
      Wxid: string
    } >
    try {
      memberList = JSON.parse(input.ExtInfo)
    } catch (_) {
      log.verbose(PRE, `convertRoom() convert to json failed for room payload: ${JSON.stringify(input)}`)
      memberList = input.ExtInfo.split(',').map(id => ({ Wxid: id }))
    }
    return {
      alias: input.Alias,
      bigHeadUrl: input.BigHeadImgUrl,
      chatRoomOwner: input.ChatRoomOwner,
      chatroomId: input.UserName,
      chatroomVersion: input.ChatroomVersion,
      contactType: input.ContactType,
      labelLists: input.LabelLists,
      memberCount: memberList.length,
      members: memberList.map(m => ({
        nickName: m.NickName,
        userName: m.Wxid,
      })),
      nickName: input.NickName,
      smallHeadUrl: input.SmallHeadImgUrl,
      stranger: input.EncryptUsername,
      ticket: input.Ticket,
    }
  } catch (e) {
    log.error(PRE, `Convert room failed, failed room: ${JSON.stringify(input)}`)
    throw e
  }
}
