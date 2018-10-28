import { ApiOption } from './interface'

export const GrpcSyncMessage: ApiOption = {
  longRequest: true,
}

export const GrpcSendMessage: ApiOption = {}

export const GrpcSendImage: ApiOption = {
  longRequest: true,
}

export const GrpcSendVoice: ApiOption = {
  longRequest: true,
}

export const GrpcSendApp: ApiOption = {}

export const GrpcGetMsgImage: ApiOption = {}

export const GrpcGetMsgVideo: ApiOption = {}

export const GrpcGetMsgVoice: ApiOption = {}
