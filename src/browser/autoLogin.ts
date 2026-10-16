/** Automated DeepSeek account login: fills the login form and waits for the session token. */
import type { Locator, Page } from "playwright-core";

import type { Logger } from "../utils/logger.js";
import { errorMessage } from "../utils/errors.js";
import { readUserToken } from "./authDump.js";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AutoLoginOptions {
  /** DeepSeek page the login form lives on. */
  baseUrl: string;
  /** How long to wait for the session token after submitting the form. */
  timeoutMs?: number;
}

export type AutoLoginOutcome =
  | { status: "ok" }
  | { status: "needs-interaction"; reason: string }
  | { status: "failed"; reason: string };

/** Email inputs, covering English and Chinese DeepSeek builds. */
const EMAIL_SELECTORS = [
  'input[type="email"]',
  'input[autocomplete="email"]',
  'input[autocomplete="username"]',
  'input[name="email" i]',
  'input[placeholder*="mail" i]',
  'input[placeholder*="邮箱"]',
];

const PASSWORD_SELECTORS = [
  'input[type="password"]',
  'input[autocomplete="current-password"]',
  'input[autocomplete="new-password"]',
  'input[name="password" i]',
  'input[placeholder*="password" i]',
  'input[placeholder*="密码"]',
];

const SUBMIT_BUTTON_SELECTORS = ['button[type="submit"]', 'input[type="submit"]'];

/** Exact button labels that advance the login form. */
const SUBMIT_BUTTON_TEXT = /^(log ?in|sign ?in|continue|next|登录|继续|下一步)$/i;

/** Labels that open the login dialog from the landing page. */
const LOGIN_TRIGGER_TEXT = /^(log ?in|sign ?in|登录)$/i;

/** Inputs DeepSeek shows when an email verification code is required. */
const CODE_SELECTORS = [
  'input[autocomplete="one-time-code"]',
  'input[name*="code" i]',
  'input[placeholder*="code" i]',
  'input[placeholder*="验证码"]',
];

const CAPTCHA_SELECTORS = [
  'iframe[src*="captcha" i]',
  'iframe[src*="recaptcha" i]',
  '[class*="captcha" i]',
  '[id*="captcha" i]',
];

const ERROR_CONTAINER_SELECTORS = [
  '[role="alert"]',
  '[class*="error" i]',
  '[class*="toast" i]',
  '[class*="message" i]',
];

