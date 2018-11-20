import { log } from '../config'

import { GrpcContactRawPayload, PadproContactPayload } from '../schemas'

const PRE = 'ContactConverter'

export const convertContact = (input: GrpcContactRawPayload): PadproContactPayload => {
  try {
    // TODO: Country is temporary unavailable in GRPC protocol, need more investigation
    // https://github.com/botorange/wechaty-puppet-padpro/issues/1
    return {
      alias            : input.Alias,
      bigHeadUrl       : input.BigHeadImgUrl,
      city             : input.City,
      contactType      : input.ContactType,
      country          : '',
      labelLists       : input.LabelLists,
      nickName         : input.NickName,
      province         : input.Province,
      remark           : input.Remark,
      sex              : input.Sex,
      signature        : input.Signature,
      smallHeadUrl     : input.SmallHeadImgUrl,
      stranger         : input.EncryptUsername,
      ticket           : input.Ticket,
      userName         : input.UserName,
    }
  } catch (e) {
    log.error(PRE, `Convert contact failed, failed contact: ${JSON.stringify(input)}`)
    throw e
  }
}
