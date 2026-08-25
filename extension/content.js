// Content script running inside X (Twitter) Web Interface
// Autonomous Multi-Module Purge Engine with Jitter Pacing, Anti-Rogue Locks, and Resume Auto-Reload

console.log('[VanishX Extension] Content script loaded on X.com');

// Global execution control flags
let isRunning = false;
let isPaused = false;

// Check on page load if an active purge task was in progress across navigation / resume reload
chrome.storage.local.get(['vanishx_active_task'], (result) => {
  const activeTask = result?.vanishx_active_task;
  if (activeTask && activeTask.status === 'running') {
    console.log('[VanishX Extension] Resuming active purge task from storage:', activeTask);
    isRunning = true;
    isPaused = false;

    // If this was triggered by a Resume Reload, notify dashboard and start cleanly after DOM mounts
    if (activeTask.resumeOnLoad) {
      chrome.storage.local.set({
        vanishx_active_task: { ...activeTask, resumeOnLoad: false }
      });
      sendLog('info', '🔄 Tab reloaded for clean DOM state. Resuming purge stream in 2.5s...');
      setTimeout(() => {
        if (isRunning && !isPaused) {
          executePurgeLoop(activeTask.config);
        }
      }, 2500);
    } else {
      setTimeout(() => {
        if (isRunning && !isPaused) {
          executePurgeLoop(activeTask.config);
        }
      }, 1500);
    }
  } else {
    // If not actively running, ensure flags remain idle
    isRunning = false;
    isPaused = false;
  }
});

// Listen for messages from background service worker / dashboard
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_X_PROFILE') {
    const handle = extractCurrentXHandle();
    sendResponse({
      success: !!handle,
      handle,
      url: window.location.href,
    });
    return true;
  }

  if (request.type === 'START_CLIENT_PURGE') {
    console.log('[VanishX Extension] Starting purge loop with config:', request.config);
    isRunning = true;
    isPaused = false;

    // Persist active task state so navigation doesn't kill execution
    chrome.storage.local.set({
      vanishx_active_task: {
        status: 'running',
        config: request.config,
        startedAt: Date.now(),
        resumeOnLoad: false,
      }
    });

    executePurgeLoop(request.config || {});
    sendResponse({ status: 'started' });
    return true;
  }

  if (request.type === 'PAUSE_CLIENT_PURGE') {
    isPaused = true;
    // Update storage state so it doesn't auto-resume on refresh
    chrome.storage.local.set({
      vanishx_active_task: {
        status: 'paused',
      }
    });
    sendLog('warn', '⏸️ Purge execution paused by user.');
    sendResponse({ status: 'paused' });
    return true;
  }

  if (request.type === 'RESUME_CLIENT_PURGE') {
    isPaused = false;
    isRunning = true;

    if (request.reload) {
      sendLog('info', '🔄 Reloading 𝕏 tab to clear processed items from DOM...');
      chrome.storage.local.get(['vanishx_active_task'], (res) => {
        const prevConfig = res?.vanishx_active_task?.config || {};
        chrome.storage.local.set({
          vanishx_active_task: {
            status: 'running',
            config: prevConfig,
            resumeOnLoad: true,
          }
        }, () => {
          window.location.reload();
        });
      });
      sendResponse({ status: 'reloading' });
      return true;
    } else {
      sendLog('info', '▶️ Purge execution resumed by user.');
      sendResponse({ status: 'resumed' });
      return true;
    }
  }

  if (request.type === 'STOP_CLIENT_PURGE') {
    isRunning = false;
    isPaused = false;
    // Immediate storage wipe prevents any rogue execution on later manual page refresh
    chrome.storage.local.remove('vanishx_active_task');
    sendLog('warn', '⏹️ Purge execution aborted by user.');
    sendResponse({ status: 'stopped' });
    return true;
  }
});

