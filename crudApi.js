window.localRoot = {"id": "Root", "title": "Current Session", "read":false, "deleted":false, "toggle": false, "lines": ["Current Session"], "children": [],  "x0": 0, "y0": 0};
var date = new Date();
window.data = {};

function checkLastSession() {

  var isRefreshed = true;
  var previousTime = AppStorage.session.getTimestamp();
  var currentTime = date.getTime();
  if(!previousTime || (previousTime && (currentTime - previousTime) > 3600000)) // if the time since the extension was loaded exceeds an hour
  {
    isRefreshed = false; // dont refresh
  }
  lastSession = AppStorage.session.load();
  if(lastSession) {
    if(!isRefreshed) {//not Refreshed
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
        loadWindowList(true);
      });
    }
    else { // Refreshed. Restore previous tree without current Session
      for(let [id, tabObj] of Object.entries(lastSession)) {
        if(!data[id]) {
          tabObj.children = []; // Objects get children when converted to localRoot, doing it before will fuck stuff up.
          data[id] = tabObj;
        }
      }
      loadWindowList(false);
    }
  }
  else {
    // No session stored. Creating new.
    loadWindowList(true);
  }
}

function dataToLocalRoot() {
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
  window.localRoot.children.forEach(function(child) {
    traverse(child,
      function(d) { data[d.id] = d; },
      function(d) { return d.children; }
    );
  });
}

// Load tree from scratch
function loadWindowList(addCurrentSession) {
  // Get windows + tabs data from chrome api
  if(addCurrentSession) {
    BrowserApi.getAllWindows(function(windowList) {

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
            tabInData.parentId = currentTab.openerTabId ? currentTab.openerTabId : data[currentTab.id].parentId;
            tabInData.active = currentTab.active || false;
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
                                    "active": currentTab.active || false,
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
                  "favIconUrl": tab.favIconUrl || '',
                  "audible": false,
                  "muted": false,
                  "suspended": false
                };
  data[tabObj.id] = tabObj;

  if(tabObj.parentId === '' || tabObj.pendingUrl === "chrome://newtab/") {
    tabObj.parentId = '';
    window.localRoot.children.push(tabObj);
    updateTree(window.localRoot)
  }
  else {
    const parentElement = data[tabObj.parentId];
    parentElement.children.push(tabObj);
    updateTree(window.localRoot);
  }
  localStore();
}

function updateTab(tabId, changeInfo) {
  let updatedTab = data[tabId];
  if (!updatedTab) return;

  var displayChanged = false
  for(var i in changeInfo) {
    if(updatedTab && updatedTab.hasOwnProperty(i)) {
      updatedTab[i] = changeInfo[i];
      if(i === 'title' || i === 'favIconUrl' || i === 'audible' || i === 'muted')
        displayChanged = true
      if(i === 'title') {
        updatedTab['lines'] = wrapText(changeInfo[i]);
      }
    }
  }

  if(displayChanged) {
    updateTree(window.localRoot);
  }
  // Not changing localStore here, too many update requests
}

function removeSubtree(tabId) {
  let removedTab = data[tabId]
  delete data[tabId];

  // Remove children from data
  let i=0;
  traverse(removedTab,
    function(tab) { (i === 0)? ++i : delete data[tab.id];},
    function(tab) { return tab.children && tab.children.length > 0 ? tab.children : null;}
  );

  let parent;
  let parentId = removedTab.parentId;
  if(parentId === '') {
    parent = window.localRoot;
  }
  else {
    parent = data[parentId];
  }
  parent.children.splice(parent.children.indexOf(removedTab), 1)

  updateTree(window.localRoot);
  localStore();
}

function localStore() {
  AppStorage.session.save(window.data); //adds to localStorage
}

function moveTab(draggedId, targetId, position) {
  var dragged = window.data[draggedId];
  var target  = window.data[targetId];
  if (!dragged || !target) return;

  // Guard: don't drop onto own descendant
  var isDescendant = false;
  traverse(dragged, function(t) { if (t.id === targetId) isDescendant = true; }, function(t) { return t.children; });
  if (isDescendant) return;

  // Remove from current parent
  var draggedParent = dragged.parentId ? window.data[dragged.parentId] : window.localRoot;
  if (!draggedParent) return;
  var idx = draggedParent.children.indexOf(dragged);
  if (idx !== -1) draggedParent.children.splice(idx, 1);

  if (position === 'into') {
    dragged.parentId = String(targetId);
    target.children.push(dragged);
  } else {
    var targetParent = target.parentId ? window.data[target.parentId] : window.localRoot;
    if (!targetParent) return;
    var ti = targetParent.children.indexOf(target);
    var insertAt = position === 'before' ? ti : ti + 1;
    targetParent.children.splice(Math.max(0, insertAt), 0, dragged);
    dragged.parentId = target.parentId || '';
  }
  // If the target is in a different window, update windowId on dragged tab and its subtree.
  var targetTab = data[targetId];
  if (targetTab && dragged.windowId !== targetTab.windowId) {
    updateTabWindowId(dragged, targetTab.windowId);
  }
  localStore();
}
window.moveTab = moveTab;

// Recursively update windowId on a tab and all its descendants in window.data.
function updateTabWindowId(tab, newWindowId) {
  tab.windowId = newWindowId;
  if (data[tab.id]) data[tab.id].windowId = newWindowId;
  if (tab.children) tab.children.forEach(function(c) { updateTabWindowId(c, newWindowId); });
}

// Move a tab (and its subtree) to the end of a different window's top-level children.
function moveTabToWindow(draggedId, targetWindowId) {
  if (!data[draggedId]) return;
  var dragged = data[draggedId];
  if (dragged.windowId === targetWindowId) return;

  // Remove from current parent
  var srcParent = data[dragged.parentId] || localRoot;
  var idx = srcParent.children.indexOf(dragged);
  if (idx === -1) { srcParent = localRoot; idx = localRoot.children.indexOf(dragged); }
  if (idx !== -1) srcParent.children.splice(idx, 1);

  // Reset parentId (now a top-level tab in the target window)
  dragged.parentId = '';

  // Update windowId recursively
  updateTabWindowId(dragged, targetWindowId);

  // Insert after the last existing tab that belongs to targetWindowId
  var lastIdx = -1;
  for (var i = 0; i < localRoot.children.length; i++) {
    if (localRoot.children[i].windowId === targetWindowId) lastIdx = i;
  }
  if (lastIdx === -1) localRoot.children.push(dragged);
  else localRoot.children.splice(lastIdx + 1, 0, dragged);

  localStore();
}
window.moveTabToWindow = moveTabToWindow;

function deleteWindowTabs(windowId) {
  // Close live tabs in Chrome
  var toClose = [];
  traverse(window.localRoot,
    function (t) { if (t.id !== 'Root' && t.windowId === windowId && !t.deleted) toClose.push(t.id); },
    function (t) { return t.children; }
  );
  toClose.forEach(function (id) { BrowserApi.removeTab(id); });

  // Remove from localRoot.children (top-level tabs for this window + their subtrees)
  window.localRoot.children = window.localRoot.children.filter(function (t) {
    return t.windowId !== windowId;
  });

  // Clean up data map
  Object.keys(window.data).forEach(function (id) {
    if (window.data[id].windowId === windowId) delete window.data[id];
  });

  localStore();
}
window.deleteWindowTabs = deleteWindowTabs;
