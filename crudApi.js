let idMapping = [];
window.localRoot = {"id": "Root", "title": "Current Session", "lines": ["Current Session"], "children": [],  "x0": 0, "y0": 0};
var last_sesh;
var fetch;
var date = new Date();
window.data = {};

function checkLastSession() {
  var isRefreshed = true;
  var previousTime = window.sessionStorage.getItem('time');
  var currentTime = date.getTime();
  if(!previousTime || (previousTime && (currentTime - previousTime) > 3600000)) {
    isRefreshed = false;
  }

  var current_url = window.location.search;
  const urlParams = new URLSearchParams(current_url);
  const tree_id = urlParams.get('tree');
  const user_id = urlParams.get('user');
  var current_tree;

  // If loaded tree
  // TODO sync with data
  if(tree_id && user_id) {
    fetchTree(user_id, tree_id)
  }
  else {
  // Fnon.Dialogue.Init({ closeButton: true })
    lastSession = JSON.parse(window.localStorage.getItem('user'));

    if(lastSession) {
      if(!isRefreshed) {
        Fnon.Dialogue.Primary("Your last browsing session was autosaved. Would you like to restore it?", 'Restore last session?', 'Yes', 'No',
        () => { // Merge with current session
          for(let [id, tabObj] of Object.entries(lastSession)) {
            if(!data[id]) {
              tabObj.children = []; // Objects get children when converted to localRoot, doing it before will fuck stuff up.
              data[id] = tabObj;
            }
          }
          loadWindowList(true); // Merge
        },
        () => { // Don't restore
          console.log("Not refreshed and don't restore previous session.")
          loadWindowList(true);
        });
      }
      else { // Refreshed. Restore previous tree without current Session
        console.log("Refreshed. Only restore previous session")

        for(let [id, tabObj] of Object.entries(lastSession)) {
          if(!data[id]) {
            tabObj.children = []; // Objects get children when converted to localRoot, doing it before will fuck stuff up.
            data[id] = tabObj;
          }
        }
              //;return tab.children && tab.children.length > 0 ? tab.children : null;}
        console.log("Data after refresh: ", data);
        loadWindowList(false);
      }
    }
    else {
      console.log('No session stored. Creating new');
      // No session stored. Creating new.
      loadWindowList(true);
    }
  }
}

function dataToLocalRoot() {
  // For each tab, if it's a root (i.e. it doesn't have a parent),
  // Then add it to the list of roots
  // Else, Find its parent and insert the tab in the parent's children list.
  // localRoot.children = []
  for(let [id, tabObj] of Object.entries(data)) {
    if(!tabObj.parentId || tabObj.parentId === '') {
      window.localRoot.children.push(tabObj);
    }
    else {
      const parentObj = data[tabObj.parentId];
      parentObj.children.push(tabObj);
    };
  };

  localStore();
  initializeTree(window.localRoot)
}
// Load tree from scratch
function loadWindowList(addCurrentSession) {

  // Get windows + tabs data from chrome api
  if(addCurrentSession) {
    chrome.windows.getAll({ populate: true }, function(windowList) {

      for(var i=0; i < windowList.length; i++) {
        for (var j=0; j < windowList[i].tabs.length; j++) {

          let currentTab = windowList[i].tabs[j];
          if(data[currentTab.id]) { // Exists in data, update relevant fields
            let tabInData = data[currentTab.id];
            tabInData.title = currentTab.title || '';
            tabInData.lines = wrapText((currentTab.title || currentTab.url || currentTab.pendingUrl || ''));
            tabInData.windowId = windowList[i].id;
            tabInData.url = currentTab.url || '';
            tabInData.pendingUrl = currentTab.pendingUrl || '';
            tabInData.favIconUrl = currentTab.favIconUrl || '';
            tabInData.parentId = currentTab.openedTabId ? currentTab.openerTabId : data[currentTab.id].parentId
          }
          else {
            data[currentTab.id] = { "id": currentTab.id,
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
            };
          }
        };
      };
      dataToLocalRoot();
    });
  }
  else { // Don't add currentSession
    dataToLocalRoot();
  }
};

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
                  "read": false,
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
  localStore();
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
  // Not changing localStore here, too many update requests
}

function removeSubtree(tabId) {
  console.log("Data before removal: ", data)
  let indexInData = idMapping[tabId];
  let removedTab = data.splice(indexInData, 1)
  removedTab= removedTab[0];
  console.log("Removing ", removedTab, " subtree from Data at index ", indexInData);
  // Remove children from data
  let i=0;
  // TODO: This is an infinite loop somehow. Specifically data.splice
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
  localStore();
}

function localStore() {
  console.log(data);
  window.localStorage.setItem('user', JSON.stringify(window.data)); //adds to localStorage
}
