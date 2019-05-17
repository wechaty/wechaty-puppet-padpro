import { ApiOption } from './interface'

export const GrpcGetContact: ApiOption = {
  longRequest: true,
}

export const GrpcSyncContact: ApiOption = {
  longRequest: true,
}

export const GrpcContactOperation: ApiOption = {
  noParse: true,
}

export const GrpcGetContactQrcode: ApiOption = {
  longRequest: true,
}

export const GrpcAddFriend: ApiOption = {}

export const GrpcAcceptFriend: ApiOption = {}

export const GrpcSearchContact: ApiOption = {}

export const GrpcShareCard: ApiOption = {
  longRequest: true,
}
