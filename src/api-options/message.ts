import { ApiOption } from './interface'

export const GrpcSyncMessage: ApiOption = {
  longRequest: true,
}

export const GrpcSendMessage: ApiOption = {}

export const GrpcSendImage: ApiOption = {
  longRequest: true,
  noParse: true,
}

export const GrpcSendVoice: ApiOption = {
  longRequest: true,
  noParse: true,
}

export const GrpcSendApp: ApiOption = {}

export const GrpcGetMsgImage: ApiOption = {
  longRequest: true,
}

export const GrpcGetMsgVideo: ApiOption = {
  longRequest: true,
}

export const GrpcGetMsgVoice: ApiOption = {
  longRequest: true,
}
