// Content script running inside X (Twitter) Web Interface
// Autonomous Multi-Module Purge Engine with Anti-Throttling Keepalive, Micro-Scrolling, and Zero-State Verification

console.log('[VanishX Extension] Content script loaded on X.com');

// Global execution control flags and active config in memory
let isRunning = false;
let isPaused = false;
let activePurgeConfig = null;
let audioContextKeepalive = null;

// ==========================================
// 0. ANTI-THROTTLING KEEPALIVE
// ==========================================
function startKeepalive() {
  try {
    if (!audioContextKeepalive) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioContextKeepalive = new AudioCtx();
        const osc = audioContextKeepalive.createOscillator();
        const gain = audioContextKeepalive.createGain();
        gain.gain.value = 0.00001; // Inaudible
        osc.connect(gain);
        gain.connect(audioContextKeepalive.destination);
        osc.start();
      }
    }
    if (audioContextKeepalive && audioContextKeepalive.state === 'suspended') {
      audioContextKeepalive.resume().catch(() => {});
    }
  } catch (e) {}
}

function stopKeepalive() {
  try {
    if (audioContextKeepalive) {
      audioContextKeepalive.close().catch(() => {});
      audioContextKeepalive = null;
    }
  } catch (e) {}
}

// Check on page load if an active purge or verification task was in progress
chrome.storage.local.get(['vanishx_active_task'], (result) => {
  const activeTask = result?.vanishx_active_task;

  // 1. Verification Pass Handler
  if (activeTask && activeTask.status === 'verifying') {
    console.log('[VanishX Extension] Executing Zero-State Verification Pass...');
    startKeepalive();
    setTimeout(async () => {
      const isFollowing = activeTask.module === 'following';
      let remainingCount = 0;

      if (isFollowing) {
        const cells = Array.from(document.querySelectorAll('[data-testid="UserCell"]'));
        for (const cell of cells) {
          const hasUnfollow = cell.querySelector('[data-testid$="-unfollow"]') ||
            Array.from(cell.querySelectorAll('button')).some(b => b.textContent && b.textContent.trim() === 'Following');
          if (hasUnfollow) remainingCount++;
        }
      } else {
        const carets = document.querySelectorAll('[data-testid="caret"], [data-testid="unretweet"]');
        remainingCount = carets.length;
      }

      if (remainingCount === 0) {
        chrome.storage.local.remove('vanishx_active_task');
        stopKeepalive();
        sendLog('success', `🎉 Zero-State Verified: All targeted items completely cleared! (0 remaining)`);
        sendTelemetryStatus('completed', activeTask.purgedCount || 0);
      } else {
        sendLog('info', `Found ${remainingCount} remaining items during verification. Cleaning up remaining accounts...`);
        executePurgeLoop(activeTask.config);
      }
    }, 2500);
    return;
  }

  // 2. Normal Running Task Resume
  if (activeTask && activeTask.status === 'running' && activeTask.config) {
    console.log('[VanishX Extension] Resuming active purge task from storage:', activeTask);
    isRunning = true;
    isPaused = false;
    activePurgeConfig = activeTask.config;
    startKeepalive();

    // If this was triggered by a Resume Reload, start cleanly after DOM mounts
    if (activeTask.resumeOnLoad) {
      chrome.storage.local.set({
        vanishx_active_task: { ...activeTask, resumeOnLoad: false }
      });
      sendLog('info', '🔄 Tab reloaded for clean DOM state. Resuming purge stream in 2.5s...');
      setTimeout(() => {
        if (isRunning && !isPaused) {
          executePurgeLoop(activePurgeConfig);
        }
      }, 2500);
    } else {
      setTimeout(() => {
        if (isRunning && !isPaused) {
          executePurgeLoop(activePurgeConfig);
        }
      }, 1500);
    }
  } else {
    isRunning = false;
    isPaused = false;
    activePurgeConfig = null;
    stopKeepalive();
  }
});

