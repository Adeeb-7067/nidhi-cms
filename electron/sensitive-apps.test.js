/**
 * Regression tests for sensitive-app blur detection.
 * Run: node sensitive-apps.test.js
 */
const assert = require('assert');
const { isSensitiveForegroundApp } = require('./sensitive-apps');

function win(title, processName) {
  return { title, owner: { name: processName } };
}

const cases = [
  { label: 'WhatsApp desktop', window: win('Mom', 'WhatsApp'), expect: true },
  { label: 'WhatsApp Web in Chrome', window: win('(3) WhatsApp', 'chrome'), expect: true },
  { label: 'Gmail in Chrome', window: win('Inbox (12) - user@gmail.com - Gmail', 'chrome'), expect: true },
  { label: 'Gmail in Edge', window: win('Gmail', 'msedge'), expect: true },
  { label: 'Outlook web', window: win('Mail - Outlook', 'chrome'), expect: true },
  { label: 'VS Code', window: win('app.ts - project - Visual Studio Code', 'Code'), expect: false },
  { label: 'Cursor IDE', window: win('main.js - project - Cursor', 'Cursor'), expect: false },
  { label: 'CMS Desktop', window: win('CMS Desktop', 'CMS Desktop'), expect: false },
  { label: 'Generic browser tab', window: win('GitHub - pull requests', 'chrome'), expect: false },
  { label: 'UWP WhatsApp host', window: win('WhatsApp', 'ApplicationFrameHost'), expect: true },
  { label: 'Broken powershell fallback must not skip blur', window: win('Inbox - Gmail', 'powershell'), expect: true },
];

let failed = 0;
for (const { label, window: w, expect } of cases) {
  const result = isSensitiveForegroundApp(w);
  try {
    assert.strictEqual(result, expect, `expected ${expect} got ${result}`);
    console.log(`OK  ${label}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL ${label}: ${err.message}`);
  }
}

if (failed > 0) {
  process.exitCode = 1;
  console.error(`\n${failed} test(s) failed`);
} else {
  console.log(`\nAll ${cases.length} tests passed`);
}
