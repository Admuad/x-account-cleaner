// bridge.js — Injected into localhost web app to enable extension communication.
// Fires VANISHX_EXTENSION_READY repeatedly so the web app catches it regardless of load timing.

console.log('[VanishX Bridge] Initialized.');

let announced = false;

function announceReady() {
  window.postMessage({ type: 'VANISHX_EXTENSION_READY', version: '2.0.0' }, '*');
  announced = true;
}

// Fire immediately, then once more after a short delay to handle race conditions
announceReady();
setTimeout(announceReady, 800);
setTimeout(announceReady, 2000);

// Listen for messages from the web application
window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || !event.data.type) return;

  // 1. Web app pinging extension presence
  if (event.data.type === 'VANISHX_PING') {
    announceReady();
    return;
  }

  // 2. Query active X profile
  if (event.data.type === 'VANISHX_GET_X_PROFILE') {
    chrome.runtime.sendMessage({ type: 'GET_X_PROFILE' }, (response) => {
      if (chrome.runtime.lastError) {
        window.postMessage({ type: 'VANISHX_X_PROFILE_RESPONSE', handle: '', url: '', error: chrome.runtime.lastError.message }, '*');
        return;
      }
      window.postMessage({
        type: 'VANISHX_X_PROFILE_RESPONSE',
        handle: response?.handle || '',
        url: response?.url || '',
      }, '*');
    });
  }

  // 3. Start purge
  if (event.data.type === 'VANISHX_START_PURGE') {
    chrome.runtime.sendMessage({
      type: 'START_CLIENT_PURGE',
      config: event.data.config,
    }, (response) => {
      if (chrome.runtime.lastError) return;
      window.postMessage({
        type: 'VANISHX_PURGE_STARTED',
        status: response?.status || 'started',
      }, '*');
    });
  }

  // 4. Pause purge
  if (event.data.type === 'VANISHX_PAUSE_PURGE') {
    chrome.runtime.sendMessage({ type: 'PAUSE_CLIENT_PURGE' });
  }

  // 5. Resume purge
  if (event.data.type === 'VANISHX_RESUME_PURGE') {
    chrome.runtime.sendMessage({ type: 'RESUME_CLIENT_PURGE' });
  }

  // 6. Stop / Abort purge
  if (event.data.type === 'VANISHX_STOP_PURGE') {
    chrome.runtime.sendMessage({ type: 'STOP_CLIENT_PURGE' });
  }
});

// Relay telemetry & events from background worker → web app
chrome.runtime.onMessage.addListener((request) => {
  if (request.type === 'TELEMETRY_LOG_EVENT') {
    window.postMessage({
      type: 'VANISHX_TELEMETRY_LOG',
      log: request.log,
      totalTargeted: request.totalTargeted,
    }, '*');
  }
});
