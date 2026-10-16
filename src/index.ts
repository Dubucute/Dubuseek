#!/usr/bin/env node
/** CLI entry point for login bootstrap and the local HTTP server. */
import fs from "node:fs";
import type { Server } from "node:http";

import { LoginManager } from "./browser/login.js";
import { ChromeManager } from "./browser/chrome.js";
import { loadConfig } from "./config/env.js";
import { DeepSeekClient } from "./deepseek/client.js";
import { SessionStore } from "./deepseek/sessionStore.js";
import { createServer } from "./server/createServer.js";
import { errorMessage } from "./utils/errors.js";
import { createLogger } from "./utils/logger.js";
import { isRecord } from "./utils/json.js";

const CLI_NAME = "dubuseek";

function listen(server: Server, port: number, host: string): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });
}

async function buildRuntime(options: { manualLogin?: boolean } = {}) {
  const config = loadConfig();
  fs.mkdirSync(config.dataDir, { recursive: true, mode: 0o700 });
  const logger = createLogger(config.debug);
  const chrome = new ChromeManager(config, logger);
  const login = new LoginManager(chrome, config, logger, {
    manualLogin: options.manualLogin ?? false,
  });
  const sessions = new SessionStore(config.sessionsFile, logger);
  const client = new DeepSeekClient(config, login, sessions, logger);
  return { config, logger, client };
}

/** Validate login before listening so the first API request is immediately usable. */
async function start(): Promise<void> {
  const { config, logger, client } = await buildRuntime();
  await client.initialize();
  const server = createServer({ client, debug: config.debug });
  await listen(server, config.port, config.host);
  logger.info(`Dubuseek started: http://${config.host}:${config.port}`);
  logger.info("Routes: POST /v1/responses, POST /v1/chat/completions, GET /v1/models, GET /health");
  logger.info("Chrome CDP", { endpoint: config.cdpEndpoint });

  const shutdown = (signal: string): void => {
    logger.info(`Received ${signal}, shutting down`);
    server.close(() => process.exit(0));
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

/** Ensure browser authentication and exit after refreshing data/auth.json. */
async function login(manualLogin: boolean): Promise<void> {
  const { config, logger, client } = await buildRuntime({ manualLogin });
  await client.initialize();
  logger.info("Session saved", { file: config.authFile });
}

function packageVersion(): string {
  const parsed: unknown = JSON.parse(
    fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  return isRecord(parsed) && typeof parsed.version === "string" ? parsed.version : "unknown";
}

function help(): void {
  console.log(
    `${CLI_NAME}\n\n` +
      `Usage:\n` +
      `  ${CLI_NAME} start              Start the API server (default command)\n` +
      `  ${CLI_NAME} login              Log in to DeepSeek and save the session\n` +
      `  ${CLI_NAME} login --manual     Ignore saved credentials and log in by hand\n` +
      `  ${CLI_NAME} --version          Print the version\n\n` +
      `Auto-login:\n` +
      `  Set DUBUSEEK_LOGIN_EMAIL and DUBUSEEK_LOGIN_PASSWORD (or create\n` +
      `  data/credentials.json) and Dubuseek signs in to DeepSeek for you.\n` +
      `  Pass --manual to always log in through the browser window instead.\n`,
  );
}

async function main(): Promise<void> {
  const command = process.argv[2] || "start";
  if (command === "start") await start();
  else if (command === "login") await login(process.argv.includes("--manual"));
  else if (command === "help" || command === "--help" || command === "-h") help();
  else if (command === "version" || command === "--version" || command === "-v") {
    console.log(packageVersion());
  } else throw new Error(`unknown command: ${command}`);
}

void main()
  .then(() => {
    if ((process.argv[2] || "start") === "login") process.exit(0);
  })
  .catch((error: unknown) => {
    console.error(`${CLI_NAME}: ${errorMessage(error)}`);
    process.exit(1);
  });
