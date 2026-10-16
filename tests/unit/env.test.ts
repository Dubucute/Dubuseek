/** Verifies validated environment configuration. */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { loadConfig } from "../../src/config/env.js";

afterEach(() => vi.unstubAllEnvs());

function temporaryCwd(): string {
  return mkdtempSync(path.join(tmpdir(), "dubuseek-env-"));
}

describe("loadConfig DUBUSEEK_TOOL_REASONING", () => {
  it("defaults to clean", () => {
    vi.stubEnv("DUBUSEEK_TOOL_REASONING", "");
    expect(loadConfig(temporaryCwd()).toolReasoning).toBe("clean");
  });

  it("accepts clean", () => {
    vi.stubEnv("DUBUSEEK_TOOL_REASONING", "clean");
    expect(loadConfig(temporaryCwd()).toolReasoning).toBe("clean");
  });

  it("rejects invalid values", () => {
    vi.stubEnv("DUBUSEEK_TOOL_REASONING", "visible");
    expect(() => loadConfig(temporaryCwd())).toThrow(/Invalid DUBUSEEK_TOOL_REASONING/);
  });
});

describe("loadConfig manual token import", () => {
  it("picks up DUBUSEEK_USER_TOKEN and DUBUSEEK_COOKIE", () => {
    vi.stubEnv("DUBUSEEK_USER_TOKEN", "usertokenexample");
    vi.stubEnv("DUBUSEEK_COOKIE", "sessionid=abc; userToken=usertokenexample");
    const config = loadConfig(temporaryCwd());
    expect(config.userToken).toBe("usertokenexample");
    expect(config.cookie).toBe("sessionid=abc; userToken=usertokenexample");
  });

  it("leaves both undefined when unset", () => {
    const config = loadConfig(temporaryCwd());
    expect(config.userToken).toBeUndefined();
    expect(config.cookie).toBeUndefined();
  });

  it("accepts the token without a cookie", () => {
    vi.stubEnv("DUBUSEEK_USER_TOKEN", "only-the-token");
    const config = loadConfig(temporaryCwd());
    expect(config.userToken).toBe("only-the-token");
    expect(config.cookie).toBeUndefined();
  });

  it("supports the legacy DS_USER_TOKEN alias", () => {
    vi.stubEnv("DS_USER_TOKEN", "legacy-token");
    expect(loadConfig(temporaryCwd()).userToken).toBe("legacy-token");
  });

  it("unwraps the JSON form copied from localStorage", () => {
    vi.stubEnv(
      "DUBUSEEK_USER_TOKEN",
      '{"value":"usertokenexample","__version":"0"}',
    );
    expect(loadConfig(temporaryCwd()).userToken).toBe("usertokenexample");
  });
});
