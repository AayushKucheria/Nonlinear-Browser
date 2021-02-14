
// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// var openedTabId;
// var openedWindowId;
window.extensionId;
var initial=true;

window.onbeforeunload = null;


chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.tabs.query({'url': chrome.extension.getURL("tabs_api.html")}, function(tabs) {
    if(tabs.length > 0) {
      window.extensionId = tabs[0].id;
      chrome.tabs.update(tabs[0].id, {
      active: true
      });
    chrome.windows.update(tabs[0].windowId, {
      focused: true
      });
    }
    else {
      chrome.tabs.create({url:chrome.extension.getURL("tabs_api.html")});

      chrome.browserAction.setBadgeBackgroundColor({color: '#4688F1'});
      chrome.browserAction.setBadgeText({text: 'ON'});
    }
  });
});



// Works
chrome.runtime.onStartup.addListener(function() {
  chrome.tabs.create({"url": 'tabs_api.html'});
});

window.addEventListener('beforeunload', function(e) {
  // console.log("e", e)
  var date = new Date(); //current Date object
  window.sessionStorage.setItem('time', date.getTime());

})
