import { ApiOption } from './interface'

export const GrpcGetChatRoomMember: ApiOption = {}

export const GrpcCreateRoom: ApiOption = {}

export const GrpcSetRoomName: ApiOption = {}

export const GrpcQuitRoom: ApiOption = {}

export const GrpcAddRoomMember: ApiOption = {}

export const GrpcInviteRoomMember: ApiOption = {
  noParse: true,
}

export const GrpcDeleteRoomMember: ApiOption = {}

export const GrpcSetRoomAnnouncement: ApiOption = {}
