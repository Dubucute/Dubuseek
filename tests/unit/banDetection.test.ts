/** Verifies upstream ban, risk-control, and throttling classification. */
import { describe, expect, it } from "vitest";

import {
  detectEventFailure,
  detectHttpFailure,
  upstreamError,
} from "../../src/deepseek/banDetection.js";
import { iterDeepSeekSse } from "../../src/deepseek/sse.js";

describe("DeepSeek ban detection", () => {
  it("classifies an explicit account ban as 403", () => {
    const failure = detectHttpFailure(200, '{"code":40003,"message":"账号已被封禁"}');
    expect(failure?.kind).toBe("account_banned");
    expect(failure?.status).toBe(403);
  });

  it("classifies risk control and keeps the upstream code", () => {
    const failure = detectHttpFailure(200, '{"code":"risk_control","msg":"异常请求"}');
    expect(failure?.kind).toBe("risk_control");
    expect(failure?.status).toBe(403);
  });

  it("classifies rate limiting as 429", () => {
    const failure = detectHttpFailure(200, "too many requests");
    expect(failure?.kind).toBe("rate_limited");
    expect(failure?.status).toBe(429);
  });

  it("falls back to status codes when the body is opaque", () => {
    expect(detectHttpFailure(401, "")?.kind).toBe("auth_expired");
    expect(detectHttpFailure(403, "")?.kind).toBe("forbidden");
    expect(detectHttpFailure(500, "")?.kind).toBe("upstream_error");
  });

  it("ignores successful responses", () => {
    expect(detectHttpFailure(200, "{\"code\":0}")).toBeNull();
  });

  it("detects an error frame carrying a biz_code", () => {
    const failure = detectEventFailure({
      event: null,
      data: { biz_code: 40001, message: "登录已失效" },
    });
    expect(failure?.kind).toBe("auth_expired");
    expect(failure?.code).toBe("40001");
  });

  it("ignores normal content frames", () => {
    expect(
      detectEventFailure({ event: null, data: { p: "response/fragments", o: "APPEND", v: [] } }),
    ).toBeNull();
  });

  it("throws a classified HttpError while iterating a banned stream", async () => {
      const body = 'event: error\ndata: {"code":40003,"message":"banned"}\n\n';
      // The error frame must surface as a thrown failure, not a yielded event.
      const iterator = iterDeepSeekSse(new Response(body))[Symbol.asyncIterator]();
      await expect(iterator.next()).rejects.toMatchObject({ status: 403, code: "40003" });
    });

  it("surfaces a non-OK upstream response with the detected kind", () => {
    const failure = detectHttpFailure(403, "risk control triggered");
    expect(failure).not.toBeNull();
    const error = upstreamError(failure!);
    expect(error.status).toBe(403);
    expect(error.message).toContain("risk_control");
  });
});