// Listen for messages from background service worker / dashboard
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_X_PROFILE') {
    const profileStats = extractCurrentXProfileStats();
    sendResponse({
      success: !!profileStats.handle,
      ...profileStats,
      url: window.location.href,
    });
    return true;
  }

  if (request.type === 'START_CLIENT_PURGE') {
    console.log('[VanishX Extension] Starting purge loop with config:', request.config);
    isRunning = true;
    isPaused = false;
    activePurgeConfig = request.config;
    startKeepalive();

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
    stopKeepalive();
    chrome.storage.local.get(['vanishx_active_task'], (res) => {
      const existingConfig = res?.vanishx_active_task?.config || activePurgeConfig || {};
      chrome.storage.local.set({
        vanishx_active_task: {
          status: 'paused',
          config: existingConfig,
        }
      });
    });
    sendLog('warn', '⏸️ Purge execution paused by user.');
    sendResponse({ status: 'paused' });
    return true;
  }

  if (request.type === 'RESUME_CLIENT_PURGE') {
    isPaused = false;
    isRunning = true;
    startKeepalive();

    if (request.reload) {
      sendLog('info', '🔄 Reloading 𝕏 tab to clear processed items from DOM...');
      chrome.storage.local.get(['vanishx_active_task'], (res) => {
        const resumeConfig = request.config || res?.vanishx_active_task?.config || activePurgeConfig || {};
        activePurgeConfig = resumeConfig;
        chrome.storage.local.set({
          vanishx_active_task: {
            status: 'running',
            config: resumeConfig,
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
    activePurgeConfig = null;
    stopKeepalive();
    chrome.storage.local.remove('vanishx_active_task');
    sendLog('warn', '⏹️ Purge execution aborted by user.');
    sendResponse({ status: 'stopped' });
    return true;
  }
});

// ==========================================
// 1. ROBUST X PROFILE & STATS SCRAPER
// ==========================================
function extractCurrentXProfileStats() {
  let handle = '';
  let name = '';
  let avatarUrl = '';
  let followingCount = 0;
  let followersCount = 0;
  let postsCount = 0;

  // 1. Extract Handle
  const switcherSpan = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"] span:last-child');
  if (switcherSpan && switcherSpan.textContent && switcherSpan.textContent.includes('@')) {
    handle = switcherSpan.textContent.replace('@', '').trim();
  }

  if (!handle) {
    const profileLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
    if (profileLink && profileLink.getAttribute('href')) {
      const href = profileLink.getAttribute('href').replace('/', '').trim();
      if (href && !['home', 'explore', 'notifications', 'messages', 'i', 'bookmarks'].includes(href)) {
        handle = href;
      }
    }
  }

  if (!handle) {
    const userMeta = document.querySelector('[data-testid="UserName"]');
    if (userMeta && userMeta.textContent) {
      const match = userMeta.textContent.match(/@([a-zA-Z0-9_]{1,15})/);
      if (match && match[1]) handle = match[1];
    }
  }

  if (!handle) {
    const pathname = window.location.pathname;
    if (pathname.length > 1) {
      const firstSegment = pathname.split('/')[1];
      const reserved = ['home', 'explore', 'notifications', 'messages', 'bookmarks', 'settings', 'i', 'compose', 'search'];
      if (firstSegment && !reserved.includes(firstSegment)) {
        handle = firstSegment;
      }
    }
  }

  // 2. Extract Display Name & Avatar
  const avatarImg = document.querySelector('img[src*="profile_images"]');
  if (avatarImg) {
    avatarUrl = avatarImg.getAttribute('src') || '';
    name = avatarImg.getAttribute('alt') || `@${handle}`;
  }

  // 3. Extract Following Count
  const followingLink = document.querySelector('a[href$="/following"]');
  if (followingLink) {
    followingCount = parseStatNumber(followingLink.textContent || '');
  }

  // 4. Extract Followers Count
  const followersLink = document.querySelector('a[href$="/verified_followers"], a[href$="/followers"]');
  if (followersLink) {
    followersCount = parseStatNumber(followersLink.textContent || '');
  }

  // 5. Extract Posts Count (e.g., from Profile Header "450 posts")
  const headerDivs = Array.from(document.querySelectorAll('div[data-testid="primaryColumn"] h2 + div, div[dir="ltr"]'));
  for (const div of headerDivs) {
    const text = div.textContent || '';
    if (text.toLowerCase().includes('post') || text.toLowerCase().includes('tweet')) {
      const parsed = parseStatNumber(text);
      if (parsed > 0) {
        postsCount = parsed;
        break;
      }
    }
  }

  return {
    handle,
    name: name || `@${handle}`,
    avatarUrl,
    followingCount,
    followersCount,
    postsCount,
  };
}

function parseStatNumber(text) {
  if (!text) return 0;
  const match = text.match(/([0-9,.]+[KMkm]?)/);
  if (!match || !match[1]) return 0;
  const raw = match[1].replace(/,/g, '').toLowerCase();
  if (raw.endsWith('k')) return Math.round(parseFloat(raw) * 1000);
  if (raw.endsWith('m')) return Math.round(parseFloat(raw) * 1000000);
  return parseInt(raw, 10) || 0;
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

// Micro-scroll down in 3 smooth intervals to give X virtual DOM time to render
async function microScrollDown(distance = 450) {
  const steps = 3;
  const stepDist = distance / steps;
  for (let i = 0; i < steps; i++) {
    window.scrollBy(0, stepDist);
    await delay(120);
  }
  await delay(650); // DOM mount grace period
}

// ==========================================
// 2. MAIN PURGE ORCHESTRATOR
// ==========================================
async function executePurgeLoop(config) {
  isRunning = true;
  isPaused = false;
  startKeepalive();

  const stats = extractCurrentXProfileStats();
  const handle = config.handle || stats.handle;
  if (!handle) {
    sendLog('error', 'Could not detect active 𝕏 handle. Please open your profile page.');
    chrome.storage.local.remove('vanishx_active_task');
    return;
  }

  sendLog('info', `🚀 VanishX Engine engaged for @${handle} (Pacing: ${config.pacing || 'balanced'}).`);

  const modules = config.modules || activePurgeConfig?.modules || { posts: false, replies: false, reposts: false, following: false };
  const whitelistUsers = ((config.whitelist?.users || activePurgeConfig?.whitelist?.users) || []).map(u => u.toLowerCase().replace('@', '').trim());

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

    await runFollowingPurge(config, whitelistUsers, stats.followingCount);
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
    if (!isRunning) return;
  }

  // ----------------------------------------
  // MODULE D: REMOVE FOLLOWERS
  // ----------------------------------------
  if (modules.followers && isRunning) {
    const targetFollowersUrl = `https://x.com/${handle}/followers`;
    if (!window.location.href.toLowerCase().includes(`/${handle.toLowerCase()}/followers`)) {
      sendLog('info', `Navigating to Followers list: ${targetFollowersUrl}`);
      window.location.href = targetFollowersUrl;
      return;
    }

    await runFollowersPurge(config, whitelistUsers, stats.followersCount);
  }

  // Finished all tasks
  if (isRunning) {
    chrome.storage.local.remove('vanishx_active_task');
    stopKeepalive();
    sendLog('success', '✔ VanishX execution completed successfully.');
  }
}

// ==========================================
// 2.5 FOLLOWERS PURGE ENGINE
// ==========================================
async function runFollowersPurge(config, whitelistUsers, initialTargetCount = 0) {
  sendLog('info', '👥 [Followers Engine] Scanning followers list...');
  await delay(2000);

  const stats = extractCurrentXProfileStats();
  const groundTruth = stats.followersCount || initialTargetCount;
  if (groundTruth > 0) {
    sendLog('info', `📊 Target Ground Truth: ${groundTruth} Followers detected.`);
    sendTelemetryWithTarget('info', `Target sync: ${groundTruth} followers`, groundTruth);
  }

  let removedCount = 0;
  let consecutiveEmptyPasses = 0;
  const processedHandles = new Set();

  while (isRunning && consecutiveEmptyPasses < 4 && removedCount < 1000) {
    while (isPaused && isRunning) {
      await delay(400);
    }
    if (!isRunning) break;

    if (checkRateLimitWarning()) {
      sendLog('warn', '⚠️ 𝕏 Rate Limit Alert detected! Pausing for 45s safety cooldown...');
      await delay(45000);
      window.location.reload();
      return;
    }

    const userCells = Array.from(document.querySelectorAll('[data-testid="UserCell"]'));

    if (userCells.length === 0) {
      consecutiveEmptyPasses++;
      sendLog('info', `Scrolling to load more followers (${consecutiveEmptyPasses}/4)...`);
      await microScrollDown(450);
      continue;
    }

    let removedInPass = 0;

    for (const cell of userCells) {
      while (isPaused && isRunning) {
        await delay(400);
      }
      if (!isRunning) break;

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

      if (whitelistUsers.includes(targetHandle)) {
        sendLog('info', `🛡️ Skipped follower @${targetHandle} (Whitelisted in Vault)`);
        continue;
      }

      // Find 3-dots action menu
      const moreBtn = cell.querySelector('[data-testid="userFollowActions"], button[aria-label="More"], [data-testid="caret"]');
      if (!moreBtn) continue;

      try {
        moreBtn.click();
        await delay(350);

        // Method 1: "Remove this follower"
        const menuItems = Array.from(document.querySelectorAll('[role="menuitem"]'));
        const removeOption = menuItems.find((el) => {
          const txt = (el.textContent || '').toLowerCase();
          return txt.includes('remove this follower') || txt.includes('remove follower');
        });

        if (removeOption) {
          removeOption.click();
          await delay(350);

          const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
          if (confirmBtn) {
            confirmBtn.click();
            removedCount++;
            removedInPass++;
            consecutiveEmptyPasses = 0;
            sendLog('unfollow', `🚫 Removed follower @${targetHandle} (#${removedCount})`);
            const jitterDelay = calculateJitter(config.pacing || 'balanced');
            await delay(jitterDelay);
            continue;
          }
        }

        // Method 2: Soft-Block fallback
        const blockOption = menuItems.find((el) => (el.textContent || '').toLowerCase().includes('block @') || (el.textContent || '').toLowerCase().includes('block'));
        if (blockOption) {
          blockOption.click();
          await delay(350);

          const confirmBlock = document.querySelector('[data-testid="confirmationSheetConfirm"]');
          if (confirmBlock) {
            confirmBlock.click();
            await delay(400);

            // Unblock immediately to sever relationship without permanent block
            const unblockBtn = cell.querySelector('button[data-testid$="-unblock"]') ||
              Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').trim() === 'Blocked');
            if (unblockBtn) {
              unblockBtn.click();
              await delay(300);
              const confirmUnblock = document.querySelector('[data-testid="confirmationSheetConfirm"]');
              if (confirmUnblock) {
                confirmUnblock.click();
                await delay(300);
              }
            }

            removedCount++;
            removedInPass++;
            consecutiveEmptyPasses = 0;
            sendLog('unfollow', `🚫 Soft-blocked & removed follower @${targetHandle} (#${removedCount})`);
            const jitterDelay = calculateJitter(config.pacing || 'balanced');
            await delay(jitterDelay);
          }
        } else {
          document.body.click();
          await delay(200);
        }
      } catch (err) {
        console.error('[VanishX] Error removing follower:', err);
        document.body.click();
        await delay(200);
      }
    }

    if (!isRunning) break;
    await microScrollDown(450);

    const emptyState = document.querySelector('[data-testid="emptyState"], [data-testid="empty_timeline"]');
    if (emptyState && removedInPass === 0) {
      consecutiveEmptyPasses++;
    }
  }

  if (isRunning && removedCount > 0) {
    sendLog('info', '🔍 Triggering Zero-State Verification reload (Confirming 0 remaining followers)...');
    chrome.storage.local.set({
      vanishx_active_task: {
        status: 'verifying',
        config,
        module: 'followers',
        purgedCount: removedCount,
      }
    }, () => {
      window.location.reload();
    });
    return;
  }

  if (isRunning) {
    sendLog('success', `✔ Completed Followers Purge: ${removedCount} followers removed.`);
  }
}

// ==========================================
// 3. FOLLOWING PURGE ENGINE
// ==========================================
async function runFollowingPurge(config, whitelistUsers, initialTargetCount = 0) {
  sendLog('info', '👥 [Following Engine] Scanning following list...');
  await delay(2000);

  // Broadcast ground truth target count if available
  const currentStats = extractCurrentXProfileStats();
  const groundTruthCount = currentStats.followingCount || initialTargetCount;
  if (groundTruthCount > 0) {
    sendLog('info', `📊 Target Ground Truth: ${groundTruthCount} Following accounts detected.`);
    sendTelemetryWithTarget('info', `Target sync: ${groundTruthCount} accounts`, groundTruthCount);
  }

  const botPreset = config.botFilter?.preset || 'aggressive'; // 'aggressive' = Unfollow All
  let unfollowedCount = 0;
  let consecutiveEmptyPasses = 0;
  const processedHandles = new Set();

  while (isRunning && consecutiveEmptyPasses < 4 && unfollowedCount < 1000) {
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
      sendLog('info', `Scrolling to load more following accounts (${consecutiveEmptyPasses}/4)...`);
      await microScrollDown(450);
      continue;
    }

    let unfollowedInPass = 0;

    for (const cell of userCells) {
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
      if (botPreset === 'non_mutuals_only') {
        const followsYouBadge = cell.querySelector('[data-testid="userFollowIndicator"]');
        const textContent = cell.textContent || '';
        const isMutual = !!followsYouBadge || textContent.toLowerCase().includes('follows you');
        if (isMutual) {
          sendLog('info', `🤝 Preserved mutual @${targetHandle} (Follows you)`);
          continue;
        }
      }

      // STRICT SAFEGUARD: Reject "Follow" buttons, accept only active relationships
      const buttons = Array.from(cell.querySelectorAll('button, div[role="button"]'));
      let unfollowBtn = null;

      for (const btn of buttons) {
        const text = (btn.textContent || '').trim();
        const testId = btn.getAttribute('data-testid') || '';
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();

        if (text === 'Follow' || testId.endsWith('-follow') || (ariaLabel.startsWith('follow @') && !ariaLabel.includes('following'))) {
          continue;
        }

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
        unfollowBtn.click();
        await delay(350);

        const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
        if (confirmBtn) {
          confirmBtn.click();
          unfollowedCount++;
          unfollowedInPass++;
          consecutiveEmptyPasses = 0;

          sendLog('unfollow', `👋 Unfollowed @${targetHandle} (#${unfollowedCount})`);
          
          const jitterDelay = calculateJitter(config.pacing || 'balanced');
          await delay(jitterDelay);
        }
      } catch (err) {
        console.error('[VanishX] Error unfollowing user:', err);
      }
    }

    if (!isRunning) break;

    // Incremental Micro-Scroll
    await microScrollDown(450);

    const emptyState = document.querySelector('[data-testid="emptyState"], [data-testid="empty_timeline"]');
    if (emptyState && unfollowedInPass === 0) {
      consecutiveEmptyPasses++;
    }
  }

  // Zero-State Verification Pass
  if (isRunning && unfollowedCount > 0) {
    sendLog('info', '🔍 Triggering Zero-State Verification reload (Confirming 0 remaining accounts)...');
    chrome.storage.local.set({
      vanishx_active_task: {
        status: 'verifying',
        config,
        module: 'following',
        purgedCount: unfollowedCount,
      }
    }, () => {
      window.location.reload();
    });
    return;
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
  await delay(2000);

  const keywords = (config.whitelist?.keywords || []).map(k => k.toLowerCase().trim());
  let purgedCount = 0;
  let emptyScrolls = 0;

  while (isRunning && emptyScrolls < 4 && purgedCount < 500) {
    while (isPaused && isRunning) {
      await delay(400);
    }
    if (!isRunning) break;

    if (checkRateLimitWarning()) {
      sendLog('warn', '⚠️ 𝕏 Rate Limit Alert detected! Pausing for 45s safety cooldown...');
      await delay(45000);
      window.location.reload();
      return;
    }

    const whitelistedTweetIds = (config.whitelist?.tweets || []).map(id => id.trim()).filter(Boolean);
    const targetUserHandle = (config.handle || '').toLowerCase().replace('@', '').trim();

    // 1. Check for Un-Retweet buttons
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
            sendLog('repost', `🔄 Undid Repost / Retweet (#${purgedCount})`);
            
            const jitterDelay = calculateJitter(config.pacing || 'balanced');
            await delay(jitterDelay);
          } else {
            document.body.click();
            await delay(200);
          }
        } catch (e) {
          console.error(e);
          document.body.click();
          await delay(200);
        }
      }
    }

    if (options.onlyReposts) {
      await microScrollDown(450);
      continue;
    }

    // 2. Check for Caret dropdowns to delete tweets & replies
    const carets = Array.from(document.querySelectorAll('[data-testid="caret"], button[aria-label="More"]'));

    if (carets.length === 0) {
      emptyScrolls++;
      sendLog('info', `Scrolling timeline for next batch of posts (${emptyScrolls}/4)...`);
      await microScrollDown(450);
      continue;
    }

    let deletedInPass = 0;

    for (const caret of carets) {
      if (!isRunning) break;
      while (isPaused && isRunning) {
        await delay(400);
      }

      const tweetArticle = caret.closest('article[data-testid="tweet"]');
      if (tweetArticle) {
        // Pinned Post Protection
        const socialContext = tweetArticle.querySelector('[data-testid="socialContext"]');
        if (socialContext && (socialContext.textContent || '').toLowerCase().includes('pinned')) {
          sendLog('info', '📌 Preserved Pinned Post');
          continue;
        }

        // Whitelisted Tweet ID Protection
        const statusLink = tweetArticle.querySelector('a[href*="/status/"]');
        if (statusLink && whitelistedTweetIds.length > 0) {
          const href = statusLink.getAttribute('href') || '';
          if (whitelistedTweetIds.some(id => href.includes(id))) {
            sendLog('info', '🛡️ Preserved Tweet ID (Whitelisted in Vault)');
            continue;
          }
        }

        // Whitelisted Keyword Protection
        const text = tweetArticle.textContent?.toLowerCase() || '';
        const hasKeyword = keywords.some(k => k && text.includes(k));
        if (hasKeyword) {
          sendLog('info', '🛡️ Preserved tweet containing whitelisted keyword');
          continue;
        }

        // Author Ownership Verification on /with_replies or multi-author feeds
        if (targetUserHandle) {
          const authorLinks = Array.from(tweetArticle.querySelectorAll('a[role="link"][href^="/"]'));
          const isAuthoredByUser = authorLinks.some(l => {
            const h = (l.getAttribute('href') || '').replace('/', '').split('/')[0].split('?')[0].toLowerCase();
            return h === targetUserHandle;
          });
          // If in /with_replies and tweet belongs to a foreign conversation starter, skip clicking foreign caret
          const isRepliesRoute = window.location.pathname.toLowerCase().includes('/with_replies');
          if (isRepliesRoute && !isAuthoredByUser) {
            continue;
          }
        }
      }

      try {
        caret.click();
        await delay(350);

        // Find delete menuitem across all menu items
        const menuItems = Array.from(document.querySelectorAll('[role="menuitem"]'));
        const deleteOption = menuItems.find(item => {
          const txt = (item.textContent || '').toLowerCase();
          return txt.includes('delete') || txt.includes('delete post') || txt.includes('delete reply');
        });

        if (deleteOption) {
          deleteOption.click();
          await delay(350);

          const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
          if (confirmBtn) {
            confirmBtn.click();
            purgedCount++;
            deletedInPass++;
            emptyScrolls = 0;
            sendLog('delete', `🗑️ Purged timeline post/reply (#${purgedCount})`);
            
            const jitterDelay = calculateJitter(config.pacing || 'balanced');
            await delay(jitterDelay);
          } else {
            document.body.click();
            await delay(200);
          }
        } else {
          document.body.click();
          await delay(200);
        }
      } catch (err) {
        console.error('[VanishX] Error deleting item:', err);
        document.body.click();
        await delay(200);
      }
    }

    if (!isRunning) break;

    // Incremental Micro-Scroll
    await microScrollDown(450);

    const emptyState = document.querySelector('[data-testid="emptyState"], [data-testid="empty_timeline"]');
    if (emptyState && deletedInPass === 0) {
      emptyScrolls++;
    }
  }

  // Zero-State Verification Pass
  if (isRunning && purgedCount > 0) {
    sendLog('info', '🔍 Triggering Zero-State Verification reload (Confirming 0 remaining posts)...');
    chrome.storage.local.set({
      vanishx_active_task: {
        status: 'verifying',
        config,
        module: 'timeline',
        purgedCount,
      }
    }, () => {
      window.location.reload();
    });
    return;
  }

  if (isRunning) {
    sendLog('success', `✔ Completed Timeline Purge: ${purgedCount} items removed.`);
  }
}

// ==========================================
// 5. UTILITIES & JITTER PACING
// ==========================================
function calculateJitter(pacing) {
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

function sendTelemetryStatus(status, totalPurged) {
  chrome.runtime.sendMessage({
    type: 'TELEMETRY_LOG_EVENT',
    status,
    totalPurged,
    log: {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type: 'success',
      message: `✔ Zero-state verification complete: 0 items remaining. Total purged: ${totalPurged}`,
    }
  }).catch(() => {});
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
