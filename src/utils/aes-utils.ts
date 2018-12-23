import crypto from 'crypto'
import uuid from 'uuid'

export const encryptAes = (data: Buffer, key: Buffer) => {
  const slicedKey = key.slice(0, 16)
  const cipher    = crypto.createCipheriv('aes-128-ecb', slicedKey, '')
  const buf       = cipher.update(data)
  return Buffer.concat([buf, cipher.final()])
}

export const decryptAes = (data: Buffer, key: Buffer) => {
  const slicedKey = key.slice(0, 16)
  const decipher  = crypto.createDecipheriv('aes-128-ecb', slicedKey, '')
  const buf       = decipher.update(data)
  return Buffer.concat([buf, decipher.final()])
}

export const encryptUser = (username: string, key: string): string => {
  const decipher  = crypto.createCipheriv('aes-128-cbc', key, key)
  const buf       = decipher.update(Buffer.from(username))
  return Buffer.concat([buf, decipher.final()]).toString('hex')
}

export const getAesKey = (): Buffer => {
  return Buffer.from(uuid.v4()).slice(0, 16)
}
