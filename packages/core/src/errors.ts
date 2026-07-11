/**
 * Stable, machine-readable error codes. User-facing copy is resolved from
 * these codes through i18n — never from `message`, which is for logs.
 */
export type OmnioErrorCode =
  | "internal"
  | "validation"
  | "not_found"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "payload_too_large"
  | "unsupported_media";

export class OmnioError extends Error {
  readonly code: OmnioErrorCode;
  /** Safe to surface to the client; never contains user input echoes. */
  readonly publicDetail?: string;

  constructor(code: OmnioErrorCode, message: string, publicDetail?: string) {
    super(message);
    this.name = "OmnioError";
    this.code = code;
    this.publicDetail = publicDetail;
  }
}
