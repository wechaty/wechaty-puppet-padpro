import { log } from '../config'
import { GrpcMessagePayload, PadproMessagePayload } from '../schemas'

const PRE = 'MessgaeConverter'

export const convertMessage = (input: GrpcMessagePayload): PadproMessagePayload => {

  try {
    const convertedMessage = {
      content      : input.Content,
      data         : input.ImgBuf,
      fromUser     : input.FromUserName,
      messageId    : input.MsgId.toString(),
      messageSource: input.MsgSource,
      messageType  : input.MsgType,
      status       : input.Status,
      timestamp    : input.CreateTime,
      toUser       : input.ToUserName,
    }
    return convertedMessage
  } catch (e) {
    log.error(PRE, `Converting message failed, failed message: ${JSON.stringify(input)}`)
    throw e
  }
}
