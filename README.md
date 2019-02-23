# WECHATY-PUPPET-PADPRO

[![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-blue.svg)](https://github.com/chatie/wechaty)
[![npm version](https://badge.fury.io/js/wechaty-puppet-padpro.svg)](https://badge.fury.io/js/wechaty-puppet-padpro)
[![Greenkeeper badge](https://badges.greenkeeper.io/botorange/wechaty-puppet-padpro.svg)](https://greenkeeper.io/)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/cb818825ff8146bab6a040febb5bd3c3)](https://app.codacy.com/app/windmemory/wechaty-puppet-padpro?utm_source=github.com&utm_medium=referral&utm_content=botorange/wechaty-puppet-padpro&utm_campaign=Badge_Grade_Settings)

这个模块是本地建立和微信的连接，数据通过GRPC 连接一个协议服务器来进行加解密，最终控制iPad 微信，实现个人号的微信接口。

这个模块是基于[Wechaty](https://github.com/Chatie/wechaty/) 的子模块，专门针对ipad 接入的。wechaty 是一个开源的的 **个人号** 微信机器人接口，是一个使用Typescript 构建的Node.js 应用。支持多种微信接入方案，包括网页，ipad，ios，windows， android 等。同时支持[Linux](https://travis-ci.com/chatie/wechaty), [Windows](https://ci.appveyor.com/project/chatie/wechaty), [Darwin\(OSX/Mac\)](https://travis-ci.com/chatie/wechaty) 和 [Docker](https://app.shippable.com/github/Chatie/wechaty) 多个平台。

只需要6行代码，你就可以 **通过个人号** 搭建一个 **微信机器人功能** ，用来自动管理微信消息。

更多功能包括：

* 消息处理：关键词回复
* 群管理：自动入群，拉人，踢人
* 自动处理好友请求
* 智能对话：通过简单配置，即可加入智能对话系统，完成指定任务
* ... 请自行开脑洞

详情请看[Wechaty](https://github.com/chatie/wechaty)项目 [![NPM Version](https://badge.fury.io/js/wechaty.svg)](https://badge.fury.io/js/wechaty) [![Docker Pulls](https://img.shields.io/docker/pulls/zixia/wechaty.svg?maxAge=2592000)](https://hub.docker.com/r/zixia/wechaty/) [![TypeScript](https://img.shields.io/badge/<%2F>-TypeScript-blue.svg)](https://www.typescriptlang.org/) [![Greenkeeper badge](https://badges.greenkeeper.io/Chatie/wechaty.svg)](https://greenkeeper.io/)

## 安装

```shell
npm install wechaty
npm install wechaty-puppet-padpro
```

## 示例代码

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

// 设置完成

// 运行 wechaty
bot
.on('scan', (qrcode, status) => console.log(`Scan QR Code to login: ${status}\nhttps://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrcode)}`))
.on('login',            user => console.log(`User ${user} logined`))
.on('message',       message => console.log(`Message: ${message}`))
.start()
```

## 获取Token

![contact](./image/contact.gif)

[了解更多Token 相关内容](https://github.com/lijiarui/wechaty-puppet-padchat/wiki/%E8%B4%AD%E4%B9%B0token)

## 文件相关功能须知

当前文件相关功能需要获取当前运行的主机的IP地址，目前项目使用了[public-ip](https://www.npmjs.com/package/public-ip)包来实现，但是对于某些运行环境，这个包可能无法获取当前的IP地址，因此项目中增加了对环境变量`PADPRO_IP`的处理。用户可以自行传入`PADPRO_IP`环境变量来指定自己的IP地址，然后根据这个IP地址获取文件功能相关的CDN服务器地址。务必保证自己传入了一个**公网地址**，否则传入参数无效，无法正确运行文件的收发功能。

## 通过wechaty发送的消息并不会在`message`事件中接收到

`wechaty-puppet-padpro`增加了一个环境变量`PADPRO_REPLAY_MESSAGE`，来控制通过wechaty发送出去的消息，是否在`message`事件中被触发

如果希望所有的消息都被触发，则可以在运行自己的代码时，在前面设置`PADPRO_REPLAY_MESSAGE`为`true`即可，如下：

```shell
PADPRO_REPLAY_MESSAGE=true node bot.js
```

## 文档

[http://wechaty.botorange.com](http://wechaty.botorange.com)

## LICENSE

Apache-2.0