// ==========================================
// 1. ROBUST X PROFILE & HANDLE DETECTOR
// ==========================================
function extractCurrentXHandle() {
  // Strategy 1: SideNav account switcher button bottom-left
  const switcherSpan = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"] span:last-child');
  if (switcherSpan && switcherSpan.textContent && switcherSpan.textContent.includes('@')) {
    return switcherSpan.textContent.replace('@', '').trim();
  }

  // Strategy 2: Profile link in left sidebar (href="/username")
  const profileLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
  if (profileLink && profileLink.getAttribute('href')) {
    const href = profileLink.getAttribute('href').replace('/', '').trim();
    if (href && !['home', 'explore', 'notifications', 'messages', 'i', 'bookmarks'].includes(href)) {
      return href;
    }
  }

  // Strategy 3: User name metadata container in timeline/header
  const userMeta = document.querySelector('[data-testid="UserName"]');
  if (userMeta && userMeta.textContent) {
    const match = userMeta.textContent.match(/@([a-zA-Z0-9_]{1,15})/);
    if (match && match[1]) return match[1];
  }

  // Strategy 4: Fallback to current URL pathname if on /username
  const pathname = window.location.pathname;
  if (pathname.length > 1) {
    const firstSegment = pathname.split('/')[1];
    const reservedRoutes = ['home', 'explore', 'notifications', 'messages', 'bookmarks', 'settings', 'i', 'compose', 'search'];
    if (firstSegment && !reservedRoutes.includes(firstSegment)) {
      return firstSegment;
    }
  }

  return '';
}

// Extract Ground Truth Following Count from profile DOM
function extractGroundTruthFollowingCount() {
  try {
    const followingLink = document.querySelector('a[href$="/following"]');
    if (followingLink) {
      const text = followingLink.textContent || '';
      const match = text.match(/([0-9,.]+[KMkm]?)\s*Following/i);
      if (match && match[1]) {
        const raw = match[1].replace(/,/g, '').toLowerCase();
        if (raw.endsWith('k')) return Math.round(parseFloat(raw) * 1000);
        if (raw.endsWith('m')) return Math.round(parseFloat(raw) * 1000000);
        return parseInt(raw, 10);
      }
    }
  } catch (e) {}
  return null;
}

// Check for X Rate Limits / Anti-Spam Warnings in DOM
function checkRateLimitWarning() {
  const text = document.body?.innerText || '';
  return (
    text.includes('Rate limit exceeded') ||
    text.includes('Try again later') ||
    text.includes('Something went wrong') ||
    text.includes('unable to follow') ||
    text.includes('temporarily restricted')
  );
}

// ==========================================
// 2. MAIN PURGE ORCHESTRATOR
// ==========================================
async function executePurgeLoop(config) {
  isRunning = true;
  isPaused = false;

  const handle = config.handle || extractCurrentXHandle();
  if (!handle) {
    sendLog('error', 'Could not detect active 𝕏 handle. Please open your profile page.');
    chrome.storage.local.remove('vanishx_active_task');
    return;
  }

  sendLog('info', `🚀 VanishX Engine engaged for @${handle} (Pacing: ${config.pacing || 'balanced'}).`);

  const modules = config.modules || { posts: true, replies: true, reposts: false, following: false };
  const whitelistUsers = (config.whitelist?.users || []).map(u => u.toLowerCase().replace('@', '').trim());

  // ----------------------------------------
  // MODULE A: FOLLOWING PURGE
  // ----------------------------------------
  if (modules.following) {
    const targetFollowingUrl = `https://x.com/${handle}/following`;
    if (!window.location.href.toLowerCase().includes(`/${handle.toLowerCase()}/following`)) {
      sendLog('info', `Navigating to Following list: ${targetFollowingUrl}`);
      window.location.href = targetFollowingUrl;
      return; // Will resume automatically after navigation via storage
    }

    await runFollowingPurge(config, whitelistUsers);
    if (!isRunning) return;
  }

  // ----------------------------------------
  // MODULE B: REPOSTS (UN-RETWEET)
  // ----------------------------------------
  if (modules.reposts && !modules.posts && !modules.replies && isRunning) {
    const targetProfileUrl = `https://x.com/${handle}`;
    if (!window.location.href.toLowerCase().endsWith(`/${handle.toLowerCase()}`)) {
      sendLog('info', `Navigating to Timeline for Reposts: ${targetProfileUrl}`);
      window.location.href = targetProfileUrl;
      return;
    }

    await runTimelinePurge(config, whitelistUsers, { onlyReposts: true });
    if (!isRunning) return;
  }

  // ----------------------------------------
  // MODULE C: POSTS & REPLIES
  // ----------------------------------------
  if ((modules.posts || modules.replies) && isRunning) {
    let targetUrl = `https://x.com/${handle}`;
    if (modules.replies && !modules.posts) {
      targetUrl = `https://x.com/${handle}/with_replies`;
    }

    if (config.dateFilter?.enabled && config.dateFilter.endDate) {
      const untilQuery = encodeURIComponent(`from:${handle} until:${config.dateFilter.endDate}`);
      targetUrl = `https://x.com/search?q=${untilQuery}&f=live`;
    }

    const currentUrl = window.location.href.toLowerCase();
    const isSearchRoute = currentUrl.includes('/search?');
    const isProfileRoute = currentUrl.includes(`/${handle.toLowerCase()}`);

    if (!isSearchRoute && !isProfileRoute) {
      sendLog('info', `Navigating to target timeline: ${targetUrl}`);
      window.location.href = targetUrl;
      return;
    }

    await runTimelinePurge(config, whitelistUsers, { onlyReposts: false });
  }

  // Finished all tasks
  if (isRunning) {
    chrome.storage.local.remove('vanishx_active_task');
    sendLog('success', '✔ VanishX execution completed successfully.');
  }
}

