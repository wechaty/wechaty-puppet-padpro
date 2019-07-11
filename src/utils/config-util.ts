import qrImage from 'qr-image'
import { OperationOptions } from 'retry'
import { log } from '../config'

import { FileBox } from 'file-box'
import promiseRetry = require('promise-retry')

export const padproToken = () => {
  const token = process.env.WECHATY_PUPPET_PADPRO_TOKEN as string
  if (!token) {
    log.error('PuppetPadproConfig', `

      WECHATY_PUPPET_PADPRO_TOKEN environment variable not found.

      PuppetPadpro need a token before it can be used,
      Please set WECHATY_PUPPET_PADPRO_TOKEN then retry again.

    `)
    throw new Error('You need a valid WECHATY_PUPPET_PADPRO_TOKEN to use PuppetPadpro')
  }
  return token
}

export const qrCodeForChatie = (): FileBox => {
  const CHATIE_OFFICIAL_ACCOUNT_QRCODE = 'http://weixin.qq.com/r/qymXj7DEO_1ErfTs93y5'
  const name                           = 'qrcode-for-chatie.png'
  const type                           = 'png'

  const qrStream = qrImage.image(CHATIE_OFFICIAL_ACCOUNT_QRCODE, { type })
  return FileBox.fromStream(qrStream, name)
}

export async function retry<T> (
  retryableFn: (
    retry: (error: Error) => never,
    attempt: number,
  ) => Promise<T>,
): Promise<T> {
  /**
   * 60 seconds: (to be confirmed)
   *  factor: 3
   *  minTimeout: 10
   *  maxTimeout: 20 * 1000
   *  retries: 9
   */
  const factor     = 3
  const minTimeout = 10
  const maxTimeout = 20 * 1000
  const retries    = 9
  // const unref      = true

  const retryOptions: OperationOptions = {
    factor,
    maxTimeout,
    minTimeout,
    retries,
  }
  return promiseRetry(retryOptions, retryableFn)
}
