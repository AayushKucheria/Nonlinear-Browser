// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// https://typeofnan.dev/an-easy-way-to-build-a-tree-with-object-references/

// (function() {
//   var d3 = document.createElement('script'); d3.type = 'text/javascript'; d3.async = true;
//   d3.src = 'https://d3js.org/d3.v6.min.js';
//   var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(d3, s);
// })();


let data = []; // tree of tabs as objects
window.localRoot = {"id": "Root", "title": "Root", "children": [], "x0": 0, "y0": 0};
// window.localRoot.id = "Root";
// window.localRoot.children = [];
let idMapping = [];
// export {localRoot};


function bootStrap() {
  loadWindowList();
  // printTree();

}

function printRoot() {
  window.localRoot.children.forEach((element) => console.log(element.id, element.openerTabId, element.children));

}
// Load tree from scratch
function loadWindowList() {
  //await SetupConnection();
  console.log("Reloading")
  data = [];
  // Get windows + tabs data from chrome api
  chrome.windows.getAll({ populate: true }, function(windowList) {
    // For each tab in each window
    // Add the tab's id, parent's id, and set it's children as empty (for now)
    for(var i=0; i < windowList.length; i++) {
      for (var j=0; j < windowList[i].tabs.length; j++) {
        data.push({ "id": windowList[i].tabs[j].id,
                    "title": windowList[i].tabs[j].title,
                    "parentId": windowList[i].tabs[j].openerTabId,
                    "children": [],
                    "windowId": windowList[i].id,
                    "url": windowList[i].tabs[j].url,
                    "x0": 0,
                    "y0": 0});
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
    localRoot.children = []
    data.forEach(element => {
     if(element.parentId === undefined) {
       localRoot.children.push(element);
     }
     else {
      // Use our mapping to locate the parent element in our data array
      // And add this tab as it's
        const parentElement = data[idMapping[element.parentId]];
        parentElement.children.push(element);
      };
    });
    initializeTree(localRoot)
 });
};
//await SetupConnection();
function addNewTab(tab) {

  let tabObj = {  "id": tab.id,
                  "title": tab.title,
                  "parentId": tab.openerTabId,
                  "children": [],
                  "windowId": tab.windowId,
                  "url": tab.url,
                  "x0": 0,
                  "y0": 0};
  console.log("New Tab Added = ", tabObj);
  data.push(tabObj);

  // insertinDB(tabObj);

  idMapping[tabObj.id] = data.indexOf(tabObj);

  if(tabObj.parentId === undefined) {
    localRoot.children.push(tabObj);
    update(localRoot)
  }
  else {
    const parentElement = data[idMapping[tabObj.parentId]];
    parentElement.children.push(tabObj);
    update(parentElement)
  };
}

  // async function SetupConnection()
  // {
  // console.log("iuaufsdifuhadsif");
  // const {MongoClient} = require('mongodb');
  // const uri = "mongodb+srv://sparrsh:rYbk0Zsh3jh4m7ES@tabdata.ttdvm.mongodb.net/test";
  // const window.client= new MongoClient(uri,{ useNewUrlParser: true, useUnifiedTopology: true });
  //
  // try {
  //        // Connect to the MongoDB cluster
  //        await client.connect();
  //        console.log("wtf");
  //       } catch (e) {
  //        console.error(e);
  //      } finally {
  //        await client.close();
  //    }
  //  }

   // async function insertinDB(client,tabObj)
   // {
   //   db = await client.db("TabData");
   //
   //   individual_element= {ID: tabObj.id,ParentID: tabObj.parentId, children: tabObj.children,WindowID: tabObj.windowId};
   //   if(tabObj.parentId===undefined)
   //  {
   //   await db.collection("tab_data_test").insertOne(individual_element);
   //   console.log("hey");
   //  }
   //  else
   //  {
   //    parentid_newtab= tabObj.parentId;
   //    primary_key_parent =parentid_newtab._id;
   //    console.log("primary_key_parent");
   //    prev_children=parentid_newtab.children;
   //    new_children=prev_children.append(tabObj);
   //    await db.collection("tab_data_test").updateOne(
   //      {_id : primary_key_parent},
   //      { $set: {children: new_children}}
   //    )
   //  }
  //console.log({"Inserted":1})
  //SetupConnection(client).catch(console.error);
// }

  //insert(client);
//   printRoot();
// };

// TODO: For later
// function refreshTab(tabId) {
//   chrome.tabs.get(tabId, function(tab) {
//   });
// }
// chrome.tabs.onUpdated.addListener(function(tabId, props) {
//   refreshTab(tabId);
// });

function removeTab(tabId) {
  console.log("initial root:", localRoot.children)
  console.log("Tab ID: ", tabId)
  // TODO: If the tab has children, add option to merge with grandparent or become separate
  // Removing tab from data and idMapping
  let indexInData = idMapping[tabId];
  let removedTab = data.splice(indexInData, 1)
  delete idMapping[tabId];
  // Removing from parent's children listS

  // The tab doesn't have children, and is a root
  if(removedTab[0].parentId === undefined) {
    console.log("Is a root. Adding children (if present) as root")

    // If it has children, add them as roots
    if(removedTab[0].children.length > 0) {
      console.log("")
      removedtab[0].children.forEach(child => {
        child.parentId = undefined;
        localRoot.children.append(child);
      })
    }
    // Remove itself as a root
    localRoot.children.splice(localRoot.children.indexOf(removedTab), 1)
    update(localRoot);
  }
  else { // It has a parent
    console.log("Has a parent. Adding children (if present) to parent and removing it from parent's children")
    let parentIndexInData = idMapping[removedTab[0].parentId];
    let parent = data[parentIndexInData];

    // Set it's children as its parent's children
    if(removedTab[0].children.length > 0) {
      console.log("Has Children")
      removedTab[0].children.forEach(child => {
        child.parentId = parent.id;
        parent.children.append(child);
      });
    }
    // Remove the tab from it's parent's children
    parent.children = data[parentIndexInData].children.filter(child => child.id == removedTab[0].parentId);
    update(parent);
  }

  console.log("Removed 1 tab")
}

chrome.tabs.onCreated.addListener(function(tab) {
  addNewTab(tab);
});
chrome.tabs.onRemoved.addListener(function(tabId) {
    removeTab(tabId);
});

chrome.windows.onBoundsChanged.addListener(function(wId) {
  update(localRoot);
});
// chrome.tabs.onRemoved.addListener(function)
// document.getElementById('myButton').addEventListener('click', start());
document.addEventListener('DOMContentLoaded', function() {
  // document.getElementById('myButton').addEventListener('click', x());

  bootStrap();
});
