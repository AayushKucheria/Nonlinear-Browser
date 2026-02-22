// MV3 Service Worker

chrome.action.onClicked.addListener(function(tab) {
  chrome.tabs.query({url: chrome.runtime.getURL("tabs_api.html")}, function(tabs) {
    if (tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, {active: true});
      chrome.windows.update(tabs[0].windowId, {focused: true});
    } else {
      chrome.tabs.create({url: chrome.runtime.getURL("tabs_api.html")});
      chrome.action.setBadgeBackgroundColor({color: '#4688F1'});
      chrome.action.setBadgeText({text: 'ON'});
    }
  });
});

chrome.runtime.onStartup.addListener(function() {
  chrome.tabs.create({url: chrome.runtime.getURL('tabs_api.html')});
});

// Forward tab events to the UI page
chrome.tabs.onCreated.addListener(function(tab) {
  sendToUI({type: 'tabCreated', tab: tab});
});

chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
  sendToUI({type: 'tabRemoved', tabId: tabId});
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  sendToUI({type: 'tabUpdated', tabId: tabId, changeInfo: changeInfo});
});

function sendToUI(message) {
  chrome.tabs.query({url: chrome.runtime.getURL("tabs_api.html")}, function(tabs) {
    for (var i = 0; i < tabs.length; i++) {
      chrome.tabs.sendMessage(tabs[i].id, message, function() {
        if (chrome.runtime.lastError) {
          // UI tab not ready yet — ignore
        }
      });
    }
  });
}
