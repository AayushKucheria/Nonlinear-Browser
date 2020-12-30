let data = []; // tree of tabs as objects
let idMapping = [];
let hidden_tabs=[];
window.localRoot = {"id": "Root", "title": "Root", "lines": ["Root"], "temp": [], "children": [], "_children": [], "__children":[], "x0": 0, "y0": 0};
// window.localRoot = {"id": "Root", "title": "Root", "lines": ["Root"],"ancestors":[], "children": [], "_children": [], "x0": 0, "y0": 0};



function hide(source,flag) {
// function hide(source,flag)
// {
//   d3.selectAll('path.link').attr('display',function(d)
//     {
//         if ((d.source == source)||(d.target == source))
//         {
//           return 'none';
//         }
//     });
//
//   d3.selectAll('g.node').attr('display', function(d)
//  }

  // d3.selectAll('path.link').attr('display',function(d)
  //   {
  //       if ((d.source == hidden_tabs[i])||(d.target == hidden_tabs[i]))
  //       {
  //         return 'none';
  //       }
  //   }
  // }

    //console.log("hiding the hidden tabs array elements now  ")
  //     d3.selectAll('g.node').attr('display',function (d)
  //     {
  //       for(i=0;i<hidden_tabs.length;i++)
  //       {
  //           if(d == hidden_tabs[i])
  //           {
  //             return 'none';
  //           }
  //         }});
  //       console.log("hiding the tab nodes now");
  //       d3.selectAll('path.link').attr('display',function(d)
  //         {
  //           for(i=0;i<hidden_tabs.length;i++)
  //           {
  //             if ((d.source == hidden_tabs[i])||(d.target == hidden_tabs[i]))
  //             {
  //               return 'none';
  //             }
  //           };

  //
  //     console.log("hiding the tab links now");
  // });
  // for(i=0;i<window.currentRoot.children.length;i++)
  // {
  //   if(source.parentId==window.currentRoot.children.length[i].id)
  //   {
  //       window.currentRoot.children.__children=source;
  //       source=null;
  //   }
  // }

  //console.log("the parent is",source.parent);

  // for(i=0;i<hidden_tabs.length;i++)
  // {
  parent=source.parent;
  parent.temp=[];

  // console.log("parent",parent);
  if(flag==0)
  {
    hidden_children=parent.children.filter(a => a == source);
    //console.log("the one that should be hidden",hidden_children);
    parent.temp.push(hidden_children); //select the tabs that need to be hidden and push them in a separate array so that it can be accessed again
    //console.log("hidden tab",parent.temp);
    parent.children = parent.children.filter(a => a != source); //adding only the remaining children to the parent of the node
    //console.log("parent.temp",parent.temp[0]);
  //  console.log("current children in the tree",parent.children);
  }
  else
  {
      if(parent.temp[0])
      {
        parent.children.push(parent.temp[0]);
        console.log("parent.temp",parent.temp[0]);
      }
  }
  drawTree(window.currentRoot); // use drawTree(source)
}
  // parent=source.parent;
  // parent.temp=[];
  //
  // // console.log("parent",parent);
  // if(flag==0)
  // {
  //   hidden_children=parent.children.filter(a => a == source);
  //   //console.log("the one that should be hidden",hidden_children);
  //   parent.temp.push(hidden_children); //select the tabs that need to be hidden and push them in a separate array so that it can be accessed again
  //   //console.log("hidden tab",parent.temp);
  //   parent.children = parent.children.filter(a => a != source); //adding only the remaining children to the parent of the node
  //   //console.log("parent.temp",parent.temp[0]);
  // //  console.log("current children in the tree",parent.children);
  // }
//   else
//   {
//       if(parent.temp[0])
//       {
//         parent.children.push(parent.temp[0]);
//         console.log("parent.temp",parent.temp[0]);
//       }
//   }
//   drawTree(window.currentRoot); // use drawTree(source)
// }

// function list_hide(tab)
// {
//   hidden_tabs.push(tab);
//   hide_toggle(tab);
//   //console.log("added to hidden list",tab);
// }

function hide_toggle(tab)
{
  nodeEnter.select()
}

// Load tree from scratch
function loadWindowList() {
  //await SetupConnection();
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
                    "lines":  wrapText(currentTab.title),
                    "parentId": currentTab.openerTabId,
                    "temp":[],
                    "children": [],
                    "_children": [],
                    "__children": [],
                    "windowId": windowList[i].id,
                    "url": currentTab.url,
                    "favIconUrl": currentTab.favIconUrl,
                    "x0": innerWidth/2,
                    "y0": innerHeight/2
                  });
      };
    };
    updateIdMapping()

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

/* Making an ID-to-Index Map (for ease of access)
  Syntax: [tab_id: index_in_data]
  Example: [5648: 0, 5710: 4, 5736: 2, ..., 5788: 6]
*/
function updateIdMapping() {
  idMapping = data.reduce((acc, elem, index) => {
    acc[elem.id] = index;
    return acc;
  }, {});
}

//await SetupConnection();
function addNewTab(tab) {

  let tabObj = {  "id": tab.id,
                  // "shortened_title":getShortenedTitle(tab),
                  "title": tab.title,
                  "parentId": tab.openerTabId,
                  "children": [],
                  "_children": [],
                  "lines":  wrapText(tab.title),
                  "windowId": tab.windowId,
                  "url": tab.url,
                  "pendingUrl":tab.pendingUrl,
                  "x0": 0,
                  "y0": 0,
                  "favIconUrl": tab.favIconUrl};

  data.push(tabObj);
  // insertinDB(tabObj);
  idMapping[tabObj.id] = data.indexOf(tabObj);

  if(tabObj.parentId === undefined || tabObj.pendingUrl === "chrome://newtab/") {
    tabObj.parentId = undefined;
    localRoot.children.push(tabObj);
    updateTree(localRoot)
  }
  else {
    const parentElement = data[idMapping[tabObj.parentId]];
    parentElement.children.push(tabObj);
    updateTree(localRoot);
  }
}

function updateTab(tabId, changeInfo) {

  let indexInData = idMapping[tabId];
  let updatedTab = data[indexInData];
  var displayChanged = false
  for(var i in changeInfo) {
    if(updatedTab.hasOwnProperty(i)) {
      updatedTab[i] = changeInfo[i];
      if(i === 'title' || i === 'favIconUrl')
        displayChanged = true
      if(i === 'title') {
        updatedTab['lines'] = wrapText(changeInfo[i]);
      }
    }
  }

  if(displayChanged) {
    updateTree(localRoot);
  }
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
  let removedTab = data.splice(indexInData, 1)
  removedTab= removedTab[0];
  updateIdMapping();
  let parent;
  let parentId = removedTab.parentId;

  if(parentId === undefined) {
    parentId=undefined;
    parent = localRoot;
  }
  else {
    parent = data[idMapping[parentId]];
  }

  if(removedTab.children.length > 0) {
    removedTab.children.forEach(child => {
      child.parentId = parentId;
      parent.children.push(child);
    })
  }
  parent.children.splice(parent.children.indexOf(removedTab), 1)
  updateTree(localRoot);
}
