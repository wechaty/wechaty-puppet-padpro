// tslint:disable:no-reference

/// <reference path="./typings.d.ts" />

import { log } from 'brolog'

const WECHATY_PUPPET_PADPRO_ENDPOINT_ENV_VAR = 'WECHATY_PUPPET_PADPRO_ENDPOINT'

export const WECHATY_PUPPET_PADPRO_ENDPOINT = process.env[WECHATY_PUPPET_PADPRO_ENDPOINT_ENV_VAR]  || 'padpro.botorange.com:6666'

export const PADPRO_REPLAY_MESSAGE = process.env.PADPRO_REPLAY_MESSAGE === 'true'

export const SELF_QRCODE_MAX_RETRY = 5

export const PUPPET_PADPRO_TIMEOUT = 60 * 4

export const MESSAGE_CACHE_AGE = 1000 * 60 * 60
export const MESSAGE_CACHE_MAX = 1000

export const WAIT_FOR_READY_TIME = 3 * 60 * 1000

export const GRPC_GATEWAY_MAX_ERROR_COUNT = 15

export const GRPC_GATEWAY_DISCONNECT_MAX_DURATION = 30 * 1000

export const GRPC_GATEWAY_DISCONNECT_MIN_ERROR = 5

export const GRPC_GATEWAY_TIMEOUT = 15 * 1000 // In milliseconds

export const GRPC_GATEWAY_MAX_RETRY = 3

export const SEND_SHORT_TIMEOUT = 5 * 1000

export const SEND_SHORT_RETRY_COUNT = 5

export const SEND_CDN_RETRY_COUNT = 5

export const LOGIC_ERROR_MESSAGE = [
  'NO_SESSION',
]

export { VERSION } from './version'

/**
 * LOG LEVEL
 */
const logLevel = process.env.PADPRO_LOG
if (logLevel) {
  log.level(logLevel.toLowerCase() as any)
  log.silly('Config', 'PADPRO_LOG set level to %s', logLevel)
}

export {
  log,
}
