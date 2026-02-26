// sidepanel.js — bootstraps the Chrome Side Panel.
//
// Depends on (loaded before this file):
//   helperFunctions.js  — traverse, wrapText
//   storage.js          — AppStorage
//   browserApi.js       — BrowserApi
//   crudApi.js          — window.localRoot, window.data, addNewTab, updateTab, removeSubtree
//   renderer.js         — buildSidebarTree, countOpen

// ── Wire crudApi callbacks into renderAll ─────────────────────────────────────
// crudApi.js calls initializeTree / updateTree when data changes.
// We map both to renderAll so the sidebar re-renders on every data mutation.
window.initializeTree = function () { renderAll(); };
window.updateTree     = function () { renderAll(); };
window.drawTree       = function () { renderAll(); };

// ── Sidebar state ─────────────────────────────────────────────────────────────
var sidebarState = {
  collapsedTabs: new Set(),
  showClosed:    false,
  query:         '',

  onToggle: function (id) {
    if (sidebarState.collapsedTabs.has(id)) {
      sidebarState.collapsedTabs.delete(id);
    } else {
      sidebarState.collapsedTabs.add(id);
    }
    renderAll();
  },

  onClose: function (id) {
    // Request browser to close the tab; the service worker will send a
    // tabRemoved message which marks it deleted and triggers renderAll.
    BrowserApi.removeTab(id);
  },

  onActivate: function (id) {
    var tab = window.data && window.data[id];
    if (!tab) return;
    BrowserApi.focusTab(id, tab.windowId);
    // Optimistically update active indicator
    traverse(window.localRoot,
      function (t) { t.active = false; },
      function (t) { return t.children; }
    );
    tab.active = true;
    renderAll();
  },
};

// Persisted window-name overrides: { [windowId]: 'Custom name' }
var windowNames = {};

// ── renderAll ─────────────────────────────────────────────────────────────────
function renderAll() {
  var treeEl = document.getElementById('tree');
  if (!treeEl || !window.localRoot) return;
  buildSidebarTree(treeEl, window.localRoot, windowNames, sidebarState);
  updateStats();
}

function updateStats() {
  var statsEl = document.getElementById('stats');
  if (!statsEl || !window.localRoot) return;
  var open  = countOpen(window.localRoot.children || []);
  var total = 0;
  traverse(
    window.localRoot,
    function (t) { if (t.id !== 'Root') total++; },
    function (t) { return t.children; }
  );
  statsEl.textContent = open + ' / ' + total;
}

// ── DOMContentLoaded ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

  // Restore persisted window names
  if (AppStorage.windowNames) {
    windowNames = AppStorage.windowNames.load() || {};
  }

  // Load initial tab tree via crudApi (calls initializeTree → renderAll when done)
  loadWindowList(true);

  // Search
  document.getElementById('search').addEventListener('input', function () {
    sidebarState.query = this.value.toLowerCase().trim();
    renderAll();
  });

  // Collapse all
  document.getElementById('collapseAll').addEventListener('click', function () {
    traverse(
      window.localRoot,
      function (t) {
        if (t.children && t.children.length > 0) {
          sidebarState.collapsedTabs.add(t.id);
        }
      },
      function (t) { return t.children; }
    );
    renderAll();
  });

  // Save tree snapshot
  document.getElementById('saveTree').addEventListener('click', function () {
    if (window.saveTree) saveTree();
  });
});

// ── Message bus: receive tab events from background.js ────────────────────────
chrome.runtime.onMessage.addListener(function (message) {
  if (!message || !message.type) return;

  if (message.type === 'tabCreated') {
    addNewTab(message.tab);
    // addNewTab calls updateTree → renderAll internally

  } else if (message.type === 'tabRemoved') {
    var tab = window.data && window.data[message.tabId];
    if (tab) {
      // Soft-delete: keep in tree so "N closed tabs" disclosure works
      tab.deleted = true;
      if (typeof localStore === 'function') localStore();
      renderAll();
    }

  } else if (message.type === 'tabUpdated') {
    updateTab(message.tabId, message.changeInfo);
    // updateTab calls updateTree → renderAll if display fields changed
    renderAll();
  }
});
