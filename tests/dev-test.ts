import { PadproManager } from '../src/manager/padpro-manager'
import { PuppetPadpro } from '../src/puppet-padpro'

import { generate } from 'qrcode-terminal'

// const padproManager = new PadproManager({
//   endpoint: 'localhost:32132',
//   token: 'test2',
// })

// const main = async () => {
//   padproManager.on('scan', qrcode => {
//     generate(qrcode, { small: true })
//   })
//   padproManager.on('login', async _ => {
//     // padproManager.updateSelfName('test name')
//     // await padproManager.syncContactsAndRooms()
//     // await padproManager.GrpcSendMessage('')
//     await padproManager.GrpcSendMessage('filehelper', '恭喜你已经登录')
//   })
//   .on('message', message => {
//     console.log(JSON.stringify(message))
//   })
//   await padproManager.start()
// }

const puppet = new PuppetPadpro({
  endpoint: 'localhost:32132',
  token: 'test2',
})

const main = async () => {
  puppet.on('login', async _ => {
    console.log('login!')
  })
  .on('scan', qrcode => {
    generate(qrcode, { small: true })
  })
  .on('message', async messageId => {
    const msg = await puppet.messagePayload(messageId)
    console.log('receive message: ' + JSON.stringify(msg.text))
  })

  await puppet.start()
}

main()
