// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// https://typeofnan.dev/an-easy-way-to-build-a-tree-with-object-references/

let data = []; // tree of tabs as objects
let root = [];
let idMapping = [];

class Tab {
  constructor(id, parentId, children, windowId) {
    this.id = id;
    this.parentId = parentId;
    this.children = children;
    this.windowId = windowId;
  }
}
function bootStrap() {
  loadWindowList();
}
function isInt(i) {
  return (typeof i == "number") && !(i % 1) && !isNaN(i);
}

function printRoot() {
  root.forEach((element) => console.log(element.id, element.openerTabId, element.children));

}
// Load tree from scratch
function loadWindowList() {
  console.log("Reloading")
  data = [];
  // Get windows + tabs data from chrome api
  chrome.windows.getAll({ populate: true }, function(windowList) {
    // For each tab in each window
    // Add the tab's id, parent's id, and set it's children as empty (for now)
    for(var i=0; i < windowList.length; i++) {
      for (var j=0; j < windowList[i].tabs.length; j++) {
        data.push(new Tab(windowList[i].tabs[j].id, windowList[i].tabs[j].openerTabId, [], windowList[i].id));
        // data.push(windowList[i].tabs[j])
      };
    };
    // console.log(data[0]);

    /* Making an ID-to-Index Map (for ease of access)
      Syntax: [tab_id: index_in_data]
      Example: [5648: 0, 5710: 4, 5736: 2, ..., 5788: 6]
    */
    idMapping = data.reduce((acc, elem, index) => {
      acc[elem.id] = index;
      return acc;
    }, {});

    // console.log(idMapping[0])
    // For each tab, if it's a root (i.e. it doesn't have a parent),
    // Then add it to the list of roots
    // Else, Find its parent and insert the tab in the parent's children list.
    root = [];
    data.forEach(element => {
     if(element.parentId === undefined) {
       root.push(element);
     }
     else {
      // Use our mapping to locate the parent element in our data array
      // And add this tab as it's
        const parentElement = data[idMapping[element.parentId]];
        parentElement.children.push(element);
      };
    });

    // Print roots of each tree
    printRoot();
 });
};

function addNewTab(tab) {

  tabObj = new Tab(tab.id, tab.parentId, [], tab.windowId);
  data.push(tabObj);

  idMapping[tabObj.id] = data.indexOf(tabObj);

  if(tabObj.parentId === undefined) {
    root.push(tabObj)
  }
  else {
    const parentElement = data[idMapping[tabObj.parentId]];
    parentElement.children.push(tabObj);
  };
  console.log("Added new tab")
  printRoot();
};

// TODO: For later
// function refreshTab(tabId) {
//   chrome.tabs.get(tabId, function(tab) {
//   });
// }
// chrome.tabs.onUpdated.addListener(function(tabId, props) {
//   refreshTab(tabId);
// });

function removeTab(tabId) {

  // Removing tab from data and idMapping
  indexInData = idMapping[tabId];
  removedTab = data.splice(indexInData, 1)
  delete idMapping[tabId];

  // Removing from parent's children listS
  parentIndexInData = idMapping[removedTab[0].parentId]
  data[parentIndexInData].children = data[parentIndexInData].children.filter(child => child.id == removedTab.parentId);

  console.log("Removed 1 tab")
  printRoot();
}

chrome.tabs.onCreated.addListener(function(tab) {
  addNewTab(tab);
});
chrome.tabs.onRemoved.addListener(function(tabId) {
    removeTab(tabId);
});
// chrome.tabs.onRemoved.addListener(function)
document.addEventListener('DOMContentLoaded', function() {
  document.querySelector('button').addEventListener('click', loadWindowList);

  bootStrap();
});
