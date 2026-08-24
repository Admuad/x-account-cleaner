# ⚡ VanishX — Autonomous 𝕏 Account Purge & Bot Cleanser

A modern, client-side 𝕏 (Twitter) cleaning suite featuring a **Next.js Web Dashboard**, a **Lightweight Companion Browser Extension**, and a **High-Performance Terminal CLI**. Delete posts, replies, retweets, and mass-unfollow non-mutuals & bots with surgical date-range precision.

[![GitHub Repository](https://img.shields.io/badge/GitHub-Admuad%2Fx--account--cleaner-FF6044?logo=github)](https://github.com/Admuad/x-account-cleaner)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)

---

## 🌟 Key Features

- **🌐 Web App Dashboard (`/app`)**: Tabbed control room for selecting date ranges, tuning bot detection heuristics, managing whitelists, and monitoring real-time telemetry.
- **🧩 Companion Browser Extension (`/extension`)**: Manifest V3 extension executing directly in your active `x.com` browser tab. Zero credentials stored on cloud servers.
- **💻 Headless Terminal CLI (`/cli`)**: Standalone Playwright automation engine for autonomous purges and CI/cron jobs.
- **📅 Date-Range Fast-Forwarding**: Filter content before specific eras (e.g. *Before Dec 31, 2025*, *Keep Last 30 Days*, *Custom Range*) using native 𝕏 search operators (`until:YYYY-MM-DD`).
- **🤖 Multi-Factor Bot Radar**: Scores non-mutuals, default egg avatars, random numeric handles (`@user128491`), and inactive scrapers with strict whitelist immunity.
- **⚡ Zero-State Verification Loop**: Profile header ground-truth counter validation guarantees 0 phantom leftover tweets.

---

## 🚀 Quick Start

### 1. Launch the Web Application
```bash
# Clone the repository
git clone https://github.com/Admuad/x-account-cleaner.git
cd x-account-cleaner

# Start the Web Dashboard
npm run ui
```
*Open `http://localhost:3000` in your browser.*

---

### 2. Run the Terminal CLI
```bash
# Install dependencies
npm install

# Download Playwright Chromium binary
npx playwright install chromium

# Launch the interactive CLI wizard
npm start
```

---

### 3. Load the Browser Extension
1. Open `chrome://extensions` in Chrome/Brave/Edge.
2. Toggle **Developer mode** on.
3. Click **Load unpacked** and select the [`extension/`](extension/) directory.

---

## 📋 CLI Options Reference

| Flag | Shorthand | Description |
| :--- | :--- | :--- |
| `--posts` | `-p` | Delete original posts |
| `--replies` | `-r` | Delete replies & thread responses |
| `--reposts` | `-k` | Undo retweets on dedicated `/reposts` tab |
| `--unfollow` | `-u` | Unfollow non-mutuals and bot accounts |
| `--followers`| `-f` | Remove followers (soft-block method) |
| `--until <date>` | | Target historical tweets before date (e.g. `2025-12-31`) |
| `--turbo` | | High-speed 0.7s pacing mode |
| `--dry-run` | `-d` | Simulation mode (preview without deleting) |
| `--whitelist <path>` | | Custom whitelist JSON file |

---

## 🔒 Security & Privacy

VanishX is built on a **Zero-Trust Client-Side Architecture**:
- Zero passwords, authentication tokens, or private telemetry data are sent to external cloud servers.
- All actions execute locally via your authenticated browser session or direct Playwright instance.

---

## 📄 License

MIT License. Open-source software created by [Admuad](https://github.com/Admuad).
