// Content script running inside X (Twitter) Web Interface
// Autonomous Multi-Module Purge Engine (Following, Posts, Replies, Reposts)

console.log('[VanishX Extension] Content script loaded on X.com');

// Check on page load if an active purge task was in progress across navigation
chrome.storage.local.get(['vanishx_active_task'], (result) => {
  if (result?.vanishx_active_task?.status === 'running') {
    console.log('[VanishX Extension] Resuming active purge task from storage:', result.vanishx_active_task);
    executePurgeLoop(result.vanishx_active_task.config);
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
    // Persist active task state so navigation doesn't kill execution
    chrome.storage.local.set({
      vanishx_active_task: {
        status: 'running',
        config: request.config,
        startedAt: Date.now(),
      }
    });

    executePurgeLoop(request.config || {});
    sendResponse({ status: 'started' });
    return true;
  }

  if (request.type === 'STOP_CLIENT_PURGE') {
    chrome.storage.local.remove('vanishx_active_task');
    sendLog('warn', 'Purge execution stopped by user.');
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

// ==========================================
// 2. MAIN PURGE ORCHESTRATOR
// ==========================================
async function executePurgeLoop(config) {
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
  }

  // ----------------------------------------
  // MODULE B: REPOSTS (UN-RETWEET)
  // ----------------------------------------
  if (modules.reposts && !modules.posts && !modules.replies) {
    const targetProfileUrl = `https://x.com/${handle}`;
    if (!window.location.href.toLowerCase().endsWith(`/${handle.toLowerCase()}`)) {
      sendLog('info', `Navigating to Timeline for Reposts: ${targetProfileUrl}`);
      window.location.href = targetProfileUrl;
      return;
    }

    await runTimelinePurge(config, whitelistUsers, { onlyReposts: true });
  }

  // ----------------------------------------
  // MODULE C: POSTS & REPLIES
  // ----------------------------------------
  if (modules.posts || modules.replies) {
    // If date filter is enabled, use X Search query
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
  chrome.storage.local.remove('vanishx_active_task');
  sendLog('success', '✔ VanishX execution completed successfully.');
}

// ==========================================
// 3. FOLLOWING PURGE ENGINE
// ==========================================
async function runFollowingPurge(config, whitelistUsers) {
  sendLog('info', '👥 [Following Engine] Scanning following list...');
  await delay(2500);

  const pacingMs = config.pacing === 'turbo' ? 450 : config.pacing === 'balanced' ? 900 : 1800;
  const botPreset = config.botFilter?.preset || 'aggressive'; // 'aggressive' = Unfollow All
  let unfollowedCount = 0;
  let consecutiveEmptyPasses = 0;
  const processedHandles = new Set();

  while (consecutiveEmptyPasses < 5 && unfollowedCount < 1000) {
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

      // Locate Unfollow button (black/white button with "Following" text)
      const unfollowBtn = cell.querySelector('button[data-testid$="-unfollow"]') ||
        Array.from(cell.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim() === 'Following');

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
          await delay(pacingMs);
        }
      } catch (err) {
        console.error('[VanishX] Error unfollowing user:', err);
      }
    }

    // Scroll down to fetch next dynamic batch
    window.scrollBy(0, window.innerHeight * 1.5);
    await delay(1500);

    // Check for empty state
    const emptyState = document.querySelector('[data-testid="emptyState"], [data-testid="empty_timeline"]');
    if (emptyState && unfollowedInPass === 0) {
      sendLog('info', '✨ Reached end of Following list (Zero accounts remaining).');
      break;
    }
  }

  sendLog('success', `✔ Completed Following Purge: ${unfollowedCount} accounts unfollowed.`);
}

// ==========================================
// 4. TIMELINE PURGE (POSTS, REPLIES, REPOSTS)
// ==========================================
async function runTimelinePurge(config, whitelistUsers, options = { onlyReposts: false }) {
  sendLog('info', '🗑️ [Timeline Engine] Scanning posts and replies...');
  await delay(2500);

  const pacingMs = config.pacing === 'turbo' ? 450 : config.pacing === 'balanced' ? 900 : 1800;
  const keywords = (config.whitelist?.keywords || []).map(k => k.toLowerCase().trim());
  let purgedCount = 0;
  let emptyScrolls = 0;

  while (emptyScrolls < 5 && purgedCount < 500) {
    // 1. Check for Un-Retweet buttons first
    if (config.modules?.reposts || options.onlyReposts) {
      const unretweetBtns = Array.from(document.querySelectorAll('[data-testid="unretweet"]'));
      for (const btn of unretweetBtns) {
        try {
          btn.click();
          await delay(350);
          const confirmUnretweet = document.querySelector('[data-testid="unretweetConfirm"]');
          if (confirmUnretweet) {
            confirmUnretweet.click();
            purgedCount++;
            emptyScrolls = 0;
            sendLog('repost', `Undo Repost / Retweet (#${purgedCount})`);
            await delay(pacingMs);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (options.onlyReposts) {
      window.scrollBy(0, window.innerHeight * 1.5);
      await delay(1500);
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
            await delay(pacingMs);
          }
        } else {
          // Close dropdown if it's someone else's tweet (e.g. on search feed)
          document.body.click();
          await delay(250);
        }
      } catch (err) {
        console.error('[VanishX] Error deleting item:', err);
        document.body.click();
        await delay(250);
      }
    }

    // Scroll down for next batch
    window.scrollBy(0, window.innerHeight * 1.5);
    await delay(1500);

    const emptyState = document.querySelector('[data-testid="emptyState"], [data-testid="empty_timeline"]');
    if (emptyState && deletedInPass === 0) {
      sendLog('info', '✨ Reached end of timeline items.');
      break;
    }
  }

  sendLog('success', `✔ Completed Timeline Purge: ${purgedCount} items removed.`);
}

// ==========================================
// 5. UTILITIES
// ==========================================
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
