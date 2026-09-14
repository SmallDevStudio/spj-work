import "server-only";

export class AuthSessionError extends Error {
  constructor({ code, message, status = 401 }) {
    super(message);

    this.name = "AuthSessionError";
    this.code = code;
    this.status = status;
  }
}
