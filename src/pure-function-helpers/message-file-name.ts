import {
  PadproMessagePayload, PadproMessageType,
}                               from '../schemas'

export function messageFileName (
  rawPayload: PadproMessagePayload,
): string {
  if (rawPayload.messageType === PadproMessageType.Voice) {
    return rawPayload.messageId + '.slk'
  } else if (rawPayload.messageType === PadproMessageType.Image) {
    return rawPayload.messageId + '.jpg'
  } else if (rawPayload.messageType === PadproMessageType.Video) {
    return rawPayload.messageId + '.mp4'
  }

  return rawPayload.messageId + '-to-be-implement.txt'
}