// ==========================================
// 3. FOLLOWING PURGE ENGINE
// ==========================================
async function runFollowingPurge(config, whitelistUsers) {
  sendLog('info', '👥 [Following Engine] Scanning following list...');
  await delay(2500);

  // Broadcast ground truth target count if available
  const groundTruthCount = extractGroundTruthFollowingCount();
  if (groundTruthCount !== null && groundTruthCount > 0) {
    sendLog('info', `📊 Target Account Ground Truth: ${groundTruthCount} Following accounts detected.`);
    sendTelemetryWithTarget('info', `Target sync: ${groundTruthCount} accounts`, groundTruthCount);
  }

  const botPreset = config.botFilter?.preset || 'aggressive'; // 'aggressive' = Unfollow All
  let unfollowedCount = 0;
  let consecutiveEmptyPasses = 0;
  const processedHandles = new Set();

  while (isRunning && consecutiveEmptyPasses < 5 && unfollowedCount < 1000) {
    // Check Pause State
    while (isPaused && isRunning) {
      await delay(400);
    }
    if (!isRunning) break;

    // Check Anti-Spam Rate Limits
    if (checkRateLimitWarning()) {
      sendLog('warn', '⚠️ 𝕏 Rate Limit Alert detected! Pausing for 45s safety cooldown...');
      await delay(45000);
      window.location.reload();
      return;
    }

    const userCells = Array.from(document.querySelectorAll('[data-testid="UserCell"]'));

    if (userCells.length === 0) {
      consecutiveEmptyPasses++;
      sendLog('info', `Scrolling to load more following accounts (${consecutiveEmptyPasses}/5)...`);
      window.scrollBy(0, window.innerHeight * 1.5);
      await delay(1800);
      continue;
    }

    let unfollowedInPass = 0;

    for (const cell of userCells) {
      // Check Pause / Stop State before each user cell
      while (isPaused && isRunning) {
        await delay(400);
      }
      if (!isRunning) break;

      // Extract handle
      const link = cell.querySelector('a[role="link"][href^="/"]');
      let targetHandle = '';
      if (link) {
        const href = link.getAttribute('href') || '';
        targetHandle = href.replace('/', '').split('/')[0].split('?')[0].trim().toLowerCase();
      }

      if (!targetHandle || processedHandles.has(targetHandle)) {
        continue;
      }
      processedHandles.add(targetHandle);

      // Check Whitelist Vault
      if (whitelistUsers.includes(targetHandle)) {
        sendLog('info', `🛡️ Skipped @${targetHandle} (Whitelisted in Vault)`);
        continue;
      }

      // Check relationship rule
      // 'aggressive' / 'all': unfollow 100% of non-whitelisted
      // 'non_mutuals_only': check if "Follows you" badge exists
      if (botPreset === 'non_mutuals_only') {
        const followsYouBadge = cell.querySelector('[data-testid="userFollowIndicator"]');
        const textContent = cell.textContent || '';
        const isMutual = !!followsYouBadge || textContent.toLowerCase().includes('follows you');
        if (isMutual) {
          sendLog('info', `🤝 Preserved mutual @${targetHandle} (Follows you)`);
          continue;
        }
      }

      // STRICT SAFEGUARD: Find candidate button and strictly reject any "Follow" buttons
      const buttons = Array.from(cell.querySelectorAll('button, div[role="button"]'));
      let unfollowBtn = null;

      for (const btn of buttons) {
        const text = (btn.textContent || '').trim();
        const testId = btn.getAttribute('data-testid') || '';
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();

        // STRICT REJECTION: If button says "Follow" or is a follow button, NEVER TOUCH IT!
        if (text === 'Follow' || testId.endsWith('-follow') || (ariaLabel.startsWith('follow @') && !ariaLabel.includes('following'))) {
          continue;
        }

        // STRICT ACCEPTANCE: Only if it represents an active following relationship
        if (
          testId.endsWith('-unfollow') ||
          text === 'Following' ||
          ariaLabel.includes('following') ||
          ariaLabel.includes('unfollow')
        ) {
          unfollowBtn = btn;
          break;
        }
      }

      if (!unfollowBtn) {
        continue;
      }

      try {
        // 1. Click unfollow trigger
        unfollowBtn.click();
        await delay(350);

        // 2. Click confirm dialog
        const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
        if (confirmBtn) {
          confirmBtn.click();
          unfollowedCount++;
          unfollowedInPass++;
          consecutiveEmptyPasses = 0;

          sendLog('unfollow', `👋 Unfollowed @${targetHandle} (#${unfollowedCount})`);
          
          // Human-mimicking jitter delay
          const jitterDelay = calculateJitter(config.pacing || 'balanced');
          await delay(jitterDelay);
        }
      } catch (err) {
        console.error('[VanishX] Error unfollowing user:', err);
      }
    }

    if (!isRunning) break;

    // Scroll down to fetch next dynamic batch
    window.scrollBy(0, window.innerHeight * 1.5);
    await delay(1800);

    // Check for empty state
    const emptyState = document.querySelector('[data-testid="emptyState"], [data-testid="empty_timeline"]');
    if (emptyState && unfollowedInPass === 0) {
      sendLog('info', '✨ Reached end of Following list (Zero accounts remaining).');
      break;
    }
  }

  if (isRunning) {
    sendLog('success', `✔ Completed Following Purge: ${unfollowedCount} accounts unfollowed.`);
  }
}

