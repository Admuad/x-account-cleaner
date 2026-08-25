// Content script running inside X (Twitter) Web Interface

console.log('[VanishX Extension] Content script loaded on X.com');

// Listen for instructions from background service worker
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
    executePurgeLoop(request.config || {});
    sendResponse({ status: 'started' });
    return true;
  }
});

// Robust Multi-Strategy Handle Extraction
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
    if (href && !['home', 'explore', 'notifications', 'messages'].includes(href)) {
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

async function executePurgeLoop(config) {
  sendLog('info', 'Client-side VanishX purge engine engaged on active tab.');

  const pacingMs = config.pacing === 'turbo' ? 600 : config.pacing === 'balanced' ? 1200 : 2200;
  let isRunning = true;
  let deletedCount = 0;
  const maxPurge = 150;

  while (isRunning && deletedCount < maxPurge) {
    // 1. Check for Un-Retweet buttons if reposts module enabled
    if (config.modules?.reposts) {
      const unretweetBtns = document.querySelectorAll('[data-testid="unretweet"]');
      if (unretweetBtns.length > 0) {
        const btn = unretweetBtns[0];
        try {
          btn.click();
          await delay(350);
          const confirmUnretweet = document.querySelector('[data-testid="unretweetConfirm"]');
          if (confirmUnretweet) {
            confirmUnretweet.click();
            deletedCount++;
            sendLog('delete', `Un-reposted item #${deletedCount}`);
            await delay(pacingMs);
            continue;
          }
        } catch (e) {
          console.error(e);
        }
      }
    }

    // 2. Check for Caret dropdowns to delete tweets / replies
    const carets = document.querySelectorAll('[data-testid="caret"]');
    if (carets.length === 0) {
      sendLog('info', 'Scrolling timeline to fetch next batch of items...');
      window.scrollBy(0, window.innerHeight * 1.5);
      await delay(2000);

      // Check if reached end of timeline
      const emptyState = document.querySelector('[data-testid="emptyState"]');
      if (emptyState) {
        sendLog('info', 'Reached end of visible timeline.');
        break;
      }
      continue;
    }

    const caret = carets[0];
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
          deletedCount++;
          sendLog('delete', `Purged timeline item #${deletedCount}`);
          await delay(pacingMs);
        }
      } else {
        // Close dropdown if delete is not available (e.g., somebody else's tweet)
        document.body.click();
        await delay(250);
        // Scroll slightly past this item
        window.scrollBy(0, 300);
      }
    } catch (err) {
      console.error(err);
      document.body.click();
      await delay(300);
    }
  }

  sendLog('success', `✔ Completed pass: ${deletedCount} items purged via companion extension.`);
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
