import {
  RoomPayload,
}                   from 'wechaty-puppet'

import {
  PadproRoomPayload,
}                         from '../schemas'

export function roomRawPayloadParser (
  rawPayload: PadproRoomPayload,
): RoomPayload {
  const payload: RoomPayload = {
    id           : rawPayload.chatroomId,
    memberIdList : rawPayload.members.map(m => m.userName) || [],
    ownerId      : rawPayload.chatRoomOwner,
    topic        : rawPayload.nickName,
  }

  return payload
}
