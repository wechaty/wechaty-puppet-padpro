# WECHATY-PUPPET-PADPRO

[![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-blue.svg)](https://github.com/chatie/wechaty)
[![npm version](https://badge.fury.io/js/wechaty-puppet-padpro.svg)](https://badge.fury.io/js/wechaty-puppet-padpro)
[![Greenkeeper badge](https://badges.greenkeeper.io/botorange/wechaty-puppet-padpro.svg)](https://greenkeeper.io/)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/cb818825ff8146bab6a040febb5bd3c3)](https://app.codacy.com/app/windmemory/wechaty-puppet-padpro?utm_source=github.com&utm_medium=referral&utm_content=botorange/wechaty-puppet-padpro&utm_campaign=Badge_Grade_Settings)

This module is a sub module of [Wechaty Puppet](https://github.com/Chatie/wechaty/issues/1167).

See more: [Wechaty](https://github.com/chatie/wechaty) [![NPM Version](https://badge.fury.io/js/wechaty.svg)](https://badge.fury.io/js/wechaty) [![Docker Pulls](https://img.shields.io/docker/pulls/zixia/wechaty.svg?maxAge=2592000)](https://hub.docker.com/r/zixia/wechaty/) [![TypeScript](https://img.shields.io/badge/<%2F>-TypeScript-blue.svg)](https://www.typescriptlang.org/) [![Greenkeeper badge](https://badges.greenkeeper.io/Chatie/wechaty.svg)](https://greenkeeper.io/)

## Install

```shell
npm install wechaty
npm install wechaty-puppet-padpro
```

## Example

```ts
import { Wechaty } from 'wechaty'
import { PuppetPadpro } from 'wechaty-puppet-padpro'

const WECHATY_PUPPET_PADPRO_TOKEN = 'your-token-here'

const puppet = new PuppetPadpro({
  token: WECHATY_PUPPET_PADPRO_TOKEN,
})

const bot = new Wechaty({
  puppet,
})

// Setting Done

// Run wechaty
bot
.on('scan', (qrcode, status) => console.log(`Scan QR Code to login: ${status}\nhttps://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrcode)}`))
.on('login',            user => console.log(`User ${user} logined`))
.on('message',       message => console.log(`Message: ${message}`))
.start()
```

## Docs

[https://docs.chatie.io](https://docs.chatie.io)

## Token

* We stop selling the token service, only provide technical support to our partner. If you have any needs, please [click here to get alpha test](https://github.com/Chatie/wechaty/issues/1846).

## LICENSE

Apache-2.0
