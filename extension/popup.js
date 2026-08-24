document.addEventListener('DOMContentLoaded', () => {
  const openDashboardBtn = document.getElementById('openDashboardBtn');
  
  openDashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000' });
  });

  // Query active tab to display handle if on x.com
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0 && (tabs[0].url?.includes('x.com') || tabs[0].url?.includes('twitter.com'))) {
      document.getElementById('accountName').textContent = 'Connected: Active 𝕏 Tab';
    }
  });
});
