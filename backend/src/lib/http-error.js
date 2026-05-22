class HttpError extends Error {
  statusCode;
  code;
  field;
  details;
  constructor(statusCode, message, options) {
    super(message, options?.cause ? { cause: options.cause } : void 0);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = options?.code ?? statusToCode(statusCode);
    this.field = options?.field;
    this.details = options?.details;
  }
}
function statusToCode(status) {
  const map = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    413: "PAYLOAD_TOO_LARGE",
    422: "VALIDATION_ERROR",
    429: "TOO_MANY_REQUESTS",
    500: "INTERNAL_ERROR"
  };
  return map[status] ?? "ERROR";
}
function isHttpError(err) {
  return err instanceof HttpError;
}
export {
  HttpError,
  isHttpError
};
