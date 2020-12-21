// (function() {
//   var d3 = document.createElement('script'); d3.type = 'text/javascript'; d3.async = true;
//   d3.src = 'https://d3js.org/d3.v6.min.js';
//   var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(d3, s);
// })();

let data = []; // tree of tabs as objects
window.localRoot = {"id": "Root", "title": "Root", "children": [], "x0": 0, "y0": 0};
let idMapping = [];

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
        let currentTab = windowList[i].tabs[j];
        data.push({ "id": currentTab.id,
                    "title": currentTab.title,
                    "parentId": currentTab.openerTabId,
                    "children": [],
                    "windowId": windowList[i].id,
                    "url": currentTab.url,
                    "favIconUrl": currentTab.favIconUrl,
                    "x0": 0,
                    "y0": 0
                  });
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

function updateIdMapping() {
  idMapping = data.reduce((acc, elem, index) => {
    acc[elem.id] = index;
    return acc;
  }, {});
}
//await SetupConnection();
function addNewTab(tab) {
  // while(tab.status != "complete") {
  //   console.log(tab)
  //   setTimeout(function() {
  //     chrome.tabs.get(tab.id, function(newTab) {
  //       tab = newTab;
  //     })
  //   }, 3000);

  // };
  let tabObj = {  "id": tab.id,
                  "title": tab.title,
                  "parentId": tab.openerTabId,
                  "children": [],
                  "windowId": tab.windowId,
                  "url": tab.url,
                  "pendingUrl":tab.pendingUrl,
                  "x0": 0,
                  "y0": 0,
                  "favIconUrl": tab.favIconUrl};

  // console.log("New Tab Added = ", tabObj);
  data.push(tabObj);

  // insertinDB(tabObj);

  idMapping[tabObj.id] = data.indexOf(tabObj);

  if (tabObj.pendingUrl ==="chrome://newtab/") {
    tabObj.parentId = undefined;
    // console.log("New tab is empty. Removed parent");
  }

  if(tabObj.parentId === undefined) {
    localRoot.children.push(tabObj);
    // console.log("No parent. Added tab as root: ", tabObj);
    // console.log("The whole tree: ", localRoot);
    update(localRoot)
  }
  else {
    const parentElement = data[idMapping[tabObj.parentId]];
    parentElement.children.push(tabObj);
    // console.log("Parent found. Adding as child");
    update(parentElement)
  }
}
/**
TODO: Chrome listener gets called multiple times, and thus this
method gets called multiple times.
Coz of that the tree is recreated 2-3times within a second.
This makes it look like the tree is lagging, but it's just being created 3x
in a very short time. Solve this.

Tried: Timeout - doesn't help.
*/
function updateTab(tabId, changeInfo) {

  let indexInData = idMapping[tabId];
  updatedTab = data[indexInData];
  var changed = false

  for(var i in changeInfo) {
    if(updatedTab.hasOwnProperty(i)) {
      // console.log("Updating ", tabId, " with ", i);
      updatedTab[i] = changeInfo[i];
      changed = true
    }
  }
  if(changed)
    update(localRoot)
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


function removeTab(tabId) {

  let indexInData = idMapping[tabId];
  let removedTab = data.splice(indexInData, 1)[0]
  updateIdMapping();
  let parent;
  let parentId;

  if(removedTab.parentId === undefined) {
    parentId = undefined;
    parent = localRoot;
  } else {
    parentId = removedTab.parentId
    parent = data[idMapping[parentId]];
  }

  if(removedTab.children.length > 0) {
    removedTab.children.forEach(child => {
      child.parentId = parentId;
      parent.children.push(child);
    })
  }
  parent.children.splice(parent.children.indexOf(removedTab), 1)
  update(localRoot);
}


// function removeTab(tabId) {
//   data2= localRoot.children;
//
//   console.log("initial data:", data);
//   console.log("Tab ID: ", tabId)
//   // TODO: If the tab has children, add option to merge with grandparent or become separate
//   // Removing tab from data and idMapping
//   let indexInData = idMapping[tabId];
//   console.log("current index:", indexInData);
//
//   index_in_data2= data2.findIndex(a => a === data[indexInData]);
//   let removedTab = data2.splice(index_in_data2, 1);
//
//
//   console.log("removing tab", removedTab);
//   console.log("mapping", idMapping[tabId]);
//   delete idMapping[tabId];
//   // Removing from parent's children listS
//
//   // The tab doesn't have children, and is a root
//   if(removedTab[0].parentId === undefined) {
//     console.log("Is a root. Adding children (if present) as root")
//
//     // If it has children, add them as roots
//     if(removedTab[0].children.length > 0) {
//       console.log("")
//       removedtab[0].children.forEach(child => {
//         child.parentId = undefined;
//         localRoot.children.append(child);
//       })
//     }
//     // Remove itself as a root
//     console.log("removed tab being checked for", removedTab);
//     x= localRoot.children.findIndex((a) => a === removedTab);
//     console.log(" the index being checked for", x);
//
//     var y = data2.splice(x,1);
//     console.log("the deleted tab should be ", y);
//     //var y = data2.splice(x, 1);
//
//     update(localRoot);
//   }
//   else { // It has a parent
//     console.log("Has a parent. Adding children (if present) to parent and removing it from parent's children");
//     let parentIndexInData = idMapping[removedTab[0].parentId];
//     let parent = data[parentIndexInData];
//
//     // Set it's children as its parent's children
//     if(removedTab[0].children.length > 0) {
//       console.log("Has Children")
//       removedTab[0].children.forEach(child => {
//         child.parentId = parent.id;
//         parent.children.append(child);
//       });
//     }
//     // Remove the tab from it's parent's children
//     parent.children = data[parentIndexInData].children.filter(child => child.id != removedTab[0].parentId);
//     update(parent);
//   }

//   console.log("Removed 1 tab")
//   console.log(data);
// }

chrome.tabs.onCreated.addListener(function(tab) {
  addNewTab(tab);
});
chrome.tabs.onRemoved.addListener(function(tabId) {
    removeTab(tabId);
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  // console.log("", tab, " with id ", tabId, " updated with info ", changeInfo)
  updateTab(tabId, changeInfo)
})

chrome.windows.onBoundsChanged.addListener(function(wId) {
  update(localRoot);
});
// chrome.tabs.onRemoved.addListener(function)
// document.getElementById('myButton').addEventListener('click', start());
document.addEventListener('DOMContentLoaded', function() {
  // document.getElementById('myButton').addEventListener('click', x());

  bootStrap();
});
