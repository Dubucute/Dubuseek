# Dubuseek

A fast, lightweight local reverse proxy that turns your authenticated [chat.deepseek.com](https://chat.deepseek.com) session into a standard **OpenAI-compatible API** (`/v1/chat/completions`, `/v1/responses`, `/v1/models`).

Use DeepSeek-V4 and DeepSeek-R1 inside **Cursor**, **Continue**, **LibreChat**, or any OpenAI SDK with zero API token costs.

---

### ✨ Features

* **OpenAI Compatible**: Drop-in replacement for `/v1/chat/completions` and `/v1/models`.
* **Clean Reasoning**: Extracts `<think>...</think>` into `reasoning_content` so answers stay clean.
* **Tool Calling**: Native parser for DSML markup (`<｜tool calls begin｜>...`).
* **Zero Cost**: Runs directly via your authenticated web session with auto PoW solving.
* **Token Import**: Paste your DeepSeek `userToken` once (`DUBUSEEK_USER_TOKEN`) — no login flow, no captcha, no browser.
* **Auto Login**: Set `DUBUSEEK_LOGIN_EMAIL` / `DUBUSEEK_LOGIN_PASSWORD` and Dubuseek signs in to DeepSeek by itself — no manual browser step.
* **1-Click Launch**: Double-click `START_DUBUSEEK.bat` to run on port `8080`.

---

### 🚀 Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Build
npm run build

# 3. Provide DeepSeek auth (first time only) — pick ONE method:
#    a) Token import (recommended, no login flow needed):
#       Copy .env.example to .env and set:
#         DUBUSEEK_USER_TOKEN=<value of localStorage userToken>
#         DUBUSEEK_COOKIE=<cookie header from any DeepSeek API request> (optional)
#    b) Auto-login: set DUBUSEEK_LOGIN_EMAIL / DUBUSEEK_LOGIN_PASSWORD
#    c) Manual: run `npm run login` and log in in the browser window.

# 4. Start server (default: http://127.0.0.1:8080)
npm start
```

Auto-login is enabled automatically as soon as credentials are present (either in `.env`
or in `data/credentials.json`). If DeepSeek asks for a verification code or a captcha,
Dubuseek falls back to the manual browser login flow so you can finish it yourself.

**No login flow at all:** if you already use DeepSeek in a browser, copy the `userToken`
from DevTools → Application → Local Storage → `chat.deepseek.com` into
`DUBUSEEK_USER_TOKEN` (and optionally the `cookie` header into `DUBUSEEK_COOKIE`).
Dubuseek validates the token against DeepSeek and saves it to `data/auth.json` — no
browser window, captcha, or verification code is ever shown.

**Interactive prompt:** if no token is configured and you run Dubuseek in a terminal,
you are asked to paste the `userToken` on first run. A working token is saved to
`data/auth.json` and reused on later runs; if it expires or stops working, you are
asked again. Press Enter (or run non-interactively, e.g. in CI) to skip the prompt
and fall back to the saved session / browser login flows.

---

### 💻 Usage

#### cURL
```bash
curl -N http://127.0.0.1:8080/v1/chat/completions \
  -H "Authorization: Bearer sk-deepseek" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-flash",
    "stream": true,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

#### Python (`openai`)
```python
from openai import OpenAI

client = OpenAI(base_url="http://127.0.0.1:8080/v1", api_key="sk-dubuseek")
response = client.chat.completions.create(
    model="deepseek-flash",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
```

---

### ⚙️ Configuration

All settings are read from environment variables (or a `.env` file). `DUBUSEEK_*`
names are preferred; the older `DS_*` names still work.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DUBUSEEK_PORT` | `8080` | HTTP port for the API server |
| `DUBUSEEK_HOST` | `127.0.0.1` | Bind address |
| `DUBUSEEK_AUTH_FILE` | `data/auth.json` | Saved DeepSeek login snapshot |
| `DUBUSEEK_SESSION_FILE` | `data/sessions.json` | Session index |
| `DUBUSEEK_CHROME_PROFILE` | `data/chrome-profile` | Managed Chrome profile directory |
| `DUBUSEEK_SHOW_BROWSER` | `false` | Show the browser window during login |
| `DUBUSEEK_USER_TOKEN` | – | Paste a DeepSeek `userToken` directly (skips all login flows) |
| `DUBUSEEK_COOKIE` | – | Optional cookie header paired with `DUBUSEEK_USER_TOKEN` |
| `DUBUSEEK_LOGIN_EMAIL` | – | DeepSeek account email (enables auto-login) |
| `DUBUSEEK_LOGIN_PASSWORD` | – | DeepSeek account password (enables auto-login) |
| `DUBUSEEK_CREDENTIALS_FILE` | `data/credentials.json` | Alternative credentials file |
| `DUBUSEEK_AUTO_LOGIN` | auto | Force auto-login on/off |
| `DUBUSEEK_TOOL_REASONING` | `hidden` | `hidden` or `clean` tool reasoning |

---

### 📄 License

MIT
