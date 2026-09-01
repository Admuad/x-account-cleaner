document.addEventListener('DOMContentLoaded', () => {
  const openDashboardBtn = document.getElementById('openDashboardBtn');
  const statusEl = document.getElementById('accountName');
  const statusBadge = document.getElementById('statusBadge');

  // Open web dashboard
  openDashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://vanishx.vercel.app/app' });
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