// ==========================================
// 4. TIMELINE PURGE (POSTS, REPLIES, REPOSTS)
// ==========================================
async function runTimelinePurge(config, whitelistUsers, options = { onlyReposts: false }) {
  sendLog('info', '🗑️ [Timeline Engine] Scanning posts and replies...');
  await delay(2500);

  const keywords = (config.whitelist?.keywords || []).map(k => k.toLowerCase().trim());
  let purgedCount = 0;
  let emptyScrolls = 0;

  while (isRunning && emptyScrolls < 5 && purgedCount < 500) {
    while (isPaused && isRunning) {
      await delay(400);
    }
    if (!isRunning) break;

    // Check Anti-Spam Rate Limits
    if (checkRateLimitWarning()) {
      sendLog('warn', '⚠️ 𝕏 Rate Limit Alert detected! Pausing for 45s safety cooldown...');
      await delay(45000);
      window.location.reload();
      return;
    }

    // 1. Check for Un-Retweet buttons first
    if (config.modules?.reposts || options.onlyReposts) {
      const unretweetBtns = Array.from(document.querySelectorAll('[data-testid="unretweet"]'));
      for (const btn of unretweetBtns) {
        if (!isRunning) break;
        while (isPaused && isRunning) {
          await delay(400);
        }
        try {
          btn.click();
          await delay(350);
          const confirmUnretweet = document.querySelector('[data-testid="unretweetConfirm"]');
          if (confirmUnretweet) {
            confirmUnretweet.click();
            purgedCount++;
            emptyScrolls = 0;
            sendLog('repost', `Undo Repost / Retweet (#${purgedCount})`);
            
            const jitterDelay = calculateJitter(config.pacing || 'balanced');
            await delay(jitterDelay);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (options.onlyReposts) {
      window.scrollBy(0, window.innerHeight * 1.5);
      await delay(1800);
      continue;
    }

    // 2. Check for Caret dropdowns to delete tweets & replies
    const carets = Array.from(document.querySelectorAll('[data-testid="caret"]'));

    if (carets.length === 0) {
      emptyScrolls++;
      sendLog('info', `Scrolling timeline for next batch of posts (${emptyScrolls}/5)...`);
      window.scrollBy(0, window.innerHeight * 1.5);
      await delay(1800);
      continue;
    }

    let deletedInPass = 0;

    for (const caret of carets) {
      if (!isRunning) break;
      while (isPaused && isRunning) {
        await delay(400);
      }

      // Find parent tweet element to check keyword whitelist
      const tweetArticle = caret.closest('article[data-testid="tweet"]');
      if (tweetArticle) {
        const text = tweetArticle.textContent?.toLowerCase() || '';
        const hasKeyword = keywords.some(k => k && text.includes(k));
        if (hasKeyword) {
          sendLog('info', '🛡️ Preserved tweet containing whitelisted keyword.');
          continue;
        }
      }

      try {
        caret.click();
        await delay(400);

        // Check for Delete option in dropdown
        const deleteOption = document.querySelector('[data-testid="Dropdown"] [role="menuitem"]');
        if (deleteOption && deleteOption.textContent && deleteOption.textContent.toLowerCase().includes('delete')) {
          deleteOption.click();
          await delay(400);

          // Confirm delete modal
          const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
          if (confirmBtn) {
            confirmBtn.click();
            purgedCount++;
            deletedInPass++;
            emptyScrolls = 0;
            sendLog('delete', `Purged timeline post/reply (#${purgedCount})`);
            
            const jitterDelay = calculateJitter(config.pacing || 'balanced');
            await delay(jitterDelay);
          }
        } else {
          document.body.click();
          await delay(250);
        }
      } catch (err) {
        console.error('[VanishX] Error deleting item:', err);
        document.body.click();
        await delay(250);
      }
    }

    if (!isRunning) break;

    // Scroll down for next batch
    window.scrollBy(0, window.innerHeight * 1.5);
    await delay(1800);

    const emptyState = document.querySelector('[data-testid="emptyState"], [data-testid="empty_timeline"]');
    if (emptyState && deletedInPass === 0) {
      sendLog('info', '✨ Reached end of timeline items.');
      break;
    }
  }

  if (isRunning) {
    sendLog('success', `✔ Completed Timeline Purge: ${purgedCount} items removed.`);
  }
}

// ==========================================
// 5. UTILITIES & JITTER PACING
// ==========================================
function calculateJitter(pacing) {
  // Safe: 2500ms - 4500ms randomized
  // Balanced: 1200ms - 2500ms randomized
  // Turbo: 700ms - 1200ms randomized
  let min = 1200;
  let max = 2500;

  if (pacing === 'safe') {
    min = 2500;
    max = 4500;
  } else if (pacing === 'turbo') {
    min = 700;
    max = 1200;
  }

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sendLog(type, message) {
  chrome.runtime.sendMessage({
    type: 'TELEMETRY_LOG_EVENT',
    log: {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
    }
  }).catch(() => {});
}

function sendTelemetryWithTarget(type, message, totalTargeted) {
  chrome.runtime.sendMessage({
    type: 'TELEMETRY_LOG_EVENT',
    totalTargeted,
    log: {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
    }
  }).catch(() => {});
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
