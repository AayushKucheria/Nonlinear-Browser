// sidepanel.js — bootstraps the Chrome Side Panel.
//
// Depends on (loaded before this file):
//   helperFunctions.js  — traverse, wrapText
//   storage.js          — AppStorage
//   browserApi.js       — BrowserApi
//   crudApi.js          — window.localRoot, window.data, addNewTab, updateTab, removeSubtree
//   renderer.js         — buildSidebarTree, countOpen

// ── Drag state ────────────────────────────────────────────────────────────────
var dragState = { draggedId: null };

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

  onDragStart: function (id) {
    dragState.draggedId = id;
    var el = document.querySelector('[data-tab-id="' + id + '"]');
    if (el) el.classList.add('dragging');
  },

  onDragOver: function (id, rowEl, clientY) {
    if (!dragState.draggedId || dragState.draggedId === id) return;
    document.querySelectorAll('.dz-before,.dz-after,.dz-into').forEach(function (n) {
      n.classList.remove('dz-before', 'dz-after', 'dz-into');
    });
    var rect = rowEl.getBoundingClientRect();
    var pct  = (clientY - rect.top) / rect.height;
    rowEl.classList.add(pct < 0.3 ? 'dz-before' : pct > 0.7 ? 'dz-after' : 'dz-into');
  },

  onDrop: function (targetId, clientY, rowEl) {
    if (!dragState.draggedId || dragState.draggedId === targetId) return;
    var rect = rowEl.getBoundingClientRect();
    var pct  = (clientY - rect.top) / rect.height;
    var pos  = pct < 0.3 ? 'before' : pct > 0.7 ? 'after' : 'into';
    moveTab(dragState.draggedId, targetId, pos);
    dragState.draggedId = null;
    renderAll();
  },

  onDragEnd: function () {
    dragState.draggedId = null;
    document.querySelectorAll('.dragging,.dz-before,.dz-after,.dz-into').forEach(function (n) {
      n.classList.remove('dragging', 'dz-before', 'dz-after', 'dz-into');
    });
  },

  onContextMenu: function (tab, event) {
    event.preventDefault();
    showCtxMenu(tab, event.clientX, event.clientY);
  },

  onWindowContextMenu: function (windowId, event) {
    event.preventDefault();
    showWinCtxMenu(windowId, event.clientX, event.clientY);
  },
};

// ── Context menu state (module-level so sidebarState callbacks can use them) ──
var ctxTab = null;
var ctxWindowId = null;

function showCtxMenu(tab, x, y) {
  ctxTab = tab;
  var m = document.getElementById('ctxMenu');
  if (!m) return;
  m.style.left = Math.min(x, window.innerWidth - 180) + 'px';
  m.style.top  = Math.min(y, window.innerHeight - 130) + 'px';
  m.style.display = 'block';
}
function hideCtxMenu() {
  var m = document.getElementById('ctxMenu');
  if (m) m.style.display = 'none';
  ctxTab = null;
}

function showWinCtxMenu(windowId, x, y) {
  ctxWindowId = windowId;
  var m = document.getElementById('winCtxMenu');
  if (!m) return;
  m.style.left = Math.min(x, window.innerWidth - 200) + 'px';
  m.style.top  = Math.min(y, window.innerHeight - 100) + 'px';
  m.style.display = 'block';
}
function hideWinCtxMenu() {
  var m = document.getElementById('winCtxMenu');
  if (m) m.style.display = 'none';
  ctxWindowId = null;
}

// Persisted window-name overrides: { [windowId]: 'Custom name' }
var windowNames = {};

// ── renderAll ─────────────────────────────────────────────────────────────────
function renderAll() {
  var treeEl = document.getElementById('tree');
  if (!treeEl || !window.localRoot) return;
  buildSidebarTree(treeEl, window.localRoot, windowNames, sidebarState);
  updateStats();
}

window.showUrlInFooter = function (url) {
  var el = document.getElementById('footerUrl');
  if (el) el.textContent = url;
};

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

  // Close panel button
  document.getElementById('closePanel').addEventListener('click', function () {
    chrome.runtime.sendMessage({ type: 'closePanel' });
  });

  // ── Tab context menu ──────────────────────────────────────────────────────
  document.getElementById('ctxRename').addEventListener('click', function () {
    if (!ctxTab) return; hideCtxMenu();
    var row = document.querySelector('[data-tab-id="' + ctxTab.id + '"]');
    if (!row) return;
    var titleEl = row.querySelector('.tab-title');
    var saved = ctxTab.customTitle || ctxTab.title;
    titleEl.contentEditable = 'true'; titleEl.focus();
    var range = document.createRange(); range.selectNodeContents(titleEl);
    window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
    titleEl.addEventListener('blur', function () {
      titleEl.contentEditable = 'false';
      ctxTab.customTitle = titleEl.textContent.trim() || saved;
      renderAll();
    }, { once: true });
    titleEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); }
      if (e.key === 'Escape') { titleEl.textContent = saved; titleEl.blur(); }
      e.stopPropagation();
    });
  });

  document.getElementById('ctxCopy').addEventListener('click', function () {
    if (!ctxTab) return;
    navigator.clipboard.writeText(ctxTab.url || '').catch(function () {});
    hideCtxMenu();
    window.showUrlInFooter('Copied!');
    setTimeout(function () { window.showUrlInFooter(''); }, 1500);
  });

  document.getElementById('ctxClose').addEventListener('click', function () {
    if (!ctxTab) return;
    BrowserApi.removeTab(ctxTab.id);
    hideCtxMenu();
  });

  document.addEventListener('click', function (e) {
    var ctxMenu = document.getElementById('ctxMenu');
    if (ctxMenu && !ctxMenu.contains(e.target)) hideCtxMenu();
  });

  // ── Window context menu ───────────────────────────────────────────────────
  document.getElementById('winCtxRename').addEventListener('click', function () {
    if (!ctxWindowId) return; hideWinCtxMenu();
    var lbl = document.querySelector('.win-label[data-window-id="' + ctxWindowId + '"]');
    if (!lbl) return;
    var nameEl = lbl.querySelector('.win-name');
    nameEl.contentEditable = 'true'; nameEl.focus();
    var range = document.createRange(); range.selectNodeContents(nameEl);
    window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
  });

  document.getElementById('winCtxDelete').addEventListener('click', function () {
    if (!ctxWindowId) return;
    var wid = ctxWindowId; hideWinCtxMenu();
    deleteWindowTabs(wid);
    renderAll();
  });

  document.addEventListener('click', function (e) {
    var winCtxMenu = document.getElementById('winCtxMenu');
    if (winCtxMenu && !winCtxMenu.contains(e.target)) hideWinCtxMenu();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { hideCtxMenu(); hideWinCtxMenu(); }
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

  } else if (message.type === 'tabActivated') {
    // Clear all active flags, then mark the newly active tab
    traverse(window.localRoot,
      function (t) { t.active = false; },
      function (t) { return t.children; }
    );
    var activeTab = window.data && window.data[message.tabId];
    if (activeTab && !activeTab.deleted) activeTab.active = true;
    renderAll();
  }
});
