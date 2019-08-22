import { ApiOption } from './interface'

export const GrpcNewInit: ApiOption = {}

export const GrpcHeartBeat: ApiOption = {
  longRequest: true,
  noParse: true,
}

export const GrpcGetQRCode: ApiOption = {
  useProxy: true,
}

export const GrpcCheckQRCode: ApiOption = {
  useProxy: true,
}

export const GrpcQRCodeLogin: ApiOption = {
  useProxy: true,
}

export const GrpcAutoLogin: ApiOption = {
  longRequest: true,
}

export const GrpcLogout: ApiOption = {}

export const GrpcSetUserInfo: ApiOption = {}

export const GrpcGetCdnDns: ApiOption = {}
