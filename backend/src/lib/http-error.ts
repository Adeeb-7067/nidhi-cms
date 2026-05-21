/** Structured HTTP error — caught by global error middleware. */
export class HttpError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly field?: string;
  readonly details?: Record<string, string[]>;

  constructor(
    statusCode: number,
    message: string,
    options?: {
      code?: string;
      field?: string;
      details?: Record<string, string[]>;
      cause?: unknown;
    },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = options?.code ?? statusToCode(statusCode);
    this.field = options?.field;
    this.details = options?.details;
  }
}

function statusToCode(status: number): string {
  const map: Record<number, string> = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    413: "PAYLOAD_TOO_LARGE",
    422: "VALIDATION_ERROR",
    429: "TOO_MANY_REQUESTS",
    500: "INTERNAL_ERROR",
  };
  return map[status] ?? "ERROR";
}

export function isHttpError(err: unknown): err is HttpError {
  return err instanceof HttpError;
}
