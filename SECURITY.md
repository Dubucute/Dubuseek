# Security Policy

## Supported version

Security fixes target the latest release and the `main` branch.

## Reporting a vulnerability

Use GitHub's **Security → Report a vulnerability** flow for this repository. If private vulnerability reporting is unavailable, contact the maintainer through the repository's GitHub profile before sharing details. Do not open a public issue with credentials, cookies, exploit steps, or account data.

Include the affected version/commit, impact, reproduction steps, and a minimal sanitized request or log. You should receive an acknowledgement within seven days.

## Auto-login credentials

Auto-login stores your DeepSeek email and password locally so Dubuseek can sign in
without a manual browser step. Treat them like any other secret:

- Prefer environment variables (`DUBUSEEK_LOGIN_EMAIL` / `DUBUSEEK_LOGIN_PASSWORD`) over
  committing them into `.env`; add `.env` to `.gitignore` before any commit.
- If you use `data/credentials.json`, keep the file mode at `0600` and never share it.
- `npm run logout` clears the saved browser session but **not** the credentials file;
  delete `data/credentials.json` (or unset the env vars) to remove the credentials.

## Imported user token

`DUBUSEEK_USER_TOKEN` (and `DUBUSEEK_COOKIE`) are live DeepSeek session secrets — anyone
holding them can act as your account:

- Keep them in `.env` only (gitignored) or in your process environment; never commit,
  paste into issues, or share them.
- Dubuseek validates the token and writes it to `data/auth.json` (mode `0600`).
  `npm run logout` deletes that file; unset the env var as well so the token is not
  re-imported on the next start.
- DeepSeek can revoke the token at any time (password change, "log out everywhere").
  When that happens, fetch a fresh token and update `DUBUSEEK_USER_TOKEN`.

## Deployment and account risk

This project is an **unofficial** adapter for private DeepSeek Web endpoints. It is not affiliated with or supported by DeepSeek or OpenAI.

- Keep the default loopback bind (`127.0.0.1`). Do not expose the server directly to the public Internet.
- No API key is required for `/v1/*` routes; loopback binding remains the only network boundary.
- `data/auth.json`, `data/.api-key`, `data/sessions.json`, and `data/chrome-profile/` are sensitive. Never commit, upload, attach, or include them in images.
- Use a dedicated Chrome profile and protect the host account. Compromise of the runtime data can compromise the logged-in DeepSeek session.
- Web automation and private API usage may trigger account restrictions. Review applicable terms and accept the account risk before use.
