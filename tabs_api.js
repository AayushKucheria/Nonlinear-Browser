
function bootStrap() {
  loadWindowList();
}

chrome.tabs.onCreated.addListener(function(tab) {
  addNewTab(tab);
});
chrome.tabs.onRemoved.addListener(function(tabId) {
    removeTab(tabId);
});
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  updateTab(tabId, changeInfo)
})
chrome.windows.onBoundsChanged.addListener(function(wId) {
  update(window.currentRoot);
});
// let currentTabId;
chrome.tabs.onActivated.addListener(function(tabId) {
  // if(tabId == extensionTabID) // Reached extension, highlight previous tab
    // highlightTab(currentTabId) // Previous value
    // currentTabId = tabId; // Update to current value
})
document.addEventListener('DOMContentLoaded', function() {
  bootStrap();
});
