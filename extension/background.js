// Background Service Worker for VanishX Companion Extension
// Manages multi-tab querying, routing, heartbeat checks, and state coordination

chrome.runtime.onInstalled.addListener(() => {
  console.log('[VanishX] Extension service worker installed and active.');
});

// Select the most appropriate X.com tab (focused/active tab first, or most recently accessed)
function findTargetXTab(callback) {
  chrome.tabs.query({ url: ['*://*.x.com/*', '*://*.twitter.com/*'] }, (tabs) => {
    if (!tabs || tabs.length === 0) {
      callback(null);
      return;
    }

    // 1. Prefer currently active tab in current window
    const activeTab = tabs.find(t => t.active);
    if (activeTab) {
      callback(activeTab);
      return;
    }

    // 2. Otherwise sort by lastAccessed (most recently active tab)
    const sorted = tabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
    callback(sorted[0]);
  });
}

// Relay messages between Web Dashboard (bridge.js) and X.com Content Script (content.js)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 1. Health check & version probe
  if (message.type === 'CHECK_EXTENSION_INSTALLED' || message.type === 'PING') {
    sendResponse({ installed: true, version: '2.0.0' });
    return true;
  }

  // 2. Fetch Active 𝕏 Profile / Handle
  if (message.type === 'GET_X_PROFILE') {
    findTargetXTab((targetTab) => {
      if (!targetTab) {
        sendResponse({ success: false, handle: '', error: 'No active 𝕏 tab found. Open x.com first.' });
        return;
      }

      chrome.tabs.sendMessage(targetTab.id, { type: 'GET_X_PROFILE' }, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, handle: '', error: chrome.runtime.lastError.message });
        } else {
          sendResponse(response || { success: false, handle: '' });
        }
      });
    });
    return true;
  }

  // 3. Start Purge Task
  if (message.type === 'START_CLIENT_PURGE' || message.type === 'DISPATCH_PURGE_TASK') {
    findTargetXTab((targetTab) => {
      if (!targetTab) {
        sendResponse({ success: false, error: 'No active 𝕏 tab found. Open x.com first.' });
        return;
      }

      chrome.tabs.sendMessage(targetTab.id, { type: 'START_CLIENT_PURGE', config: message.config }, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse(response || { success: true, status: 'started' });
        }
      });
    });
    return true;
  }

  // 4. Pause Purge Task
  if (message.type === 'PAUSE_CLIENT_PURGE') {
    chrome.tabs.query({ url: ['*://*.x.com/*', '*://*.twitter.com/*'] }, (tabs) => {
      for (const t of tabs) {
        chrome.tabs.sendMessage(t.id, { type: 'PAUSE_CLIENT_PURGE' }).catch(() => {});
      }
    });
    sendResponse({ received: true });
    return true;
  }

  // 5. Resume Purge Task (Instructs target X tab to reload and resume with clean DOM)
  if (message.type === 'RESUME_CLIENT_PURGE') {
    findTargetXTab((targetTab) => {
      if (targetTab) {
        chrome.tabs.sendMessage(targetTab.id, {
          type: 'RESUME_CLIENT_PURGE',
          reload: true,
          config: message.config,
        }).catch(() => {});
      }
    });
    sendResponse({ received: true });
    return true;
  }

  // 6. Stop / Abort Purge Task (Wipes storage and stops all running loops)
  if (message.type === 'STOP_CLIENT_PURGE') {
    chrome.storage.local.remove('vanishx_active_task');
    chrome.tabs.query({ url: ['*://*.x.com/*', '*://*.twitter.com/*'] }, (tabs) => {
      for (const t of tabs) {
        chrome.tabs.sendMessage(t.id, { type: 'STOP_CLIENT_PURGE' }).catch(() => {});
      }
    });
    sendResponse({ received: true });
    return true;
  }

  // 7. Telemetry Log Event — broadcast from content.js directly to web dashboard tabs
  if (message.type === 'TELEMETRY_LOG_EVENT') {
    chrome.tabs.query({ url: ['http://localhost:*/*', 'http://127.0.0.1:*/*'] }, (dashboardTabs) => {
      if (dashboardTabs && dashboardTabs.length > 0) {
        for (const tab of dashboardTabs) {
          chrome.tabs.sendMessage(tab.id, message).catch(() => {});
        }
      }
    });
    sendResponse({ received: true });
    return true;
  }
});
