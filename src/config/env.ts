/** Resolves runtime configuration and all secret-bearing data paths. */
import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_CDP_ENDPOINT,
  DEFAULT_POW_WORKER_URL,
  DEEPSEEK_BASE_URL,
} from "./constants.js";

export type ToolReasoningMode = "hidden" | "clean";

export interface AppConfig {
  port: number;
  host: string;
  cdpEndpoint: string;
  dataDir: string;
  authFile: string;
  sessionsFile: string;
  chromeProfileDir: string;
  chromePath?: string;
  powWorkerUrl: string;
  baseUrl: string;
  debug: boolean;
  toolReasoning: ToolReasoningMode;
  /** Show Chrome UI. Default false (headless). Login always opens a visible window when needed. */
  showBrowser: boolean;
  /** Fill the DeepSeek login form automatically instead of waiting for a human. */
  autoLogin: boolean;
  /** DeepSeek account email used by auto-login (optional, see credentialsFile). */
  loginEmail?: string;
  /** DeepSeek account password used by auto-login (optional, see credentialsFile). */
  loginPassword?: string;
  /** JSON file holding { email, password } when credentials are not in the environment. */
  credentialsFile: string;
  /** Direct userToken for manual import (bypasses auto-login). */
  userToken?: string;
  /** Direct cookie string for manual import (bypasses auto-login). */
  cookie?: string;
}

/** Load KEY=VALUE lines from .env without overriding existing process.env. */
export function loadDotEnv(cwd = process.cwd()): void {
  const file = path.join(cwd, ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

/** First non-empty value among the given environment variable names. */
function firstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

/** Path from the first variable that is set, falling back to a default. */
function envPathAny(names: string[], fallback: string): string {
  return path.resolve(firstEnv(...names) || fallback);
}

function parseToolReasoning(raw: string | undefined): ToolReasoningMode {
  const value = raw?.trim() || "clean";
  if (value !== "hidden" && value !== "clean") {
    throw new Error(`Invalid DUBUSEEK_TOOL_REASONING: ${value}; expected hidden or clean`);
  }
  return value;
}

function parsePort(raw: string | undefined): number {
  const port = Number(raw || 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid PORT: ${raw ?? ""}`);
  }
  return port;
}

function parseBool(raw: string | undefined): boolean {
  return /^(1|true|yes|on)$/i.test(raw || "");
}

/** Unwrap the JSON form localStorage stores so both raw and wrapped tokens work. */
export function normalizeUserToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return trimmed;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "value" in parsed &&
      typeof (parsed as { value: unknown }).value === "string"
    ) {
      return (parsed as { value: string }).value;
    }
  } catch {
    // Not JSON after all; use the raw string.
  }
  return trimmed;
}

/** Build a validated configuration; loads .env once if present. */
export function loadConfig(cwd = process.cwd()): AppConfig {
  loadDotEnv(cwd);
  const dataDir = envPathAny(["DUBUSEEK_DATA_DIR", "DS_DATA_DIR"], path.join(cwd, "data"));
  const chromePath = firstEnv("DUBUSEEK_CHROME_PATH", "DS_CHROME_PATH");
  const loginEmail = firstEnv("DUBUSEEK_LOGIN_EMAIL", "DS_LOGIN_EMAIL");
  const loginPassword = firstEnv("DUBUSEEK_LOGIN_PASSWORD", "DS_LOGIN_PASSWORD");
  const credentialsFile = envPathAny(
    ["DUBUSEEK_CREDENTIALS_FILE", "DS_CREDENTIALS_FILE"],
    path.join(dataDir, "credentials.json"),
  );
  const autoLoginRaw = firstEnv("DUBUSEEK_AUTO_LOGIN", "DS_AUTO_LOGIN");
  const autoLogin =
    autoLoginRaw !== undefined
      ? parseBool(autoLoginRaw)
      : Boolean(loginEmail && loginPassword) || fs.existsSync(credentialsFile);
  const userTokenRaw = firstEnv("DUBUSEEK_USER_TOKEN", "DS_USER_TOKEN");
  const userToken = userTokenRaw ? normalizeUserToken(userTokenRaw) : undefined;
  const cookie = firstEnv("DUBUSEEK_COOKIE", "DS_COOKIE");
  return {
    port: parsePort(process.env.PORT),
    host: process.env.HOST?.trim() || "127.0.0.1",
    cdpEndpoint: firstEnv("DUBUSEEK_CDP", "DS_CDP") || DEFAULT_CDP_ENDPOINT,
    dataDir,
    authFile: envPathAny(["DUBUSEEK_AUTH_FILE", "DS_AUTH_FILE"], path.join(dataDir, "auth.json")),
    sessionsFile: envPathAny(
      ["DUBUSEEK_SESSION_FILE", "DS_SESSION_FILE"],
      path.join(dataDir, "sessions.json"),
    ),
    chromeProfileDir: envPathAny(
      ["DUBUSEEK_CHROME_PROFILE", "DS_CHROME_PROFILE"],
      path.join(dataDir, "chrome-profile"),
    ),
    ...(chromePath ? { chromePath } : {}),
    powWorkerUrl: firstEnv("DUBUSEEK_POW_JS", "DS_POW_JS") || DEFAULT_POW_WORKER_URL,
    baseUrl: firstEnv("DUBUSEEK_BASE_URL", "DS_BASE_URL") || DEEPSEEK_BASE_URL,
    debug: parseBool(firstEnv("DUBUSEEK_DEBUG", "DS_DEBUG")),
    toolReasoning: parseToolReasoning(firstEnv("DUBUSEEK_TOOL_REASONING", "DS_TOOL_REASONING")),
    showBrowser: parseBool(firstEnv("DUBUSEEK_SHOW_BROWSER", "DS_SHOW_BROWSER")),
    autoLogin,
    ...(loginEmail ? { loginEmail } : {}),
    ...(loginPassword ? { loginPassword } : {}),
    credentialsFile,
    ...(userToken ? { userToken } : {}),
    ...(cookie ? { cookie } : {}),
  };
}
