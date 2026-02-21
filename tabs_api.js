
function bootStrap() {
  initToast();
  checkLastSession();
  document.title = window.localRoot.title;
  // setup();
}

window.extensionId;

// Receive tab events forwarded from the service worker
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  switch (message.type) {
    case 'tabCreated':
      var tab = message.tab;
      if (tab.url === chrome.runtime.getURL('tabs_api.html')) {
        window.extensionId = tab.id;
      }
      addNewTab(tab);
      break;
    case 'tabRemoved':
      if (data[message.tabId]) {
        data[message.tabId].deleted = true;
        localStore();
        drawTree(window.localRoot);
      }
      break;
    case 'tabUpdated':
      updateTab(message.tabId, message.changeInfo);
      break;
    case 'tabActivated':
      break;
  }
});

document.addEventListener('DOMContentLoaded', function() {
  bootStrap();
});
