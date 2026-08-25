# VanishX Project Lessons & Architectural Memory

## 1. Chromium Companion Extension DOM Automation & Virtualized SPAs
- **Background Tab Timer Throttling**:
  - *Pitfall*: Chromium aggressively throttles timers (`setTimeout`, `setInterval`) to 1 execution per minute and pauses DOM/scroll updates when the user switches to another tab (like the dashboard).
  - *Fix*: Initialize an inaudible Web Audio keepalive oscillator (`AudioContext` with `gain: 0.00001`) in `content.js` during active execution. This flags the tab as active media to Chromium and guarantees full-speed execution while the user is viewing the dashboard.

- **Virtual DOM Button Mutation (Accidental Follows)**:
  - *Pitfall*: When an account is unfollowed on 𝕏, the button text instantly mutates from `"Following"` to `"Follow"`. A loose selector catches this mutated button and clicks it, re-following the user.
  - *Fix*: Explicitly reject any button whose `textContent === 'Follow'`, `data-testid$="-follow"`, or `aria-label` starts with `"Follow @"`. Only click verified `"Following"` / `data-testid$="-unfollow"`.

- **Virtual Scroll Skipping**:
  - *Pitfall*: Leaping `1.5 * window.innerHeight` in a single scroll causes virtualized lists (`react-window`) to unmount or discard nodes before they render.
  - *Fix*: Micro-scroll in 400-500px increments divided into 3 micro-steps with a 650ms DOM mount grace period (`microScrollDown(450)`).

- **State/Config Wipe Across Pause/Resume**:
  - *Pitfall*: Saving only `{ status: 'paused' }` into `chrome.storage.local` drops the `config` payload, causing resumed runs to fall back to default modules (e.g. searching for posts instead of following).
  - *Fix*: Merge storage on pause (`{ ...existingTask, status: 'paused' }`) and transmit current dashboard `config` on resume (`VANISHX_RESUME_PURGE`).

- **Zero-State Verification Pass**:
  - *Pitfall*: Never declare a task complete solely because a scroll batch returned empty.
  - *Fix*: Reload the tab (`location.reload()`), wait 2.5s for fresh server DOM to mount, and verify 0 remaining actionable items before declaring 100% completion.

## 2. Dynamic Ground-Truth Stats Extraction
- *Pitfall*: Hardcoding target counts (e.g., 150) causes the progress bar to misrepresent real work and prevents completion triggers from firing.
- *Fix*: `extractCurrentXProfileStats()` extracts exact counts from `a[href$="/following"]`, `a[href$="/followers"]`, and header `450 posts` directly from 𝕏's DOM and populates the dashboard prior to execution.
