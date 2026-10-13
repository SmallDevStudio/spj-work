export class ApplicationError extends Error {
  constructor({ code, message, status = 400, details = null }) {
    super(message);

    this.name = "ApplicationError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
