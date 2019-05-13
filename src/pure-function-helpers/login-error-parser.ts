import { log } from '../config'
import { PadproAutoLoginErrorType } from '../schemas'
import { xmlToJson } from './xml-to-json'

const LOGIN_ANOTHER_DEVICE_REGEX = /^当前帐号于(.+)在网页版微信设备上登录。此客户端已退出登录。$/
const LOGIN_ANOTHER_DEVICE_WITH_WARN_REGEX = /^当前帐号于(.+)在(.+)设备上登录。若非本人操作，你的登录密码可能已经泄漏，请及时改密。紧急情况可前往http:\/\/weixin110.qq.com冻结帐号。$/
const SELF_LOGOUT_REGEX = /^你已退出微信$/
const SAFETY_LOGOUT_REGEX = /^为了你的帐号安全，请重新登录。$/
const TOO_FREQUENT_REGEX = /^你操作频率过快，请稍后再试。$/

export async function loginErrorParser (
  payload: string,
): Promise<{
  message: string,
  type: PadproAutoLoginErrorType,
}> {
  interface XmlSchema {
    e: {
      ShowType: string,
      Content: string,
      Url: string,
      DispSec: string,
      Title: string,
      Action: string,
      DelayConnSec: string,
      Countdown: string,
      Ok: string,
      Cancel: string,
    }
  }

  try {
    const jsonPayload: XmlSchema = await xmlToJson(payload)

    const content = jsonPayload.e.Content
    let type: PadproAutoLoginErrorType
    if (LOGIN_ANOTHER_DEVICE_REGEX.test(content)) {
      type = PadproAutoLoginErrorType.LOGIN_ANOTHER_DEVICE
    } else if (LOGIN_ANOTHER_DEVICE_WITH_WARN_REGEX.test(content)) {
      type = PadproAutoLoginErrorType.LOGIN_ANOTHER_DEVICE_WITH_WARN
    } else if (SELF_LOGOUT_REGEX.test(content)) {
      type = PadproAutoLoginErrorType.SELF_LOGOUT
    } else if (SAFETY_LOGOUT_REGEX.test(content)) {
      type = PadproAutoLoginErrorType.SAFETY_LOGOUT
    } else if (TOO_FREQUENT_REGEX.test(content)) {
      type = PadproAutoLoginErrorType.TOO_FREQUENT
    } else {
      type = PadproAutoLoginErrorType.UNKNOWN
    }

    return {
      message: content,
      type,
    }
  } catch (e) {
    log.verbose('loginErrorParser', `parse failed:\n${e.stack}`)
    return {
      message: payload,
      type: PadproAutoLoginErrorType.UNKNOWN,
    }
  }
}
