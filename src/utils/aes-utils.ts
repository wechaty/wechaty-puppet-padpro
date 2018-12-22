import crypto from 'crypto'

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
