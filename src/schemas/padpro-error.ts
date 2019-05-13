import { PadproErrorType } from './padpro-enums'

export abstract class PadproError extends Error {
  public readonly type: PadproErrorType

  constructor (
    type: PadproErrorType,
    message?: string,
  ) {
    super()
    this.type = type
    this.message = message || ''
  }

  public toString (): string {
    return `PADPRO_ERROR ${this.toSubString()}`
  }

  protected abstract toSubString (): string
}
