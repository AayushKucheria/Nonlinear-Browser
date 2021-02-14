
function bootStrap() {
  initToast();
  checkLastSession();
  document.title = window.localRoot.title;
  // setup();
}
chrome.tabs.onCreated.addListener(function(tab) {
  if(tab.url === chrome.extension.getURL('tabs_api.html')) {
    window.extensionId = tab.id;

  }
  addNewTab(tab);
});
chrome.tabs.onRemoved.addListener(function(tabId) {
  // TODO BUG not working
  if(tabId === window.extensionId) {
    chrome.browserAction.setBadgeText({text: ''});
  }
  if(data[tabId]) {
    data[tabId].deleted = true;
    localStore();
    drawTree(window.localRoot);
  }
});
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {
  updateTab(tabId, changeInfo)
})
// chrome.windows.onBoundsChanged.addListener(function(wId) {
//   // update(window.currentRoot);
// });
// let currentTabId;
chrome.tabs.onActivated.addListener(function(tabId) {
  // if(tabId == extensionTabID) // Reached extension, highlight previous tab
    // highlightTab(currentTabId) // Previous value
    // currentTabId = tabId; // Update to current value
})
document.addEventListener('DOMContentLoaded', function() {
  bootStrap();

});
// $(document).ready(bootStrap());
// document.querySelector('#log_out').addEventListener('click', () => {
//   chrome.runtime.sendMessage({ message: 'log_out'}, function(response) {
//     if(response.message === 'success') {
//       // Do something.
//     }
//   })
// })
