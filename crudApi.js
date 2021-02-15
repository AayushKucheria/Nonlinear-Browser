let idMapping = [];
window.localRoot = {"id": "Root", "title": "Current Session", "read":false, "deleted":false, "toggle": false, "lines": ["Current Session"], "children": [],  "x0": 0, "y0": 0};
var last_sesh;
var fetch;
var date = new Date();
window.data = {};
let isCurrent = true;

function checkLastSession() {

  var isRefreshed = true;
  var previousTime = window.sessionStorage.getItem('time');
  var currentTime = date.getTime();
  if(!previousTime || (previousTime && (currentTime - previousTime) > 3600000)) // if the time since the extension was loaded exceeds an hour
  {
    isRefreshed = false; // dont refresh
  }
  var current_tree;
  // Fnon.Dialogue.Init({ closeButton: true })
  lastSession = JSON.parse(window.localStorage.getItem('user'));
  // lastSession = lastSession.children;
  if(lastSession) {
    if(!isRefreshed) {//not Refreshed
      // console.log("Saved session: ", lastSession);

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
        // console.log("Not refreshed and don't restore previous session.")
        loadWindowList(true);
      });
    }
    else { // Refreshed. Restore previous tree without current Session
      // console.log("Refreshed. Only restore previous session")

      for(let [id, tabObj] of Object.entries(lastSession)) {
        if(!data[id]) {
          tabObj.children = []; // Objects get children when converted to localRoot, doing it before will fuck stuff up.
          data[id] = tabObj;
        }
      }
            //;return tab.children && tab.children.length > 0 ? tab.children : null;}
      // console.log("Data after refresh: ", data);
      loadWindowList(false);
    }
  }
  else {
    // console.log('No session stored. Creating new');
    // No session stored. Creating new.
    loadWindowList(true);
  }
}

function dataToLocalRoot() {
  // console.log("Data = ", data);
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

function localRootToData() {
  traverse(window.localRoot.children[localRoot.children.length - 1],
  function(d) {
    data[d.id] = d;
  },
  function(d) {
    return d.children
  });
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
            tabInData.toggle = currentTab.toggle;
            tabInData.deleted = currentTab.deleted;
            tabInData.read = currentTab.read;
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
                                    "toggle": false,
                                    "deleted": false,
                                    "pendingUrl":currentTab.pendingUrl || '',
                                    "read" : false,
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

function addNewTab(tab) {
  // Check if this url is already in one of our tabs in data
  // console.log("Checking new tab ", tab.url, " with id ", tab.id);
  // for(let [id, tabObj] of Object.entries(data)) {
  //   // console.log("Checking existing tab ", tabObj.url, " with id ", tabObj.id);
  //   if(tabObj.url === tab.url || tabObj.pendingUrl === tab.url) {
  //     console.log("Updating ", tab.title, " s id to ", tab.id);
  //     tabObj.id = tab.id;
  //     console.log("New id: ", tabObj.id);
  //     console.log("Whole root: ", window.localRoot);
  //     return;
  //   }
  // };
  let tabObj = {  "id": tab.id,
                  "title": tab.title || '',
                  "parentId": tab.openerTabId || '',
                  "children": [],
                  "lines":  wrapText((tab.title || tab.url || tab.pendingUrl || '')),
                  "windowId": tab.windowId,
                  "url": tab.url || '',
                  "pendingUrl":tab.pendingUrl || '',
                  "toggle":false,
                  "deleted": false,
                  "read": false,
                  "x0": 0,
                  "y0": 0,
                  "favIconUrl": tab.favIconUrl || ''
                };
  data[tabObj.id] = tabObj;

  if(tabObj.parentId === '' || tabObj.pendingUrl === "chrome://newtab/") {
    tabObj.parentId = '';
    localRoot.children.push(tabObj);
    updateTree(localRoot)
  }
  else {
    const parentElement = data[tabObj.parentId];
    parentElement.children.push(tabObj);
    // console.log("New tab is a child: ", tabObj);
    updateTree(localRoot);
  }
  localStore();
}

function updateTab(tabId, changeInfo) {
  if(!isCurrent) return;
  let updatedTab = data[tabId];

  // console.log("change info", changeInfo)
  var displayChanged = false
  for(var i in changeInfo) {
    if(updatedTab && updatedTab.hasOwnProperty(i)) {
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
  // console.log("Data before removal: ", data[tabId]);
  let removedTab = data[tabId]
  delete data[tabId];
  // console.log("Data before removal: ", removedTab);

  // Remove children from data
  let i=0;
  traverse(removedTab,
    function(tab) { (i === 0)? ++i : delete data[tab.id];},
    function(tab) { return tab.children && tab.children.length > 0 ? tab.children : null;}
  );

  let parent;
  let parentId = removedTab.parentId;
  if(parentId === '') {
    parent = localRoot;
  }
  else {
    parent = data[parentId];
  }
  // TODO does removing the object from data+localRoot cause the problem?
  parent.children.splice(parent.children.indexOf(removedTab), 1)

  updateTree(localRoot);
  localStore();
}

function localStore() {
  // console.log("Storing data = ", data);
  // let temp = {"id": "Root", "title": "Current Session", "read":false, "lines": ["Current Session"], "children": [],  "x0": 0, "y0": 0};
  //
  // temp.children = data;
  window.localStorage.setItem('user', JSON.stringify(window.data)); //adds to localStorage
}
