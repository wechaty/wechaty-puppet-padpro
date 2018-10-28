import {
  PadproMessagePayload, PadproMessageType,
}                               from '../schemas'

export function messageFileName (
  rawPayload: PadproMessagePayload,
): string {
  if (rawPayload.messageType === PadproMessageType.Voice) {
    return rawPayload.messageId + '.slk'
  }

  return rawPayload.messageId + '-to-be-implement.txt'
}
