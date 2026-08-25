// Background Service Worker for VanishX Companion Extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('[VanishX] Extension installed and active.');
});

// Relay messages between Web Dashboard (bridge.js) and X.com Content Script (content.js)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 1. Health check & version probe
  if (message.type === 'CHECK_EXTENSION_INSTALLED' || message.type === 'PING') {
    sendResponse({ installed: true, version: '2.0.0' });
    return true;
  }

  // 2. Fetch Active 𝕏 Profile / Handle
  if (message.type === 'GET_X_PROFILE') {
    chrome.tabs.query({ url: ['*://*.x.com/*', '*://*.twitter.com/*'] }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        sendResponse({ success: false, handle: '', error: 'No active 𝕏 (Twitter) tab found. Open x.com in your browser first.' });
        return;
      }
      
      // Select the active X tab if available, otherwise the first X tab
      const activeXTab = tabs.find(t => t.active) || tabs[0];
      chrome.tabs.sendMessage(activeXTab.id, { type: 'GET_X_PROFILE' }, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, handle: '', error: chrome.runtime.lastError.message });
        } else {
          sendResponse(response || { success: false, handle: '' });
        }
      });
    });
    return true; // Keep channel open for async response
  }

  // 3. Dispatch / Start Client-Side Purge Loop
  if (message.type === 'START_CLIENT_PURGE' || message.type === 'DISPATCH_PURGE_TASK') {
    chrome.tabs.query({ url: ['*://*.x.com/*', '*://*.twitter.com/*'] }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        sendResponse({ success: false, error: 'No active 𝕏 (Twitter) tab found. Open x.com first.' });
        return;
      }

      const activeXTab = tabs.find(t => t.active) || tabs[0];
      chrome.tabs.sendMessage(activeXTab.id, { type: 'START_CLIENT_PURGE', config: message.config }, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse(response || { success: true, status: 'started' });
        }
      });
    });
    return true;
  }

  // 4. Telemetry Log Event — broadcast from content.js to all web dashboard tabs
  if (message.type === 'TELEMETRY_LOG_EVENT') {
    chrome.tabs.query({}, (allTabs) => {
      for (const tab of allTabs) {
        if (tab.url && (tab.url.includes('localhost') || tab.url.includes('127.0.0.1') || tab.url.includes('/app') || tab.url.includes('/extension'))) {
          chrome.tabs.sendMessage(tab.id, message).catch(() => {});
        }
      }
    });
    sendResponse({ received: true });
    return true;
  }
});
