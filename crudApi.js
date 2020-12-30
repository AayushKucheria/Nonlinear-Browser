
// Load tree from scratch
function loadWindowList() {

  let d3Root = { id: 'Root', title: "Root", children: [], lines: ["Root"] };
  mapping[d3Root.id] = d3Root;
  //await SetupConnection();
  // Get data from chrome api
  chrome.windows.getAll({ populate: true }, function(windowList) {
    for(var i=0; i < windowList.length; i++) {
      for (var j=0; j < windowList[i].tabs.length; j++) {
        let currentTab = windowList[i].tabs[j];
        let tabObj = { id: currentTab.id,
                      title: currentTab.title,
                      lines:  wrapText(currentTab.title),
                      children: [],
                      parentId: currentTab.openerTabId,
                      windowId: windowList[i].id,
                      url: currentTab.url,
                      favIconUrl: currentTab.favIconUrl,
                      x0: innerWidth/2,
                      y0: innerHeight/2
                    };
        mapping[tabObj.id] = tabObj;
      };
    };
    for(i in mapping) {
      let element = mapping[i];
      if(element.id === 'Root') continue;
      let parentId = element.parentId;
      let parent = parentId ? mapping[parentId] : d3Root;
      parent.children.push(element);
    };
    d3Root = d3.hierarchy(d3Root);
    updateMapping(d3Root);
    initializeTree(d3Root)
 });
};

function updateMapping(d3Root) {
  traverse(d3Root, function(d) {
    mapping[d.data.id] = d;
  }, function(d){
    return d.children && d.children.length > 0 ? d.children : null;
  });
}

// Not updating height of ancestors.
// Code to update: https://stackoverflow.com/questions/43140325/add-node-to-d3-tree-v4
function addNewTab(tabObj) {
  tabObj = d3.hierarchy(tabObj);
  mapping[tabObj.data.id] = tabObj;

  let parent;
  if(tabObj.data.parentId === undefined || tabObj.data.pendingUrl === "chrome://newtab/") {
    tabObj.data.parentId = undefined;
    parent = mapping['Root'];
  }
  else
    parent = mapping[tabObj.data.parentId];

  tabObj.depth = parent.depth + 1;
  tabObj.parent = parent;
  tabObj.children = [];

  if(!parent.children) {
    parent.children = [];
    parent.data.children = [];
  }

  parent.children.push(tabObj);
  parent.data.children.push(tabObj.data);
  drawTree(window.currentRoot);
}

function updateTab(tabId, changeInfo) {

  let updatedTab = mapping[tabId];
  var displayChanged = false

  for(var i in changeInfo) {
    if(updatedTab.data.hasOwnProperty(i)) {
      updatedTab.data[i] = changeInfo[i];
      if(i === 'title' || i === 'favIconUrl')
        displayChanged = true
      if(i === 'title') {
        updatedTab.data['lines'] = wrapText(changeInfo[i]);
      }
    }
  }

  if(displayChanged) {
    drawTree(window.currentRoot);
  }
}

function removeTab(tabId) {

  let removedTab = mapping[tabId];
  var parent = removedTab.parent;

  if(removedTab.children && removedTab.children.length > 0) {
    removedTab.children.forEach(child => {
      child.parent = parent;
      child.data.parentId = parent.data.id;

      child.depth -= 1;

      parent.children.push(child);
      parent.data.children.push(child);
    })
  };

  parent.children = parent.children.filter(d => d != removedTab);
  parent.data.children = parent.data.children.filter(d => d != removedTab);
  mapping.delete(tabId);

  drawTree(window.currentRoot);
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
