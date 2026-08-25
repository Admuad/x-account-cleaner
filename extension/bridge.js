// bridge.js — Injected into localhost web app to enable extension communication.
// Fires VANISHX_EXTENSION_READY repeatedly so the web app catches it regardless of load timing.

console.log('[VanishX Bridge] Initialized.');

let announced = false;

function announceReady() {
  window.postMessage({ type: 'VANISHX_EXTENSION_READY', version: '2.0.0' }, '*');
  announced = true;
}

// Fire immediately, then once more after a short delay to handle race conditions
// where the web app registers its listener after document_idle fires.
announceReady();
setTimeout(announceReady, 800);
setTimeout(announceReady, 2000);

// Listen for messages from the web application
window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || !event.data.type) return;

  // Web app requesting extension presence check
  if (event.data.type === 'VANISHX_PING') {
    announceReady();
    return;
  }

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
});

// Relay telemetry from background → web app
chrome.runtime.onMessage.addListener((request) => {
  if (request.type === 'TELEMETRY_LOG_EVENT') {
    window.postMessage({
      type: 'VANISHX_TELEMETRY_LOG',
      log: request.log,
    }, '*');
  }
});
