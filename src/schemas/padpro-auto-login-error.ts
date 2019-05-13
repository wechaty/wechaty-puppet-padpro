import { PadproAutoLoginErrorType, PadproErrorType } from './padpro-enums'
import { PadproError } from './padpro-error'

export class PadproAutoLoginError extends PadproError {
  public readonly subType: PadproAutoLoginErrorType

  constructor (
    subType: PadproAutoLoginErrorType,
    message: string
  ) {
    super(
      PadproErrorType.LOGIN,
      message,
    )
    this.subType = subType
  }

  protected toSubString () {
    return `${PadproErrorType.LOGIN} ${this.subType} ${this.message}`
  }
}
