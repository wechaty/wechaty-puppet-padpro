import test from 'blue-tape'

import { PadproAutoLoginErrorType } from '../schemas'
import { loginErrorParser } from './login-error-parser'

test('loginErrorParser() should parse login other device error', async t => {
  const LOGIN_OTHER_DEVICE = `<e>
  <ShowType>1</ShowType>
  <Content><![CDATA[当前帐号于10:23在网页版微信设备上登录。此客户端已退出登录。]]></Content>
  <Url><![CDATA[]]></Url>
  <DispSec>30</DispSec>
  <Title><![CDATA[]]></Title>
  <Action>4</Action>
  <DelayConnSec>0</DelayConnSec>
  <Countdown>0</Countdown>
  <Ok><![CDATA[]]></Ok>
  <Cancel><![CDATA[]]></Cancel>
  </e>`

  const EXPECTED_MESSAGE = '当前帐号于10:23在网页版微信设备上登录。此客户端已退出登录。'
  const error = await loginErrorParser(LOGIN_OTHER_DEVICE)
  t.equal(error.message, EXPECTED_MESSAGE)
  t.equal(error.type, PadproAutoLoginErrorType.LOGIN_ANOTHER_DEVICE)
})

test('loginErrorParser() should parse self logout error', async t => {
  const SELF_LOGOUT = `<e>
  <ShowType>1</ShowType>
  <Content><![CDATA[你已退出微信]]></Content>
  <Url><![CDATA[]]></Url>
  <DispSec>30</DispSec>
  <Title><![CDATA[]]></Title>
  <Action>4</Action>
  <DelayConnSec>0</DelayConnSec>
  <Countdown>0</Countdown>
  <Ok><![CDATA[]]></Ok>
  <Cancel><![CDATA[]]></Cancel>
  </e>`

  const EXPECTED_MESSAGE = '你已退出微信'
  const error = await loginErrorParser(SELF_LOGOUT)
  t.equal(error.message, EXPECTED_MESSAGE)
  t.equal(error.type, PadproAutoLoginErrorType.SELF_LOGOUT)
})

test('loginErrorParser() should parse login with other device with warning error', async t => {
  const LOGIN_OTHER_DEVICE_WITH_WARNING = `<e>
  <ShowType>1</ShowType>
  <Content><![CDATA[当前帐号于10:13在Carbon_X1设备上登录。若非本人操作，你的登录密码可能已经泄漏，请及时改密。紧急情况可前往http://weixin110.qq.com冻结帐号。]]></Content>
  <Url><![CDATA[]]></Url>
  <DispSec>30</DispSec>
  <Title><![CDATA[]]></Title>
  <Action>4</Action>
  <DelayConnSec>0</DelayConnSec>
  <Countdown>0</Countdown>
  <Ok><![CDATA[]]></Ok>
  <Cancel><![CDATA[]]></Cancel>
  </e>`

  const EXPECTED_MESSAGE = '当前帐号于10:13在Carbon_X1设备上登录。若非本人操作，你的登录密码可能已经泄漏，请及时改密。紧急情况可前往http://weixin110.qq.com冻结帐号。'
  const error = await loginErrorParser(LOGIN_OTHER_DEVICE_WITH_WARNING)
  t.equal(error.message, EXPECTED_MESSAGE)
  t.equal(error.type, PadproAutoLoginErrorType.LOGIN_ANOTHER_DEVICE_WITH_WARN)
})

test('loginErrorParser() should parse login with other device with warning 2nd error', async t => {
  const LOGIN_OTHER_DEVICE_WITH_WARNING_2 = `<e>
  <ShowType>1</ShowType>
  <Content><![CDATA[当前帐号于15:30在iPad Air 2设备上登录。若非本人操作，你的登录密码可能已经泄漏，请及时改密。紧急情况可前往http://weixin110.qq.com冻结帐号。]]></Content>
  <Url><![CDATA[]]></Url>
  <DispSec>30</DispSec>
  <Title><![CDATA[]]></Title>
  <Action>4</Action>
  <DelayConnSec>0</DelayConnSec>
  <Countdown>0</Countdown>
  <Ok><![CDATA[]]></Ok>
  <Cancel><![CDATA[]]></Cancel>
  </e>`

  const EXPECTED_MESSAGE = '当前帐号于15:30在iPad Air 2设备上登录。若非本人操作，你的登录密码可能已经泄漏，请及时改密。紧急情况可前往http://weixin110.qq.com冻结帐号。'
  const error = await loginErrorParser(LOGIN_OTHER_DEVICE_WITH_WARNING_2)
  t.equal(error.message, EXPECTED_MESSAGE)
  t.equal(error.type, PadproAutoLoginErrorType.LOGIN_ANOTHER_DEVICE_WITH_WARN)
})

test('loginErrorParser() should parse safety warning error', async t => {
  const SAFETY_LOGOUT = `<e>
  <ShowType>1</ShowType>
  <Content><![CDATA[为了你的帐号安全，请重新登录。]]></Content>
  <Url><![CDATA[]]></Url>
  <DispSec>30</DispSec>
  <Title><![CDATA[]]></Title>
  <Action>4</Action>
  <DelayConnSec>0</DelayConnSec>
  <Countdown>0</Countdown>
  <Ok><![CDATA[]]></Ok>
  <Cancel><![CDATA[]]></Cancel>
  </e>`

  const EXPECTED_MESSAGE = '为了你的帐号安全，请重新登录。'
  const error = await loginErrorParser(SAFETY_LOGOUT)
  t.equal(error.message, EXPECTED_MESSAGE)
  t.equal(error.type, PadproAutoLoginErrorType.SAFETY_LOGOUT)
})

test('loginErrorParser() should parse too frequent error', async t => {
  const TOO_FREQUENT = `<e>
  <ShowType>1</ShowType>
  <Content><![CDATA[你操作频率过快，请稍后再试。]]></Content>
  <Url><![CDATA[]]></Url>
  <DispSec>30</DispSec>
  <Title><![CDATA[]]></Title>
  <Action>4</Action>
  <DelayConnSec>0</DelayConnSec>
  <Countdown>0</Countdown>
  <Ok><![CDATA[]]></Ok>
  <Cancel><![CDATA[]]></Cancel>
  </e>`

  const EXPECTED_MESSAGE = '你操作频率过快，请稍后再试。'
  const error = await loginErrorParser(TOO_FREQUENT)
  t.equal(error.message, EXPECTED_MESSAGE)
  t.equal(error.type, PadproAutoLoginErrorType.TOO_FREQUENT)
})

test('loginErrorParser() should parse unknown error', async t => {
  const UNKNOWN = `<e>
  <ShowType>1</ShowType>
  <Content><![CDATA[Some error may happened in the future]]></Content>
  <Url><![CDATA[]]></Url>
  <DispSec>30</DispSec>
  <Title><![CDATA[]]></Title>
  <Action>4</Action>
  <DelayConnSec>0</DelayConnSec>
  <Countdown>0</Countdown>
  <Ok><![CDATA[]]></Ok>
  <Cancel><![CDATA[]]></Cancel>
  </e>`

  const EXPECTED_MESSAGE = 'Some error may happened in the future'
  const error = await loginErrorParser(UNKNOWN)
  t.equal(error.message, EXPECTED_MESSAGE)
  t.equal(error.type, PadproAutoLoginErrorType.UNKNOWN)
})
