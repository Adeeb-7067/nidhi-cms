const PUBLIC_API_PATHS = new Set([
  "/healthz",
  "/auth/login",
  "/auth/refresh",
  "/auth/forgot-password",
  "/auth/verify-reset-otp",
  "/auth/reset-password",
]);

/** Public sales proposal links — token in URL, no login required. */
const PUBLIC_API_PATH_PREFIXES = [
  "/sales/proposals/view/",
  "/sales/proposals/public/",
];

function isPublicApiRequest(req) {
  if (req.method === "OPTIONS") return true;
  const path = req.path ?? "";
  if (PUBLIC_API_PATHS.has(path)) return true;
  if (PUBLIC_API_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;

  const original = req.originalUrl?.split("?")[0] ?? "";
  if (PUBLIC_API_PATH_PREFIXES.some((prefix) => original.includes(prefix))) return true;

  const mounted = `${req.baseUrl ?? ""}${path}`;
  if (PUBLIC_API_PATH_PREFIXES.some((prefix) => mounted.includes(prefix))) return true;

  return false;
}

export { PUBLIC_API_PATHS, PUBLIC_API_PATH_PREFIXES, isPublicApiRequest };
