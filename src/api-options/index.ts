import * as Attach from './attach'
import * as Base from './base'
import * as Contact from './contact'
import * as Label from './label'
import * as Message from './message'
import * as Room from './room'

import { ApiOption } from './interface'

export const ApiOptions: { [apiName: string]: ApiOption } = {
  ...Attach,
  ...Base,
  ...Message,
  ...Contact,
  ...Room,
  ...Label,
}
