/** Classifies DeepSeek upstream signals that indicate bans, risk control, or throttling. */
import { HttpError } from "../utils/errors.js";
import { isRecord } from "../utils/json.js";
import type { DeepSeekSseEvent } from "./types.js";

export type UpstreamFailureKind =
  | "account_banned"
  | "risk_control"
  | "rate_limited"
  | "auth_expired"
  | "forbidden"
  | "upstream_error";

export interface UpstreamFailure {
  kind: UpstreamFailureKind;
  status: number;
  code: string;
  detail: string;
}

interface Rule {
  kind: UpstreamFailureKind;
  pattern: RegExp;
}

const BAN_RULES: Rule[] = [
  { kind: "account_banned", pattern: /(banned|blocked|suspended|封禁|封号|封停|禁止登录)/i },
  { kind: "account_banned", pattern: /(account|账号|帐号)[^,。;]{0,16}(异常|违规|停用)/i },
  { kind: "risk_control", pattern: /(risk[\s_-]*control|风控|安全风险|异常(登录|访问|请求|行为)|suspicious)/i },
  { kind: "rate_limited", pattern: /(rate[\s_-]*limit|too\s+many\s+requests|\b429\b|请求(过于)?频繁|限流|限速)/i },
  { kind: "auth_expired", pattern: /(unauthorized|invalid[\s_-]*token|token[\s_-]*(expired|invalid)|登录(已)?(失效|过期)|未授权|请重新登录)/i },
  { kind: "forbidden", pattern: /(forbidden|access[\s_-]*denied|无权限|禁止访问)/i },
];

const STATUS_RULES: Array<{ status: number; kind: UpstreamFailureKind }> = [
  { status: 401, kind: "auth_expired" },
  { status: 403, kind: "forbidden" },
  { status: 429, kind: "rate_limited" },
];

function statusFor(kind: UpstreamFailureKind): number {
  switch (kind) {
    case "auth_expired":
      return 401;
    case "rate_limited":
      return 429;
    case "forbidden":
    case "account_banned":
    case "risk_control":
      return 403;
    default:
      return 502;
  }
}

function summarize(text: string, limit: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > limit ? `${flat.slice(0, limit)}...` : flat;
}

function kindFromText(text: string, status: number): UpstreamFailureKind | null {
  for (const rule of BAN_RULES) {
    if (rule.pattern.test(text)) return rule.kind;
  }
  return STATUS_RULES.find((entry) => entry.status === status)?.kind ?? null;
}

function payloadText(payload: Record<string, unknown>): string {
  const parts: string[] = [];
  const push = (value: unknown): void => {
    if (typeof value === "string" && value.trim()) parts.push(value);
  };
  push(payload.message);
  push(payload.msg);
  push(payload.detail);
  push(payload.content);
  push(payload.error);
  const nested = payload.error;
  if (isRecord(nested)) {
    push(nested.message);
    push(nested.msg);
    push(nested.detail);
  }
  return parts.join(" ");
}

function payloadCode(payload: Record<string, unknown>): string | null {
  const candidates: unknown[] = [payload.code, payload.biz_code, payload.err_code];
  if (isRecord(payload.error)) candidates.push(payload.error.code);
  for (const value of candidates) {
    if (typeof value === "number" || typeof value === "string") return String(value);
  }
  return null;
}

/** Recognize frames that carry an explicit error payload rather than answer content. */
function errorPayload(data: Record<string, unknown>): Record<string, unknown> | null {
  if (isRecord(data.error)) return data.error;
  if (typeof data.error === "string") return data;
  if (data.success === false) return data;
  const code = data.code ?? data.biz_code;
  if (typeof code === "number" && code >= 1000) return data;
  if (typeof code === "string" && /^\d{4,}$/.test(code)) return data;
  return null;
}

function parseJsonRecord(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Classify an upstream response body into a ban or transport failure.
 * DeepSeek often reports bans and risk control inside an HTTP 200 body, so a
 * 2xx status alone is not treated as success until the body is inspected.
 */
export function detectHttpFailure(status: number, bodyText: string): UpstreamFailure | null {
  const text = bodyText ?? "";
  const payload = parseJsonRecord(text);
  const code = payload ? payloadCode(payload) : null;
  const haystack = payload ? `${payloadText(payload)} ${code ?? ""}`.trim() : text;
  const kind = kindFromText(haystack, status);
  if (status >= 200 && status < 300) {
    if (!kind) return null;
    return {
      kind,
      status: statusFor(kind),
      code: code ?? kind,
      detail: summarize(text, 300) || `HTTP ${status}`,
    };
  }
  const resolved = kind ?? "upstream_error";
  return {
    kind: resolved,
    status: statusFor(resolved),
    code: code ?? resolved,
    detail: summarize(text, 300) || `HTTP ${status}`,
  };
}

/** Classify an SSE frame that carries an explicit error payload instead of content. */
export function detectEventFailure(event: DeepSeekSseEvent): UpstreamFailure | null {
  const data = event.data;
  const payload = errorPayload(data);
  if (!payload && event.event !== "error") return null;
  const source = payload ?? data;
  const text = payloadText(source);
  const kind = kindFromText(text, 200) ?? "upstream_error";
  return {
    kind,
    status: statusFor(kind),
    code: payloadCode(source) ?? kind,
    detail: summarize(text, 300) || "DeepSeek stream error",
  };
}

/** Convert a classified failure into the HTTP error surfaced to API clients. */
export function upstreamError(failure: UpstreamFailure): HttpError {
  return new HttpError(failure.status, `DeepSeek ${failure.kind}: ${failure.detail}`, failure.code);
}
