window.onbeforeunload = function() {
  var date = new Date();
  window.sessionStorage.setItem('time', date.getTime());
  return "Would you really like to close your browser?";
}

window.onunload = function() {
  if (window._tabListeners) {
    chrome.tabs.onCreated.removeListener(window._tabListeners.onCreated);
    chrome.tabs.onRemoved.removeListener(window._tabListeners.onRemoved);
    chrome.tabs.onUpdated.removeListener(window._tabListeners.onUpdated);
    chrome.tabs.onActivated.removeListener(window._tabListeners.onActivated);
  }
  chrome.action.setBadgeText({text: ''});
}
