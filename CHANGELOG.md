# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases use [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- No API key required: `/v1/*` routes work without any API key — any key is accepted and no key is needed at all.
- Manual token import: set `DUBUSEEK_USER_TOKEN` (and optionally `DUBUSEEK_COOKIE`) to
  use an existing DeepSeek session directly — no login flow, captcha, or browser window.
  The token is validated against DeepSeek and saved to `data/auth.json`.
- Interactive userToken prompt: when no token is configured and stdin is a TTY,
  Dubuseek asks you to paste the `userToken` on first run. A working token is saved
  and reused on later runs; if it expires or stops working, you are prompted again
  (up to 3 attempts) before falling back to the saved session / browser login flows.
  Non-interactive runs (CI) skip the prompt entirely.
- Automatic DeepSeek login: credentials from `DUBUSEEK_LOGIN_EMAIL` / `DUBUSEEK_LOGIN_PASSWORD`
  or `data/credentials.json` are filled in the browser automatically, with a graceful
  fallback to the manual login window when a captcha, verification code, or error appears.
- `dubuseek login --manual` to force the manual login flow.
- Portable Windows launchers (`START_DUBUSEEK.bat`, `RESTART_DUBUSEEK.bat`, and silent
  `.vbs` variants) that work from any directory.
- npm-based scripts and documentation; the project no longer requires pnpm.

### Changed

- Rebranded to `dubuseek` with `dubuseek` and `dub` binaries.
- All runtime logs, CLI messages, and documentation are in English.
- Environment variables accept `DUBUSEEK_*` names, with the older `DS_*` names still supported.

## [0.1.0] - 2026-07-25

### Added

- Local OpenAI-compatible `POST /v1/responses` and `POST /v1/chat/completions` endpoints with streaming and non-streaming modes.
- Chrome/CDP login bootstrap, reusable auth snapshots, DeepSeek Web PoW solving, and persistent session lineage.
- Reasoning/output mapping, prompt-based function-call compatibility, Web search toggling, API-key protection, and model discovery.
- Pi integration guidance for both `openai-completions` and `openai-responses`.
- CI, contributor/security policy, architecture/API documentation, and release metadata.

### Security

- Loopback binding by default and owner-only runtime credential files.
- Runtime credentials, sessions, API keys, and Chrome profiles excluded from Git.

[Unreleased]: https://github.com/ZamilBinOfficial/deepseek-web-api/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ZamilBinOfficial/deepseek-web-api/releases/tag/v0.1.0
