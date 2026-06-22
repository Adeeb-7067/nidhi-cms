/**
 * Foreground window patterns that trigger full screenshot blur when
 * screenshot monitoring is active.
 *
 * Matches against process name + window title (case-insensitive).
 */

const SENSITIVE_PATTERNS = [
  // Messaging
  'whatsapp',
  'web.whatsapp',
  'telegram',
  'messenger',
  'snapchat',
  'viber',
  'wechat',

  // Email
  'gmail',
  'google mail',
  'mail.google',
  'outlook',
  'hotmail',
  'live mail',
  'yahoo mail',
  'mail.yahoo',
  'protonmail',
  'proton mail',
  'thunderbird',
  'spark mail',
  'fastmail',
  'zoho mail',
  'hey.com',
  'superhuman',
  'mailbird',

  // Social (personal messaging / microblogging only — not Facebook / IG / LinkedIn)
  'twitter',
  ' x.com',

  // Personal mail clients (Windows / macOS)
  'windows mail',
];

/** Exact process names (lowercase) that always trigger blur. */
const SENSITIVE_PROCESS_NAMES = new Set([
  'whatsapp',
  'telegram',
  'messenger',
  'snapchat',
  'viber',
  'wechat',
  'thunderbird',
  'mailbird',
  'signal',
  'line',
]);

const BROWSER_PROCESS_NAMES = new Set([
  'chrome',
  'msedge',
  'firefox',
  'brave',
  'opera',
  'vivaldi',
  'safari',
]);

/** Browser tab title fragments for mail / messaging web apps. */
const BROWSER_SENSITIVE_TITLE_PATTERNS = [
  /\bwhatsapp\b/i,
  /\bweb\.whatsapp\b/i,
  /\bgmail\b/i,
  /\bmail\.google\b/i,
  /\bgoogle mail\b/i,
  /\boutlook\b/i,
  /\bhotmail\b/i,
  /\byahoo\s*mail\b/i,
  /\bproton\s*mail\b/i,
  /\bprotonmail\b/i,
  /\btelegram\b/i,
  /\bmessenger\b/i,
  /\bsignal\b/i,
  /\binbox\b/i,
  /\bcompose\b/i,
];

/** Apps whose window title alone can match shorter mail keywords. */
const MAIL_TITLE_PATTERNS = [
  /^mail\s*[-–—|]/i,
  /[-–—|]\s*mail$/i,
  /\binbox\b/i,
  /\boutlook\b/i,
];

const OWN_APP_MARKERS = ['cms desktop', 'content management hub'];

/** Never blur when these IDE / editor processes are in the foreground. */
const WORK_APP_PROCESSES = new Set([
  'code',
  'cursor',
  'devenv',
  'idea64',
  'pycharm64',
  'webstorm64',
  'rider64',
  'goland64',
  'phpstorm64',
  'clion64',
  'rider',
  'sublime_text',
  'notepad++',
  'windowsterminal',
  'cmd',
]);

const WORK_APP_TITLE_MARKERS = ['visual studio code', 'vscode', ' - cursor'];

function normalizeProcessName(name) {
  return String(name || '').trim().toLowerCase();
}

function isBrowserProcess(processName) {
  return BROWSER_PROCESS_NAMES.has(normalizeProcessName(processName));
}

function isWorkApp(windowInfo) {
  const ownerName = normalizeProcessName(windowInfo.owner?.name);
  const title = (windowInfo.title || '').toLowerCase();
  if (WORK_APP_PROCESSES.has(ownerName)) return true;
  return WORK_APP_TITLE_MARKERS.some((m) => title.includes(m));
}

/** Signal messenger — avoid matching filenames like signal.ts in editors. */
function isSignalApp(windowInfo) {
  const ownerName = normalizeProcessName(windowInfo.owner?.name);
  const title = (windowInfo.title || '').trim();
  if (ownerName === 'signal') return true;
  return /^signal(\s|$|[-–—|])/i.test(title);
}

/** LINE messenger — avoid matching "online", "timeline", etc. */
function isLineApp(windowInfo) {
  const ownerName = normalizeProcessName(windowInfo.owner?.name);
  const title = (windowInfo.title || '').trim();
  if (ownerName === 'line') return true;
  return /^line(\s|$|[-–—|])/i.test(title);
}

function isBrowserSensitiveTab(windowInfo) {
  const ownerName = normalizeProcessName(windowInfo.owner?.name);
  const title = windowInfo.title || '';
  if (!isBrowserProcess(ownerName)) return false;
  return BROWSER_SENSITIVE_TITLE_PATTERNS.some((re) => re.test(title));
}

function isSensitiveForegroundApp(windowInfo) {
  if (!windowInfo) return false;

  const ownerName = normalizeProcessName(windowInfo.owner?.name);
  const title = (windowInfo.title || '').toLowerCase();
  const haystack = `${ownerName} ${title}`;

  if (OWN_APP_MARKERS.some((m) => haystack.includes(m))) {
    return false;
  }

  if (isWorkApp(windowInfo)) {
    return false;
  }

  if (SENSITIVE_PROCESS_NAMES.has(ownerName)) {
    return true;
  }

  if (isSignalApp(windowInfo) || isLineApp(windowInfo)) {
    return true;
  }

  if (isBrowserSensitiveTab(windowInfo)) {
    return true;
  }

  if (SENSITIVE_PATTERNS.some((p) => haystack.includes(p))) {
    return true;
  }

  // Browser tab titles like "Inbox - Gmail" or "Mail - John"
  if (MAIL_TITLE_PATTERNS.some((re) => re.test(windowInfo.title || ''))) {
    if (/gmail|outlook|yahoo|proton|mail\.google|hotmail|live\.com/i.test(haystack)) {
      return true;
    }
    if (/\binbox\b/i.test(title) && isBrowserProcess(ownerName)) {
      return true;
    }
  }

  // Windows Store / UWP host — rely on title containing the app name.
  if (ownerName === 'applicationframehost' && SENSITIVE_PATTERNS.some((p) => title.includes(p))) {
    return true;
  }

  return false;
}

module.exports = {
  isSensitiveForegroundApp,
  SENSITIVE_PATTERNS,
  SENSITIVE_PROCESS_NAMES,
};
