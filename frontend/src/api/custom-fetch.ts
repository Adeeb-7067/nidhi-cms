export type CustomFetchOptions = RequestInit & {
  responseType?: "json" | "text" | "blob" | "auto";
};

export type ErrorType<T = unknown> = ApiError<T>;

export type BodyType<T> = T;

export type AuthTokenGetter = () => Promise<string | null> | string | null;

const NO_BODY_STATUS = new Set([204, 205, 304]);
const DEFAULT_JSON_ACCEPT = "application/json, application/problem+json";

// ---------------------------------------------------------------------------
// Module-level configuration
// ---------------------------------------------------------------------------

let _baseUrl: string | null = null;
let _authTokenGetter: AuthTokenGetter | null = null;

// Token refresh concurrency queueing
let _isRefreshing = false;
let _refreshSubscribers: Array<(token: string | null) => void> = [];

function _subscribeTokenRefresh(cb: (token: string | null) => void) {
  _refreshSubscribers.push(cb);
}

function _onRefreshed(token: string | null) {
  _refreshSubscribers.forEach((cb) => cb(token));
  _refreshSubscribers = [];
}

/**
 * Set a base URL that is prepended to every relative request URL
 * (i.e. paths that start with `/`).
 *
 * Useful for Expo bundles that need to call a remote API server.
 * Pass `null` to clear the base URL.
 */
export function setBaseUrl(url: string | null): void {
  _baseUrl = url ? url.replace(/\/+$/, "") : null;
}

/**
 * Register a getter that supplies a bearer auth token.  Before every fetch
 * the getter is invoked; when it returns a non-null string, an
 * `Authorization: Bearer <token>` header is attached to the request.
 *
 * Useful for Expo bundles making token-gated API calls.
 * Pass `null` to clear the getter.
 *
 * NOTE: This function should never be used in web applications where session
 * token cookies are automatically associated with API calls by the browser.
 */
export function setAuthTokenGetter(getter: AuthTokenGetter | null): void {
  _authTokenGetter = getter;
}

function isRequest(input: RequestInfo | URL): input is Request {
  return typeof Request !== "undefined" && input instanceof Request;
}

function resolveMethod(input: RequestInfo | URL, explicitMethod?: string): string {
  if (explicitMethod) return explicitMethod.toUpperCase();
  if (isRequest(input)) return input.method.toUpperCase();
  return "GET";
}

// Use loose check for URL — some runtimes (e.g. React Native) polyfill URL
// differently, so `instanceof URL` can fail.
function isUrl(input: RequestInfo | URL): input is URL {
  return typeof URL !== "undefined" && input instanceof URL;
}

function applyBaseUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (!_baseUrl) return input;
  const url = resolveUrl(input);
  // Only prepend to relative paths (starting with /)
  if (!url.startsWith("/")) return input;

  const base = _baseUrl.replace(/\/+$/, "");
  let path = url;

  // Orval paths omit `/api`; manual callers often include it — avoid `/api/api/...`.
  if (base.endsWith("/api") && (path === "/api" || path.startsWith("/api/"))) {
    path = path === "/api" ? "/" : path.slice(4);
  }

  const absolute = `${base}${path}`;
  if (typeof input === "string") return absolute;
  if (isUrl(input)) return new URL(absolute);
  return new Request(absolute, input as Request);
}

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (isUrl(input)) return input.toString();
  return input.url;
}

