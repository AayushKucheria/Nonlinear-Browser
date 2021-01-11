
// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// var openedTabId;
// var openedWindowId;
window.extensionId;


chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.tabs.query({'url': chrome.extension.getURL("tabs_api.html")}, function(tabs) {
    if(tabs.length > 0) {
      window.extensionId = tabs[0].id;
      chrome.tabs.update(tabs[0].id, {
      active: true
      });
    chrome.windows.update(tabs[0],windowId, {
      focused: true
      });
    }
    else {
      chrome.tabs.create({url:chrome.extension.getURL("tabs_api.html")});

      chrome.browserAction.setBadgeBackgroundColor({color: '#4688F1'});
      chrome.browserAction.setBadgeText({text: 'ON'});
    }
  });

  // if(!openedTabId) {
  //   chrome.tabs.create({url:chrome.extension.getURL("tabs_api.html")}, function(tab) => {
  //     openedTabId = tab.id;
  //     openedWindowId = tab.windowId;
  //   });
  // }
});

// var credential = firebase.auth.GoogleAuthProvider.credential(null,token);
// firebase.auth().signInWithCredential(credential);

// Works
chrome.runtime.onStartup.addListener(function() {
  chrome.tabs.create({"url": 'tabs_api.html'});
});

document.getElementById("my_sign_in").addEventListener('click', () => {
  console.log("Clicked");
  window.open('authUI.html', 'Sign In', 'width=600,height=800')
})
