# VanishX — Autonomous X Timeline Purge & Bot Cleanser

A high-performance, client-side cleaning suite for X (Twitter) consisting of a Next.js Web Dashboard, a lightweight Manifest V3 Browser Extension, and a standalone Playwright Automation CLI.

Designed for surgical timeline purges, date-range filtering, and multi-factor bot detection without requiring expensive Twitter API developer tiers or cloud credential storage.

[![GitHub Repository](https://img.shields.io/badge/GitHub-Admuad%2Fx--account--cleaner-121313?logo=github)](https://github.com/Admuad/x-account-cleaner)
[![License: MIT](https://img.shields.io/badge/License-MIT-121313.svg)](LICENSE)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-121313?logo=next.js)](https://nextjs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.49-121313?logo=playwright)](https://playwright.dev/)

---

## Architectural Overview

VanishX operates on a zero-trust, client-side execution model. All DOM manipulations and GraphQL mutations execute directly within the user's authenticated browser context or local Playwright instance.

```
                    ┌─────────────────────────┐
                    │      VanishX Suite      │
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Web Dashboard  │     │ Browser Ext V3  │     │  Headless CLI   │
│     (/app)      │     │  (/extension)   │     │     (/cli)      │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  Live IPC Relay       │  Direct Tab Bridge    │  Local Automation
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │    X.com DOM/GraphQL    │
                    │   Zero-State Sweeper    │
                    └─────────────────────────┘
```

---

## Core Capabilities

- **Date-Range Fast-Forwarding**: Jump directly to historical eras (e.g., `until:2025-12-31`) using native search operators without triggering infinite scroll deadlocks.
- **Multi-Factor Bot Radar**: Heuristic scoring engine evaluating non-mutual relationships, default avatars, numeric handle patterns (`@user\d{4,}`), empty bios, and skewed following/follower ratios ($>50\times$).
- **Zero-State Verification Loop**: Reads profile header counters dynamically to ensure full timeline clearance and bypass X's virtual DOM caching lag.
- **Dedicated Reposts Purging**: Native support for un-retweeting posts on the dedicated `/reposts` route.
- **Immutable Whitelist Vault**: Complete preservation for protected usernames, specific tweet IDs, and preservation keywords (`#keep`).
- **Parallel Multi-Tab Execution**: Concurrent workers for simultaneous tweet deletion and relationship cleanup.

---

## Quick Start

### 1. Web Application

```bash
# Clone repository
git clone https://github.com/Admuad/x-account-cleaner.git
cd x-account-cleaner

# Start web dashboard
npm run ui
```

Access the interface at `http://localhost:3000`.

---

### 2. Headless Terminal CLI

```bash
# Install root dependencies
npm install

# Install Playwright browser binary
npx playwright install chromium

# Launch interactive CLI wizard
npm start
```

---

### 3. Companion Browser Extension

1. Open `chrome://extensions` (or Kiwi Browser / Orion on mobile).
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `extension/` directory.
4. Navigate to `x.com` and open `http://localhost:3000/app` to dispatch live tasks.

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
