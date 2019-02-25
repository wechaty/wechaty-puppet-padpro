import { GrpcContactRawPayload, PadproContactPayload } from '../schemas'

/**
 * Merge contact new data with old data to keep alias value
 * @param oldContact old contact that from sync api
 * @param newContact new contact that from get api
 */
export const updateContact = (
  oldContact: PadproContactPayload,
  newContact: GrpcContactRawPayload,
): PadproContactPayload => {
  return {
    alias            : oldContact.alias || newContact.Alias,
    bigHeadUrl       : newContact.BigHeadImgUrl || oldContact.bigHeadUrl,
    city             : newContact.City,
    contactType      : newContact.ContactType || oldContact.contactType,
    country          : oldContact.country,
    labelLists       : newContact.LabelLists || oldContact.labelLists,
    nickName         : newContact.NickName || oldContact.nickName,
    province         : newContact.Province,
    remark           : newContact.Remark,
    sex              : newContact.Sex || oldContact.sex,
    signature        : newContact.Signature,
    smallHeadUrl     : newContact.SmallHeadImgUrl || oldContact.smallHeadUrl,
    stranger         : newContact.EncryptUsername,
    ticket           : newContact.Ticket,
    userName         : newContact.UserName || oldContact.userName,
  }
}
