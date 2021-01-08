window.onbeforeunload = function() {
  return "Would you really like to close your browser?";
}

window.onunload = function() {
  chrome.browserAction.setBadgeText({text: ''});
  return "Would you really like to close your browser?";
}
