// Background Service Worker for X Purge Companion Extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('[X-Cleaner-Extension] Extension installed and active.');
});

// Relay messages between Web Dashboard and X.com Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHECK_EXTENSION_INSTALLED') {
    sendResponse({ installed: true, version: '2.0.0' });
    return true;
  }

  if (message.type === 'DISPATCH_PURGE_TASK') {
    // Find active X.com tab or query tabs
    chrome.tabs.query({ url: ['https://x.com/*', 'https://twitter.com/*'] }, (tabs) => {
      if (tabs.length === 0) {
        sendResponse({ success: false, error: 'No active X (Twitter) tab found. Please open x.com first.' });
      } else {
        const targetTab = tabs[0];
        chrome.tabs.sendMessage(targetTab.id, message, (response) => {
          sendResponse(response || { success: true, status: 'dispatched' });
        });
      }
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'TELEMETRY_LOG_EVENT') {
    // Broadcast to web dashboard if listening
    chrome.tabs.query({ url: ['http://localhost:3000/*', 'http://localhost:*/*'] }, (dashboardTabs) => {
      for (const dTab of dashboardTabs) {
        chrome.tabs.sendMessage(dTab.id, message);
      }
    });
    sendResponse({ received: true });
    return true;
  }
});
