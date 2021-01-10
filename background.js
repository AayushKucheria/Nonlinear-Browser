
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
})

// ******** firebase
var firebaseConfig = {
  apiKey: "AIzaSyBcXi7lHnFZPpiQJEwIvs9u_gp38zst1mQ",
  databaseURL: "https://nonlinear-browser-default-rtdb.firebaseio.com",
  authDomain: "nonlinear-browser.firebaseapp.com",
  projectId: "nonlinear-browser",
  storageBucket: "nonlinear-browser.appspot.com",
  messagingSenderId: "693229853662",
  appId: "1:693229853662:web:cc17084511b58095841b4f",
  measurementId: "G-76DQZXB7F5"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
// firebase.analytics();

// const appDb =  app.database().ref();

/**
 * initApp handles setting up the Firebase context and registering
 * callbacks for the auth status.
 *
 * The core initialization is in firebase.App - this is the glue class
 * which stores configuration. We provide an app name here to allow
 * distinguishing multiple app instances.
 *
 * This method also registers a listener with firebase.auth().onAuthStateChanged.
 * This listener is called when the user is signed in or out, and that
 * is where we update the UI.
 *
 * When signed in, we also authenticate to the Firebase Realtime Database.
 */
// function initApp() {
//   // Listen for auth state changes.
//   firebase.auth().onAuthStateChanged(function(user) {
//     console.log('User state change detected from the Background script of the Chrome Extension:', user);
//   });
// }
//
// window.onload = function() {
//   initApp();
// };
