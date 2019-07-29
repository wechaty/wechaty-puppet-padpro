import test from 'blue-tape'
import { messageSourceParser } from './message-source-parser'

const textRoomSource = '<msgsource>\n\t<silence>1</silence>\n\t<membercount>7</membercount>\n</msgsource>\n'
const imageRoomSource = '<msgsource>\n\t<img_file_name>桔子互动图标 字（头像用）.jpg</img_file_name>\n\t<silence>1</silence>\n\t<membercount>7</membercount>\n</msgsource>\n'
const urlRoomSource = '<msgsource>\n\t<silence>1</silence>\n\t<membercount>7</membercount>\n</msgsource>\n'
const textRoomAtSource = '<msgsource>\n\t<atuserlist>wxid_rdwh63c150bm12,wxid_3xl8j2suau8b22</atuserlist>\n\t<silence>1</silence>\n\t<membercount>7</membercount>\n</msgsource>\n'
const roomAnnounceSource = '<msgsource>\n\t<atuserlist>announcement@all</atuserlist>\n\t<silence>0</silence>\n\t<membercount>3</membercount>\n</msgsource>\n'

test('Should parse text room message source correctly', async (t) => {
  const payload = await messageSourceParser(textRoomSource)
  const expectedResult = {
    memberCount: 7,
    silence: true,
  }

  t.deepEqual(expectedResult, payload)
})

test('Should parse image room message source correctly', async (t) => {
  const payload = await messageSourceParser(imageRoomSource)
  const expectedResult = {
    imageFileName: '桔子互动图标 字（头像用）.jpg',
    memberCount: 7,
    silence: true,
  }

  t.deepEqual(expectedResult, payload)
})

test('Should parse url room message source correctly', async (t) => {
  const payload = await messageSourceParser(urlRoomSource)
  const expectedResult = {
    memberCount: 7,
    silence: true,
  }

  t.deepEqual(expectedResult, payload)
})

test('Should parse text room at message source correctly', async (t) => {
  const payload = await messageSourceParser(textRoomAtSource)
  const expectedResult = {
    atUserList: [
      'wxid_rdwh63c150bm12',
      'wxid_3xl8j2suau8b22',
    ],
    memberCount: 7,
    silence: true,
  }

  t.deepEqual(expectedResult, payload)
})

test('Should parse room announce message source correctly', async (t) => {
  const payload = await messageSourceParser(roomAnnounceSource)
  const expectedResult = {
    atUserList: ['announcement@all'],
    memberCount: 3,
    silence: false,
  }

  t.deepEqual(expectedResult, payload)
})
