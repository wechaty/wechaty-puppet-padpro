import { PadproContactPayload } from '../schemas'

export const generateContactXMLMessage = (payload: PadproContactPayload): string => {
  return `
  <msg
    username="${payload.userName}"
    nickname="${payload.nickName}"
    fullpy="luoxiaoxi"
    shortpy=""
    alias="${payload.alias}"
    imagestatus="3"
    scene="17"
    province="${payload.province}"
    city="${payload.city}"
    sign="${payload.signature}"
    sex="${payload.sex}"
    certflag="0"
    certinfo=""
    brandIconUrl=""
    brandHomeUrl=""
    brandSubscriptConfigUrl=""
    brandFlags="0"
    regionCode="">
  </msg>
  `
}
