const { execFile } = require('child_process');
const { promisify } = require('util');
const sharp = require('sharp');

const execFileAsync = promisify(execFile);

/** Strong enough to hide text; admins still see activity timing. */
const BLUR_SIGMA = 14;

async function applyFullBlur(pngBuffer) {
  return sharp(pngBuffer).blur(BLUR_SIGMA).png().toBuffer();
}

/** Windows: PowerShell + user32 — no native Node addon required for builds. */
async function getForegroundWindowWin() {
  const script = `
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public class CmsForegroundWindow {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder sb, int count);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
}
'@
$h = [CmsForegroundWindow]::GetForegroundWindow()
$sb = New-Object System.Text.StringBuilder 512
[void][CmsForegroundWindow]::GetWindowText($h, $sb, 512)
$foregroundPid = [uint32]0
[void][CmsForegroundWindow]::GetWindowThreadProcessId($h, [ref]$foregroundPid)
$name = $null
try { $name = (Get-Process -Id $foregroundPid -ErrorAction Stop).ProcessName } catch {}
@{ title = $sb.ToString(); owner = @{ name = $name } } | ConvertTo-Json -Compress
`.trim();

  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { timeout: 8000, windowsHide: true, maxBuffer: 1024 * 64 },
  );
  const parsed = JSON.parse(String(stdout).trim());
  return {
    title: parsed.title || '',
    owner: { name: parsed.owner?.name || '' },
  };
}

/** macOS dev fallback (osascript — no native npm addon). */
async function getForegroundWindowMac() {
  const script = `
    tell application "System Events"
      set frontProc to first application process whose frontmost is true
      set procName to name of frontProc
      set winTitle to ""
      try
        set winTitle to name of front window of frontProc
      end try
    end tell
    return procName & "\\t" & winTitle
  `;
  const { stdout } = await execFileAsync('osascript', ['-e', script], {
    timeout: 8000,
    maxBuffer: 1024 * 64,
  });
  const [name = '', title = ''] = String(stdout).trim().split('\t');
  return { title, owner: { name } };
}

async function getForegroundWindow() {
  try {
    if (process.platform === 'win32') {
      return await getForegroundWindowWin();
    }
    if (process.platform === 'darwin') {
      return await getForegroundWindowMac();
    }
    return null;
  } catch (err) {
    const brief = String(err?.message || err).split('\n')[0].slice(0, 160);
    console.warn('[screenshot] could not read foreground window:', brief);
    return null;
  }
}

function normalizeWindowReading(raw) {
  if (!raw || typeof raw !== 'object') {
    return { title: '', owner: { name: '' } };
  }
  return {
    title: raw.title || '',
    owner: { name: raw.owner?.name || '' },
  };
}

function parseSampleOutput(stdout) {
  const parsed = JSON.parse(String(stdout).trim());
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  return rows.map(normalizeWindowReading);
}

/**
 * Sample the foreground window several times in one PowerShell call so we
 * catch last-second switches to WhatsApp/Gmail right before a scheduled capture.
 */
async function sampleForegroundWindowWin({ samples = 3, gapMs = 70 } = {}) {
  const count = Math.max(1, Math.min(samples, 5));
  const gap = Math.max(20, Math.min(gapMs, 200));
  const script = `
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public class CmsForegroundWindow {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder sb, int count);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
}
'@
$results = @()
for ($i = 0; $i -lt ${count}; $i++) {
  if ($i -gt 0) { Start-Sleep -Milliseconds ${gap} }
  $h = [CmsForegroundWindow]::GetForegroundWindow()
  $sb = New-Object System.Text.StringBuilder 512
  [void][CmsForegroundWindow]::GetWindowText($h, $sb, 512)
  $foregroundPid = [uint32]0
  [void][CmsForegroundWindow]::GetWindowThreadProcessId($h, [ref]$foregroundPid)
  $name = $null
  try { $name = (Get-Process -Id $foregroundPid -ErrorAction Stop).ProcessName } catch {}
  $results += [pscustomobject]@{ title = $sb.ToString(); owner = @{ name = $name } }
}
$results | ConvertTo-Json -Compress -Depth 4
`.trim();

  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { timeout: 8000, windowsHide: true, maxBuffer: 1024 * 64 },
  );
  return parseSampleOutput(stdout);
}

async function sampleForegroundWindowMac({ samples = 3, gapMs = 70 } = {}) {
  const count = Math.max(1, Math.min(samples, 5));
  const gap = Math.max(20, Math.min(gapMs, 200));
  const readings = [];
  for (let i = 0; i < count; i += 1) {
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, gap));
    }
    readings.push(await getForegroundWindowMac());
  }
  return readings.map(normalizeWindowReading);
}

async function sampleForegroundWindow(options) {
  try {
    if (process.platform === 'win32') {
      return await sampleForegroundWindowWin(options);
    }
    if (process.platform === 'darwin') {
      return await sampleForegroundWindowMac(options);
    }
    const single = await getForegroundWindow();
    return single ? [normalizeWindowReading(single)] : [];
  } catch (err) {
    const brief = String(err?.message || err).split('\n')[0].slice(0, 160);
    console.warn('[screenshot] foreground sampling failed:', brief);
    const single = await getForegroundWindow();
    return single ? [normalizeWindowReading(single)] : [];
  }
}

function formatForegroundLabel(windowInfo) {
  return windowInfo?.title || windowInfo?.owner?.name || 'unknown';
}

/**
 * Privacy-first pre-capture: blur if a sensitive app appears in any sample
 * during the short window right before desktopCapturer runs.
 */
async function detectSensitiveBeforeCapture(isSensitiveForegroundApp, options = {}) {
  const readings = await sampleForegroundWindow(options);
  const hit = readings.find(isSensitiveForegroundApp);
  if (hit) {
    return { shouldBlur: true, window: hit, phase: 'pre-capture' };
  }
  return {
    shouldBlur: false,
    window: readings[readings.length - 1] || null,
    phase: null,
  };
}

module.exports = {
  applyFullBlur,
  getForegroundWindow,
  sampleForegroundWindow,
  detectSensitiveBeforeCapture,
  formatForegroundLabel,
  BLUR_SIGMA,
};
