# VanishX — Autonomous X Timeline Purge & Bot Cleanser

A high-performance, client-side cleaning suite for X (Twitter) consisting of a Next.js Web Dashboard, a lightweight Manifest V3 Browser Extension, and a standalone Playwright Automation CLI.

Designed for surgical timeline purges, date-range filtering, and multi-factor bot detection without requiring expensive Twitter API developer tiers or cloud credential storage.

[![Live Web App](https://img.shields.io/badge/Live%20App-vanishx.vercel.app-FF6044?style=flat&logo=vercel)](https://vanishx.vercel.app)
[![npm version](https://img.shields.io/npm/v/vanishx.svg?color=cb3837&logo=npm)](https://www.npmjs.com/package/vanishx)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Admuad%2Fx--account--cleaner-121313?logo=github)](https://github.com/Admuad/x-account-cleaner)
[![License: MIT](https://img.shields.io/badge/License-MIT-121313.svg)](LICENSE)

---

## 🌐 Live Web Application

Access the zero-install live web dashboard:

👉 **[https://vanishx.vercel.app](https://vanishx.vercel.app)**

---

## Quick Start

### 1. Terminal CLI (Instant Execution via npx)

Run the autonomous cleaner directly in any terminal with zero clone required:

```bash
npx vanishx
```

Or run headless automated wipes with specific flags:

```bash
# Delete all historical posts & replies before a date in headless mode
npx vanishx --posts --replies --headless

# Mass unfollow non-mutuals with safe pacing
npx vanishx --unfollow --min-delay 2000 --max-delay 4000
```

---

### 2. Companion Browser Extension

1. Download [`vanishx-extension.zip`](https://vanishx.vercel.app/vanishx-extension.zip).
2. Open `chrome://extensions` in Chrome, Edge, Brave, or Kiwi Browser.
3. Toggle **Developer mode** ON (top-right).
4. Drag and drop the extracted `extension/` folder or click **Load unpacked**.
5. Open [**vanishx.vercel.app/app**](https://vanishx.vercel.app/app) and click **Detect Tab** to start cleaning!

---

### 3. Local Development (Optional)

```bash
# Clone repository
git clone https://github.com/Admuad/x-account-cleaner.git
cd x-account-cleaner

# Start web dashboard locally
npm run ui
```

---

## CLI Flag Reference

| Flag | Shorthand | Description |
| :--- | :--- | :--- |
| `--posts` | `-p` | Delete original authored posts |
| `--replies` | `-r` | Delete replies and conversation threads |
| `--reposts` | `-k` | Undo retweets on dedicated `/reposts` tab |
| `--unfollow` | `-u` | Unfollow non-mutual and flagged bot accounts |
| `--followers` | `-f` | Remove followers via soft-block method |
| `--until <YYYY-MM-DD>` | | Filter posts created prior to the specified date |
| `--turbo` | | High-speed 0.7s execution pacing |
| `--dry-run` | `-d` | Simulation mode (preview targets without deletion) |
| `--whitelist <path>` | | Path to custom whitelist configuration |
| `--headless` | | Execute Playwright in background mode |

---

## Whitelist Configuration (`whitelist.json`)

```json
{
  "usernames": [
    "elonmusk",
    "vitalikbuterin"
  ],
  "tweetIds": [
    "1759281928391"
  ],
  "keywordsToKeep": [
    "#keep",
    "#pinned"
  ],
  "dateCutoff": "2026-01-01"
}
```

---

## Security & Privacy Model

1. **Zero External Logging**: No telemetry, tokens, or credentials are transmitted to remote servers.
2. **Client-Side Session Cache**: Session cookies (`auth_token`, `ct0`) remain stored locally in `.session.json` (git-ignored).
3. **Adaptive Rate-Limit Protection**: Automatic cooldown triggers with randomized human jitter (400ms–1400ms) to maintain account safety.

---

## License

MIT License. Developed by [Admuad](https://github.com/Admuad).
