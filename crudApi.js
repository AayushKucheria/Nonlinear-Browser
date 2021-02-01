let data = []; // tree of tabs as objects
let idMapping = [];
window.localRoot = {"id": "Root", "title": "Current Session", "lines": ["Start"], "children": [], "x0": 0, "y0": 0};
var last_sesh;
// var initial=true; //when the extension loads
var fetch;
// set value as true

// Load tree from scratch
async function loadWindowList() {


  var current_url = window.location.search;
  const urlParams = new URLSearchParams(current_url);
  // console.log("urlParams", urlParams)
  const tree_id = urlParams.get('tree');
  const user_id = urlParams.get('user');
  var current_tree;
  // console.log("tree_id", tree_id)
  // console.log("user_id", user_id)

    // console.log("user", user)
  if((tree_id)&&(user_id))
  {
    // user = awaifetchUser(user_id)
    console.log("user", user)
    fetchTree(user_id, tree_id)

  }
  //fetch = Boolean(window.localStorage.getItem('initial'));
  last_sesh = JSON.parse(window.localStorage.getItem('user'));
  if((last_sesh)&&(!initial))
  {
    console.log("checking for last sessions' json", last_sesh)
    initializeTree(last_sesh)
    initial=false;
    window.localStorage.setItem('initial', initial.toString());
  }
  else {
    data = [];
    // Get windows + tabs data from chrome api
    chrome.windows.getAll({ populate: true }, function(windowList) {
      // For each tab in each window
      // Add the tab's id, parent's id, and set it's children as empty (for now)
      for(var i=0; i < windowList.length; i++) {
        for (var j=0; j < windowList[i].tabs.length; j++) {

          let currentTab = windowList[i].tabs[j];
          data.push({ "id": currentTab.id,
                      "title": currentTab.title || '',
                      "lines":  wrapText((currentTab.title || currentTab.url || currentTab.pendingUrl || '')),
                      "parentId": currentTab.openerTabId || '',
                      "children": [],
                      "windowId": windowList[i].id,
                      "url": currentTab.url || '',
                      "pendingUrl":currentTab.pendingUrl || '',
                      "favIconUrl": currentTab.favIconUrl || '',
                      "x0": innerWidth/2,
                      "y0": innerHeight/2
                    });
        };
      };
      updateIdMapping()

      // i=true;

      // For each tab, if it's a root (i.e. it doesn't have a parent),
      // Then add it to the list of roots
      // Else, Find its parent and insert the tab in the parent's children list.
      localRoot.children = []
      data.forEach(element => {
       if(element.parentId === '') {
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

}
  //await SetupConnection();


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
                  "title": tab.title || '',
                  "parentId": tab.openerTabId || '',
                  "children": [],
                  "lines":  wrapText((tab.title || tab.url || tab.pendingUrl || '')),
                  "windowId": tab.windowId,
                  "url": tab.url || '',
                  "pendingUrl":tab.pendingUrl || '',
                  "x0": 0,
                  "y0": 0,
                  "favIconUrl": tab.favIconUrl || ''
                };

  data.push(tabObj);
  // insertinDB(tabObj);
  idMapping[tabObj.id] = data.indexOf(tabObj);

  if(tabObj.parentId === '' || tabObj.pendingUrl === "chrome://newtab/") {
    // console.log("New tab is a root: ", tabObj);
    tabObj.parentId = '';
    localRoot.children.push(tabObj);
    updateTree(localRoot)
  }
  else {
    const parentElement = data[idMapping[tabObj.parentId]];
    parentElement.children.push(tabObj);
    // console.log("New tab is a child: ", tabObj);
    updateTree(localRoot);
  }
  localStore(localRoot);
}

function updateTab(tabId, changeInfo) {
  let indexInData = idMapping[tabId];
  let updatedTab = data[indexInData];
  // console.log("Updating tab ", tabId, " with index ", indexInData, " and obj ", updatedTab);
  var displayChanged = false
  for(var i in changeInfo) {
    if(updatedTab.hasOwnProperty(i)) {
      updatedTab[i] = changeInfo[i];
      if(i === 'title' || i === 'favIconUrl')
        displayChanged = true
      if(i === 'title') {
        updatedTab['lines'] = wrapText(changeInfo[i]);

        // TODO Doesn't work. If a tab is redirected to a site that
        // doesn't have a favIconUrl, nonlinear displays the previous favIcon.
        // chrome.tabs.get(tabId, function(tab) {
        //   updatedTab['favIconUrl'] = tab.favIconUrl;
        // });
      }
    }
  }

  if(displayChanged) {
    updateTree(localRoot);
  }
}

function removeSubtree(tabId) {
  console.log("Data before removal: ", data)
  let indexInData = idMapping[tabId];
  let removedTab = data.splice(indexInData, 1)
  removedTab= removedTab[0];
  console.log("Removing ", removedTab, " subtree from Data at index ", indexInData);
  // Remove children from data
  let i=0;
  traverse(removedTab,
    function(tab) { (i === 0)? ++i : data.splice(idMapping[tab.id], 1);},
    function(tab) { return tab.children && tab.children.length > 0 ? tab.children : null;}
  );
  console.log("Data after removal of subtree: ", data);
  updateIdMapping();
  let parent;
  let parentId = removedTab.parentId;
  if(parentId === '') {
    parent = localRoot;
  }
  else {
    parent = data[idMapping[parentId]];
  }
  // TODO does removing the object from data+localRoot cause the problem?
  console.log("LocalRoot before removal: ", localRoot)
  parent.children.splice(parent.children.indexOf(removedTab), 1)
  console.log("LocalRoot after removal of subtree: ", localRoot);

  updateTree(localRoot);
}

function localStore(source)
{
  window.localStorage.setItem('user', JSON.stringify(source)); //adds to localStorage
}