/** Text that means DeepSeek refused the credentials. */
const LOGIN_ERROR_TEXT =
  /(incorrect|invalid|wrong|does ?n[o']t match|unable to log ?in|try again|错误|不正确|无效|密码错误|登录失败|账号)/i;

const POLL_INTERVAL_MS = 1_000;

/** Run the automated login; never throws, always reports an outcome. */
export async function autoLogin(
  page: Page,
  credentials: LoginCredentials,
  logger: Logger,
  options: AutoLoginOptions,
): Promise<AutoLoginOutcome> {
  try {
    return await runAutoLogin(page, credentials, logger, options);
  } catch (error) {
    return { status: "failed", reason: errorMessage(error) };
  }
}

async function runAutoLogin(
  page: Page,
  credentials: LoginCredentials,
  logger: Logger,
  options: AutoLoginOptions,
): Promise<AutoLoginOutcome> {
  await ensureOnDeepSeek(page, options.baseUrl);
  if (await hasUserToken(page)) return { status: "ok" };

  await openLoginDialog(page);

  const email = await findVisible(page, EMAIL_SELECTORS, 10_000);
  if (!email) {
    return { status: "failed", reason: "login form not found: no email field on the page" };
  }
  await email.fill(credentials.email);
  logger.debug("auto-login: email entered");

  // Some builds ask for the email first and reveal the password field afterwards.
  let password = await findVisible(page, PASSWORD_SELECTORS, 2_000);
  if (!password) {
    if (!(await clickSubmit(page))) await email.press("Enter");
    password = await findVisible(page, PASSWORD_SELECTORS, 10_000);
  }
  if (!password) {
    return { status: "failed", reason: "login form not found: no password field on the page" };
  }
  await password.fill(credentials.password);
  logger.debug("auto-login: password entered");

  await acceptTermsIfPresent(page);
  if (!(await clickSubmit(page))) await password.press("Enter");

  return await waitForLoginResult(page, logger, options.timeoutMs ?? 90_000);
}

async function ensureOnDeepSeek(page: Page, baseUrl: string): Promise<void> {
  if (page.url().startsWith(baseUrl)) return;
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
}

async function hasUserToken(page: Page): Promise<boolean> {
  return Boolean(await readUserToken(page));
}

/** Click the login trigger when the form is not already on screen. */
async function openLoginDialog(page: Page): Promise<void> {
  if (await findVisible(page, EMAIL_SELECTORS, 1_500)) return;
  const triggers = page.locator("button:visible, a:visible");
  const count = await triggers.count();
  for (let index = 0; index < count; index += 1) {
    const trigger = triggers.nth(index);
    const text = ((await trigger.textContent().catch(() => "")) ?? "").trim();
    if (!LOGIN_TRIGGER_TEXT.test(text)) continue;
    await trigger.click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(1_000);
    return;
  }
}

/** First visible element matching any selector, or null after the timeout. */
async function findVisible(
  page: Page,
  selectors: string[],
  timeoutMs: number,
): Promise<Locator | null> {
  const deadline = Date.now() + Math.max(0, timeoutMs);
  for (;;) {
    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      try {
        if (await locator.isVisible()) return locator;
      } catch {
        // Detached or not actionable; try the next selector.
      }
    }
    if (Date.now() >= deadline) return null;
    await page.waitForTimeout(250);
  }
}

/** Click the submit control of the login form; false when none is actionable. */
async function clickSubmit(page: Page): Promise<boolean> {
  for (const selector of SUBMIT_BUTTON_SELECTORS) {
    const button = page.locator(selector).first();
    try {
      if (await button.isVisible()) {
        await button.click({ timeout: 5_000 });
        return true;
      }
    } catch {
      // Try the next candidate.
    }
  }
  const buttons = page.locator("button:visible");
  const count = await buttons.count();
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    const text = ((await button.textContent().catch(() => "")) ?? "").trim();
    if (!SUBMIT_BUTTON_TEXT.test(text)) continue;
    try {
      await button.click({ timeout: 5_000 });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/** Accept any unchecked terms checkbox so the submit is not blocked. */
async function acceptTermsIfPresent(page: Page): Promise<void> {
  const boxes = page.locator('input[type="checkbox"]:visible');
  const count = await boxes.count();
  for (let index = 0; index < count; index += 1) {
    const box = boxes.nth(index);
    try {
      if (!(await box.isChecked())) await box.check({ timeout: 2_000 });
    } catch {
      // Not required for this build.
    }
  }
}

/** Poll until the token appears, a human step is required, or the attempt fails. */
async function waitForLoginResult(
  page: Page,
  logger: Logger,
  timeoutMs: number,
): Promise<AutoLoginOutcome> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await hasUserToken(page)) {
      logger.info("auto-login succeeded");
      return { status: "ok" };
    }
    if (await findVisible(page, CODE_SELECTORS, 0)) {
      return {
        status: "needs-interaction",
        reason: "DeepSeek asked for an email verification code; finish it in the browser window",
      };
    }
    if (await findVisible(page, CAPTCHA_SELECTORS, 0)) {
      return {
        status: "needs-interaction",
        reason: "DeepSeek showed a captcha; solve it in the browser window",
      };
    }
    const error = await readLoginError(page);
    if (error) return { status: "failed", reason: `DeepSeek rejected the login: ${error}` };
    await page.waitForTimeout(POLL_INTERVAL_MS);
  }
  return { status: "failed", reason: "login did not complete before the timeout" };
}

/** Visible error text DeepSeek rendered for the failed attempt. */
async function readLoginError(page: Page): Promise<string | null> {
  const containers = page.locator(ERROR_CONTAINER_SELECTORS.join(", "));
  const count = await containers.count();
  for (let index = 0; index < count; index += 1) {
    const container = containers.nth(index);
    try {
      if (!(await container.isVisible())) continue;
      const text = ((await container.textContent()) ?? "").trim();
      if (text && LOGIN_ERROR_TEXT.test(text)) return text.slice(0, 200);
    } catch {
      // Ignore nodes that disappear while we read them.
    }
  }
  return null;
}
