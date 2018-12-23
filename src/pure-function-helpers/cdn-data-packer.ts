export const packCdnData = (obj: { [key: string]: any }): Buffer => {
  let resBuf = Buffer.from('')

  const keys = Object.keys(obj)
  for (const k of keys) {
    let valueBuf: Buffer
    const keyBuf = convertStr(k)
    if (obj[k] === null || typeof obj[k] === 'string') {
      valueBuf = convertStr(obj[k])
    } else if (Buffer.isBuffer(obj[k])) {
      valueBuf = convertStr(Buffer.from(obj[k]))
    } else {
      valueBuf = convertStr(obj[k].toString())
    }
    resBuf = Buffer.concat([
      resBuf,
      keyBuf,
      valueBuf,
    ])
  }

  return resBuf
}

export const unpackCdnData = (buf: Buffer): { [key: string]: Buffer } => {
  let tempBuf = Buffer.from(buf)
  const res: { [key: string]: Buffer } = {}
  while (tempBuf.length > 0) {
    /**
     * Get the key
     */
    const keyLen = tempBuf.readInt32BE(0)
    const keyBuf = tempBuf.slice(4, 4 + keyLen)

    const key = keyBuf.toString('utf-8')
    tempBuf = tempBuf.slice(4 + keyLen)

    /**
     * Get the value
     */
    const valueLen = tempBuf.readInt32BE(0)
    const valueBuf = tempBuf.slice(4, 4 + valueLen)

    res[key] = valueBuf

    tempBuf = tempBuf.slice(4 + valueLen)
  }

  return res
}

export const convertStr = (input: string | Buffer | null): Buffer => {
  if (input === null) {
    return Buffer.from('00000000', 'hex')
  } else {
    const len = input.length
    const bufLen = Buffer.alloc(4)
    bufLen.writeUInt32BE(len, 0)
    const valueBuf = Buffer.from(input as any)
    return Buffer.concat([
      bufLen,
      valueBuf,
    ])
  }
}