function mergeHeaders(...sources: Array<HeadersInit | undefined>): Headers {
  const headers = new Headers();

  for (const source of sources) {
    if (!source) continue;
    new Headers(source).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return headers;
}

function getMediaType(headers: Headers): string | null {
  const value = headers.get("content-type");
  return value ? value.split(";", 1)[0].trim().toLowerCase() : null;
}

function isJsonMediaType(mediaType: string | null): boolean {
  return mediaType === "application/json" || Boolean(mediaType?.endsWith("+json"));
}

function isTextMediaType(mediaType: string | null): boolean {
  return Boolean(
    mediaType &&
      (mediaType.startsWith("text/") ||
        mediaType === "application/xml" ||
        mediaType === "text/xml" ||
        mediaType.endsWith("+xml") ||
        mediaType === "application/x-www-form-urlencoded"),
  );
}

// Use strict equality: in browsers, `response.body` is `null` when the
// response genuinely has no content.  In React Native, `response.body` is
// always `undefined` because the ReadableStream API is not implemented —
// even when the response carries a full payload readable via `.text()` or
// `.json()`.  Loose equality (`== null`) matches both `null` and `undefined`,
// which causes every React Native response to be treated as empty.
function hasNoBody(response: Response, method: string): boolean {
  if (method === "HEAD") return true;
  if (NO_BODY_STATUS.has(response.status)) return true;
  if (response.headers.get("content-length") === "0") return true;
  if (response.body === null) return true;
  return false;
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function looksLikeJson(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function getStringField(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object") return undefined;

  const candidate = (value as Record<string, unknown>)[key];
  if (typeof candidate !== "string") return undefined;

  const trimmed = candidate.trim();
  return trimmed === "" ? undefined : trimmed;
}


function buildErrorMessage(response: Response, data: unknown): string {
  const payload = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  const field = typeof payload?.field === "string" ? payload.field : undefined;

  const fromBody =
    (typeof payload?.message === "string" && payload.message.trim()) ||
    (typeof payload?.error === "string" && payload.error.trim()) ||
    (typeof payload?.error_description === "string" && payload.error_description.trim()) ||
    (typeof payload?.detail === "string" && payload.detail.trim());

  if (fromBody) {
    if (field && !fromBody.toLowerCase().includes(field.toLowerCase())) {
      const labels: Record<string, string> = {
        email: "Contact email",
        portalEmail: "Portal login email",
        password: "Portal password",
      };
      const label = labels[field] ?? field;
      if (!fromBody.toLowerCase().includes(label.toLowerCase())) {
        return `${label}: ${fromBody}`;
      }
    }
    return fromBody;
  }

  const title = getStringField(data, "title");
  const detail = getStringField(data, "detail");
  if (title && detail) return `${title} — ${detail}`;

  const hints: Record<number, string> = {
    400: "Check your input and try again.",
    401: "Your session expired. Please sign in again.",
    403: "You do not have permission to do that.",
    404: "That item was not found.",
    409: field
      ? `${field === "portalEmail" ? "Portal login email" : field === "email" ? "Contact email" : field} is already in use.`
      : "This conflicts with existing data.",
    422: "Some fields are invalid.",
    429: "Too many requests. Wait a moment and try again.",
    500: "Something went wrong. Please try again.",
  };

  return hints[response.status] ?? "Something went wrong. Please try again.";
}

export class ApiError<T = unknown> extends Error {
  readonly name = "ApiError";
  readonly status: number;
  readonly statusText: string;
  readonly data: T | null;
  readonly headers: Headers;
  readonly response: Response;
  readonly method: string;
  readonly url: string;

  constructor(
    response: Response,
    data: T | null,
    requestInfo: { method: string; url: string },
  ) {
    super(buildErrorMessage(response, data));
    Object.setPrototypeOf(this, new.target.prototype);

    this.status = response.status;
    this.statusText = response.statusText;
    this.data = data;
    this.headers = response.headers;
    this.response = response;
    this.method = requestInfo.method;
    this.url = response.url || requestInfo.url;
  }
}

export class ResponseParseError extends Error {
  readonly name = "ResponseParseError";
  readonly status: number;
  readonly statusText: string;
  readonly headers: Headers;
  readonly response: Response;
  readonly method: string;
  readonly url: string;
  readonly rawBody: string;
  readonly cause: unknown;

  constructor(
    response: Response,
    rawBody: string,
    cause: unknown,
    requestInfo: { method: string; url: string },
  ) {
    super(
      `Failed to parse response from ${requestInfo.method} ${response.url || requestInfo.url} ` +
        `(${response.status} ${response.statusText}) as JSON`,
    );
    Object.setPrototypeOf(this, new.target.prototype);

    this.status = response.status;
    this.statusText = response.statusText;
    this.headers = response.headers;
    this.response = response;
    this.method = requestInfo.method;
    this.url = response.url || requestInfo.url;
    this.rawBody = rawBody;
    this.cause = cause;
  }
}

async function parseJsonBody(
  response: Response,
  requestInfo: { method: string; url: string },
): Promise<unknown> {
  const raw = await response.text();
  const normalized = stripBom(raw);

  if (normalized.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(normalized);
  } catch (cause) {
    throw new ResponseParseError(response, raw, cause, requestInfo);
  }
}

async function parseErrorBody(response: Response, method: string): Promise<unknown> {
  if (hasNoBody(response, method)) {
    return null;
  }

  const mediaType = getMediaType(response.headers);

  // Fall back to text when blob() is unavailable (e.g. some React Native builds).
  if (mediaType && !isJsonMediaType(mediaType) && !isTextMediaType(mediaType)) {
    return typeof response.blob === "function" ? response.blob() : response.text();
  }

  const raw = await response.text();
  const normalized = stripBom(raw);
  const trimmed = normalized.trim();

  if (trimmed === "") {
    return null;
  }

  if (isJsonMediaType(mediaType) || looksLikeJson(normalized)) {
    try {
      return JSON.parse(normalized);
    } catch {
      return raw;
    }
  }

  return raw;
}

function inferResponseType(response: Response): "json" | "text" | "blob" {
  const mediaType = getMediaType(response.headers);

  if (isJsonMediaType(mediaType)) return "json";
  if (isTextMediaType(mediaType) || mediaType == null) return "text";
  return "blob";
}

async function parseSuccessBody(
  response: Response,
  responseType: "json" | "text" | "blob" | "auto",
  requestInfo: { method: string; url: string },
): Promise<unknown> {
  if (hasNoBody(response, requestInfo.method)) {
    return null;
  }

  const effectiveType =
    responseType === "auto" ? inferResponseType(response) : responseType;

  switch (effectiveType) {
    case "json":
      return parseJsonBody(response, requestInfo);

    case "text": {
      const text = await response.text();
      return text === "" ? null : text;
    }

    case "blob":
      if (typeof response.blob !== "function") {
        throw new TypeError(
          "Blob responses are not supported in this runtime. " +
            "Use responseType \"json\" or \"text\" instead.",
        );
      }
      return response.blob();
  }
}

export async function customFetch<T = unknown>(
  input: RequestInfo | URL,
  options: CustomFetchOptions = {},
): Promise<T> {
  input = applyBaseUrl(input);
  const { responseType = "auto", headers: headersInit, ...init } = options;

  const method = resolveMethod(input, init.method);

  if (init.body != null && (method === "GET" || method === "HEAD")) {
    throw new TypeError(`customFetch: ${method} requests cannot have a body.`);
  }

  const headers = mergeHeaders(isRequest(input) ? input.headers : undefined, headersInit);

  if (
    typeof init.body === "string" &&
    !headers.has("content-type") &&
    looksLikeJson(init.body)
  ) {
    headers.set("content-type", "application/json");
  }

  if (responseType === "json" && !headers.has("accept")) {
    headers.set("accept", DEFAULT_JSON_ACCEPT);
  }

  // Attach bearer token when an auth getter is configured and no
  // Authorization header has been explicitly provided.
  if (!headers.has("authorization")) {
    const token = _authTokenGetter
      ? await _authTokenGetter()
      : typeof localStorage !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const requestInfo = { method, url: resolveUrl(input) };

  let response = await fetch(input, { cache: "no-store", ...init, method, headers });

  // Transparent Refresh Token Interception
  if (
    response.status === 401 &&
    !requestInfo.url.includes("/auth/refresh") &&
    !requestInfo.url.includes("/auth/login")
  ) {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          const newToken = await new Promise<string | null>((resolve) => {
            _subscribeTokenRefresh((token) => {
              resolve(token);
            });

            if (!_isRefreshing) {
              _isRefreshing = true;
              const refreshUrl = _baseUrl ? `${_baseUrl}/auth/refresh` : "/api/auth/refresh";
              
              fetch(refreshUrl, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ refreshToken }),
              })
                .then(async (res) => {
                  if (res.ok) {
                    const data = await res.json();
                    if (data.accessToken && data.refreshToken) {
                      localStorage.setItem("accessToken", data.accessToken);
                      localStorage.setItem("refreshToken", data.refreshToken);
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(
                          new CustomEvent("cms:auth-token-refreshed", {
                            detail: { accessToken: data.accessToken },
                          }),
                        );
                      }
                      _onRefreshed(data.accessToken);
                      return;
                    }
                  }
                  throw new Error("Refresh failed");
                })
                .catch(() => {
                  localStorage.removeItem("accessToken");
                  localStorage.removeItem("refreshToken");
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("cms:auth-session-expired"));
                  }
                  _onRefreshed(null);
                })
                .finally(() => {
                  _isRefreshing = false;
                });
            }
          });

          if (newToken) {
            headers.set("Authorization", `Bearer ${newToken}`);
            response = await fetch(input, { cache: "no-store", ...init, method, headers });
          }
        } catch {
          // Carry on to normal 401 throw
        }
      }
    }
  }

  if (!response.ok) {
    const errorData = await parseErrorBody(response, method);
    throw new ApiError(response, errorData, requestInfo);
  }

  return (await parseSuccessBody(response, responseType, requestInfo)) as T;
}
