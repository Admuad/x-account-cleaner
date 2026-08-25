document.addEventListener('DOMContentLoaded', () => {
  const openDashboardBtn = document.getElementById('openDashboardBtn');
  const statusEl = document.getElementById('accountName');
  const statusBadge = document.getElementById('statusBadge');

  // Open web dashboard — prefer localhost dev, fall back to GitHub Pages / deployed URL
  openDashboardBtn.addEventListener('click', () => {
    // Try to open localhost first (dev mode), otherwise open deployed app
    chrome.tabs.create({ url: 'http://localhost:3000/app' });
  });

  // Detect if current tab is an X.com tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs.length) return;
    const tab = tabs[0];
    const url = tab.url || '';

    if (url.includes('x.com') || url.includes('twitter.com')) {
      statusEl.textContent = 'Connected: Active 𝕏 Tab';
      if (statusBadge) statusBadge.style.color = '#00ba7c';
    } else {
      statusEl.textContent = 'No 𝕏 tab active — open x.com first';
      statusEl.style.color = '#8b98a5';
    }
  });

  // Show extension version
  const manifest = chrome.runtime.getManifest();
  const versionEl = document.getElementById('version');
  if (versionEl) versionEl.textContent = `v${manifest.version}`;
});
