import { ApiOption } from './interface'

export const GrpcNewInit: ApiOption = {}

export const GrpcHeartBeat: ApiOption = {
  longRequest: true,
  noParse: true,
}

export const GrpcGetQRCode: ApiOption = {
  longRequest: true,
}

export const GrpcCheckQRCode: ApiOption = {
  longRequest: true,
}

export const GrpcQRCodeLogin: ApiOption = {
  longRequest: true,
}

export const GrpcAutoLogin: ApiOption = {
  longRequest: true,
}

export const GrpcLogout: ApiOption = {}

export const GrpcSetUserInfo: ApiOption = {}
