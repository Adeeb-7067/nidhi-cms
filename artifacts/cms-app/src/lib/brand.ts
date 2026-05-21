/** App branding — configure via `artifacts/cms-app/.env` (VITE_APP_*). Logo: `public/logo.png`. */
function env(key: string, fallback: string): string {
  const value = import.meta.env[key as keyof ImportMetaEnv];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

const appName = env("VITE_APP_NAME", "CMS");
const appShortName = env("VITE_APP_SHORT_NAME", appName);
const logoSrc = env("VITE_APP_LOGO", "/logo.png");

export const BRAND = {
  name: appName,
  shortName: appShortName,
  logoSrc,
  faviconSrc: logoSrc,
  copyright: env("VITE_APP_COPYRIGHT", `© ${new Date().getFullYear()} ${appName}. All rights reserved.`),
  description: env(
    "VITE_APP_DESCRIPTION",
    "Content management, project workflow, and team collaboration platform.",
  ),
} as const;
