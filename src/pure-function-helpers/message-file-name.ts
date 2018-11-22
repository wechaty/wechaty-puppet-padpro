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
  }

  return rawPayload.messageId + '-to-be-implement.txt'
}
