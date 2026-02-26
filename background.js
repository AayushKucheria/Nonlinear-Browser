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

function sendToUI(message) {
  chrome.runtime.sendMessage(message, function () {
    if (chrome.runtime.lastError) {
      // Side panel is not open — ignore.
    }
  });
}
