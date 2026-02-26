// MV3 Service Worker

// Open the side panel when the user clicks the toolbar icon.
// This replaces the old chrome.action.onClicked → chrome.tabs.create pattern.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Forward tab events to the side panel via runtime messaging.
// The side panel listens with chrome.runtime.onMessage.
chrome.tabs.onCreated.addListener(function (tab) {
  sendToUI({ type: 'tabCreated', tab: tab });
});

chrome.tabs.onRemoved.addListener(function (tabId) {
  sendToUI({ type: 'tabRemoved', tabId: tabId });
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {
  sendToUI({ type: 'tabUpdated', tabId: tabId, changeInfo: changeInfo });
});

chrome.tabs.onActivated.addListener(function (activeInfo) {
  sendToUI({ type: 'tabActivated', tabId: activeInfo.tabId, windowId: activeInfo.windowId });
});

chrome.windows.onFocusChanged.addListener(function (windowId) {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  chrome.tabs.query({ active: true, windowId: windowId }, function (tabs) {
    if (tabs[0]) {
      sendToUI({ type: 'tabActivated', tabId: tabs[0].id, windowId: windowId });
    }
  });
});

chrome.runtime.onMessage.addListener(function (message) {
  if (message && message.type === 'closePanel') {
    chrome.sidePanel.setOptions({ enabled: false });
    setTimeout(function () {
      chrome.sidePanel.setOptions({ enabled: true, path: 'sidepanel.html' });
    }, 100);
  }
});

function sendToUI(message) {
  chrome.runtime.sendMessage(message, function () {
    if (chrome.runtime.lastError) {
      // Side panel is not open — ignore.
    }
  });
}
