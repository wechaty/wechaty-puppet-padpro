import test  from 'blue-tape'

import {
  convertStr,
  packCdnData,
  unpackCdnData,
} from './cdn-data-packer'

test('convertStr should be able to convert in the right way', async t => {
  const input = 'ver'
  const expectedRes = Buffer.from('00000003766572', 'hex')

  t.deepEqual(convertStr(input), expectedRes)
})

test('packCdnData should be able to pack cdn data correctly', async t => {
  const input = {
    ver: 1,
    weixinnum: 14123412312,
  }
  const expectedRes = Buffer.from('0000000376657200000001310000000977656978696e6e756d0000000b3134313233343132333132', 'hex')

  t.deepEqual(packCdnData(input), expectedRes)
})

test('packCdnData should be able to pack null data and string', async t => {
  const input = {
    null: null,
    string: 'string',
  }
  const expectedRes = Buffer.from('00000006737472696e6700000006737472696e67000000046e756c6c00000000', 'hex')
  t.deepEqual(packCdnData(input), expectedRes)
})

test('packCdnData should pack data into different res based on key order', async t => {
  const input1 = {
    null: null,
    string: 'string',
  }
  const input2 = {
    null: null,
    string: 'string',
  }
  const expectedRes1 = Buffer.from('00000006737472696e6700000006737472696e67000000046e756c6c00000000', 'hex')
  const expectedRes2 = Buffer.from('000000046e756c6c0000000000000006737472696e6700000006737472696e67', 'hex')
  t.deepEqual(packCdnData(input1), expectedRes1)
  t.deepEqual(packCdnData(input2), expectedRes2)
  t.notDeepEqual(packCdnData(input1), expectedRes2)
  t.notDeepEqual(packCdnData(input2), expectedRes1)
})

test('packCdnData should be able to pack buffer data', async t => {
  const input = {
    buffer: Buffer.from('I am a buffer', 'utf-8'),
  }
  const expectedRes = Buffer.from('000000066275666665720000000d4920616d206120627566666572', 'hex')
  t.deepEqual(packCdnData(input), expectedRes)
})

test('unpackCdnData should be able to unpack buffer data', async t => {
  const input = Buffer.from('000000066275666665720000000d4920616d206120627566666572', 'hex')
  const expectedRes = {
    buffer: Buffer.from('I am a buffer', 'utf-8'),
  }
  t.deepEqual(unpackCdnData(input), expectedRes)
})

test('unpackCdnData should be able to unpack buffer data', async t => {
  const input = Buffer.from('0000000376657200000001310000000977656978696e6e756d0000000b3134313233343132333132', 'hex')
  const expectedRes = {
    ver: Buffer.from('1'),
    weixinnum: Buffer.from('14123412312'),
  }
  t.deepEqual(unpackCdnData(input), expectedRes)
})

test('unpackCdnData should be able to unpack buffer data', async t => {
  const input = Buffer.from('00000006737472696e6700000006737472696e67000000046e756c6c00000000', 'hex')
  const expectedRes = {
    null: Buffer.from(''),
    string: Buffer.from('string'),
  }
  t.deepEqual(unpackCdnData(input), expectedRes)
})
