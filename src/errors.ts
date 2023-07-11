// see https://stackoverflow.com/a/41102306
const CAN_SET_PROTOTYPE = "setPrototypeOf" in Object;

export class ApiError extends Error {
  public constructor(message?: string) {
    super(message ?? "Api request failed");
    this.name = this.constructor.name;
    if (CAN_SET_PROTOTYPE) Object.setPrototypeOf(this, new.target.prototype);
  }
}
