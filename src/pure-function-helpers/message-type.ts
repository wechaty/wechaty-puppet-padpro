import {
  MessageType,
}                         from 'wechaty-puppet'

import {
  PadproMessageType,
}                         from '../schemas'

export function messageType (
  rawType: PadproMessageType,
): MessageType {
  let type: MessageType

  switch (rawType) {

    case PadproMessageType.Text:
      type = MessageType.Text
      break

    case PadproMessageType.Image:
      type = MessageType.Image
      // console.log(rawPayload)
      break

    case PadproMessageType.Voice:
      type = MessageType.Audio
      // console.log(rawPayload)
      break

    case PadproMessageType.Emoticon:
      type = MessageType.Emoticon
      // console.log(rawPayload)
      break

    case PadproMessageType.App:
      type = MessageType.Attachment
      // console.log(rawPayload)
      break

    case PadproMessageType.Video:
      type = MessageType.Video
      // console.log(rawPayload)
      break

    case PadproMessageType.Sys:
      type = MessageType.Unknown
      break

    case PadproMessageType.ShareCard:
      type = MessageType.Contact
      break

    case PadproMessageType.VoipMsg:
    case PadproMessageType.Recalled:
      type = MessageType.Recalled
      break

    case PadproMessageType.StatusNotify:
    case PadproMessageType.SysNotice:
      type = MessageType.Unknown
      break

    default:
      throw new Error('unsupported type: ' + PadproMessageType[rawType] + '(' + rawType + ')')
  }

  return type
}
