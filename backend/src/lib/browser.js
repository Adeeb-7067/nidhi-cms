import puppeteer from "puppeteer";
import { logger } from "./logger.js";

/**
 * Shared, lazily-launched Chromium instance reused across all server-side PDF
 * generation. Launching a fresh browser per request costs several hundred ms
 * to multiple seconds and 100-300MB RAM — reusing one process and opening a
 * new page per call is the standard puppeteer server pattern.
 */
let browserPromise = null;

async function launchBrowser() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  browser.on("disconnected", () => {
    logger.warn("Shared Puppeteer browser disconnected; will relaunch on next use");
    browserPromise = null;
  });
  return browser;
}

/** Returns the shared browser, launching it on first use or after a crash. */
export async function getSharedBrowser() {
  if (!browserPromise) {
    browserPromise = launchBrowser();
  }
  try {
    return await browserPromise;
  } catch (err) {
    browserPromise = null;
    throw err;
  }
}

/** Opens a page on the shared browser, retrying once with a fresh browser if the pool died. */
export async function withBrowserPage(fn) {
  try {
    const browser = await getSharedBrowser();
    const page = await browser.newPage();
    try {
      return await fn(page);
    } finally {
      await page.close();
    }
  } catch (err) {
    if (browserPromise) throw err;
    const browser = await getSharedBrowser();
    const page = await browser.newPage();
    try {
      return await fn(page);
    } finally {
      await page.close();
    }
  }
}
