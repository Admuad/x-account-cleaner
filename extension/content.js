// Content script running inside X (Twitter) Web Interface

console.log('[X-Cleaner-Extension] Content script loaded on X.com');

// Listen for purge instructions from background worker / dashboard
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_X_PROFILE') {
    const handleMatch = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"] span:last-child');
    const handle = handleMatch ? handleMatch.textContent.replace('@', '').trim() : '';
    sendResponse({ handle, url: window.location.href });
    return true;
  }

  if (request.type === 'START_CLIENT_PURGE') {
    console.log('[X-Cleaner-Extension] Starting purge loop with config:', request.config);
    executePurgeLoop(request.config);
    sendResponse({ status: 'started' });
    return true;
  }
});

async function executePurgeLoop(config) {
  sendLog('info', 'Client-side extension purge engine engaged on active tab.');

  const pacingMs = config.pacing === 'turbo' ? 600 : config.pacing === 'balanced' ? 1200 : 2000;
  let isRunning = true;
  let deletedCount = 0;

  while (isRunning && deletedCount < 100) {
    // Look for Caret menu on visible tweet cells
    const carets = document.querySelectorAll('[data-testid="caret"]');
    if (carets.length === 0) {
      sendLog('info', 'Scrolling timeline to fetch next dynamic batch...');
      window.scrollBy(0, window.innerHeight * 1.5);
      await delay(2000);
      continue;
    }

    const caret = carets[0];
    try {
      caret.click();
      await delay(400);

      // Check for Delete option in dropdown
      const deleteOption = document.querySelector('[data-testid="Dropdown"] [role="menuitem"]');
      if (deleteOption && deleteOption.textContent.toLowerCase().includes('delete')) {
        deleteOption.click();
        await delay(400);

        // Confirm delete modal
        const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
        if (confirmBtn) {
          confirmBtn.click();
          deletedCount++;
          sendLog('delete', `Deleted item #${deletedCount} on active timeline`);
          await delay(pacingMs);
        }
      } else {
        // Close dropdown
        document.body.click();
        await delay(300);
      }
    } catch (err) {
      console.error(err);
    }
  }

  sendLog('success', `✔ Completed pass: ${deletedCount} items purged via companion extension.`);
}

function sendLog(type, message) {
  chrome.runtime.sendMessage({
    type: 'TELEMETRY_LOG_EVENT',
    log: {
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
    }
  }).catch(() => {});
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
