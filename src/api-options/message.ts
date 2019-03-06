import { ApiOption } from './interface'

export const GrpcSyncMessage: ApiOption = {
  longRequest: true,
}

export const GrpcSendMessage: ApiOption = {
  longRequest: true,
}

export const GrpcSendImage: ApiOption = {
  longRequest: true,
  noParse: true,
}

export const GrpcSendVoice: ApiOption = {
  longRequest: true,
  noParse: true,
}

export const GrpcSendVideo: ApiOption = {
  longRequest: true,
  noParse: true,
}

export const GrpcSendApp: ApiOption = {
  longRequest: true,
  noParse: true,
}

export const GrpcGetMsgImage: ApiOption = {
  longRequest: true,
}

export const GrpcGetMsgVideo: ApiOption = {
  longRequest: true,
}

export const GrpcGetMsgVoice: ApiOption = {
  longRequest: true,
}
