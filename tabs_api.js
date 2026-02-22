
function bootStrap() {
  initToast();
  checkLastSession();
  document.title = window.localRoot.title;
}

// Receive tab events forwarded from the service worker
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  switch (message.type) {
    case 'tabCreated':
      addNewTab(message.tab);
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
  }
});

document.addEventListener('DOMContentLoaded', function() {
  bootStrap();
});
