window.onbeforeunload = function() {
  var date = new Date();
  window.sessionStorage.setItem('time', date.getTime());
  return "Would you really like to close your browser?";
}

window.onunload = function() {
  chrome.action.setBadgeText({text: ''});
}
