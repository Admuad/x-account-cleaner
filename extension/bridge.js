// bridge.js - Injected into localhost:3000 / web app to enable seamless direct extension communication

console.log('[VanishX Bridge] Bridge content script initialized.');

// Mark that extension bridge is active on the page
window.postMessage({ type: 'VANISHX_EXTENSION_READY', version: '2.0.0' }, '*');

// Listen for messages from web application
window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || !event.data.type) return;

  if (event.data.type === 'VANISHX_GET_X_PROFILE') {
    chrome.runtime.sendMessage({ type: 'GET_X_PROFILE' }, (response) => {
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
      window.postMessage({
        type: 'VANISHX_PURGE_STARTED',
        status: response?.status || 'started',
      }, '*');
    });
  }
});

// Relay runtime messages back to web application
chrome.runtime.onMessage.addListener((request) => {
  if (request.type === 'TELEMETRY_LOG_EVENT') {
    window.postMessage({
      type: 'VANISHX_TELEMETRY_LOG',
      log: request.log,
    }, '*');
  }
});
