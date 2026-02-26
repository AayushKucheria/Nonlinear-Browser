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

// ── Pinned tabs state ─────────────────────────────────────────────────────────
var PIN_COUNT    = 6;
var pinnedTabs   = [];   // array of {url, title, favIconUrl, tabId} | null
var ctxPinIndex  = null;

// ── Undo-close stack ──────────────────────────────────────────────────────────
var closedGroupStack = [];   // [{ids: [tabId, ...]}]

function collectSubtree(tab, result) {
  result = result || [];
  if (!tab.deleted) result.push(tab.id);
  if (tab.children) tab.children.forEach(function (c) { collectSubtree(c, result); });
  return result;
}

// ── Wire crudApi callbacks into renderAll ─────────────────────────────────────
// crudApi.js calls initializeTree / updateTree when data changes.
// We map both to renderAll so the sidebar re-renders on every data mutation.
window.initializeTree = function () { renderAll(); };
window.updateTree     = function () { renderAll(); };
window.drawTree       = function () { renderAll(); };

// ── Sidebar state ─────────────────────────────────────────────────────────────
var sidebarState = {
  collapsedTabs:      new Set(),
  showClosed:         false,
  query:              '',
  _draggingWindowId:  null,

  onToggle: function (id) {
    if (sidebarState.collapsedTabs.has(id)) {
      sidebarState.collapsedTabs.delete(id);
    } else {
      sidebarState.collapsedTabs.add(id);
    }
    renderAll();
  },

  onClose: function (id) {
    var tab = window.data && window.data[id];
    if (!tab) return;
    var ids = collectSubtree(tab);   // parent + all non-deleted descendants
    closedGroupStack.push({ ids: ids });
    // Close from deepest children first to avoid Chrome re-parenting them
    ids.slice().reverse().forEach(function (tabId) { BrowserApi.removeTab(tabId); });
  },

  onActivate: function (id) {
    var tab = window.data && window.data[id];
    if (!tab) return;
    if (tab.deleted) {
      // Tab was restored visually but Chrome tab is gone — reopen it
      BrowserApi.createTab(tab.url || '');
      return;
    }
    BrowserApi.focusTab(id, tab.windowId);
    // Optimistically update active indicator
    traverse(window.localRoot,
      function (t) { t.active = false; },
      function (t) { return t.children; }
    );
    tab.active = true;
    renderAll();
  },

  onDragStart: function (id, windowId) {
    dragState.draggedId = id;
    sidebarState._draggingWindowId = windowId;
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
    sidebarState._draggingWindowId = null;
    renderAll();
  },

  onDragEnd: function () {
    dragState.draggedId = null;
    sidebarState._draggingWindowId = null;
    document.querySelectorAll('.dragging,.dz-before,.dz-after,.dz-into,.dz-append').forEach(function (n) {
      n.classList.remove('dragging', 'dz-before', 'dz-after', 'dz-into', 'dz-append');
    });
  },

  onMute: function (id) {
    var tab = window.data && window.data[id];
    if (!tab) return;
    var nowMuted = !tab.muted;
    BrowserApi.muteTab(id, nowMuted);
    tab.muted = nowMuted;
    if (nowMuted) tab.audible = false;
    renderAll();
  },

  onWindowDrop: function (targetWindowId, draggedId) {
    moveTabToWindow(draggedId, targetWindowId);
    dragState.draggedId = null;
    sidebarState._draggingWindowId = null;
    renderAll();
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

function hidePinCtxMenu() {
  var m = document.getElementById('pinCtxMenu');
  if (m) m.style.display = 'none';
  ctxPinIndex = null;
}

// Persisted window-name overrides: { [windowId]: 'Custom name' }
var windowNames = {};

// ── renderPins ────────────────────────────────────────────────────────────────
function renderPins() {
  var slotsEl = document.getElementById('pinSlots');
  if (!slotsEl) return;
  slotsEl.innerHTML = '';

  var FALLBACK_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#10b981'];
  function hashColor(str) {
    return FALLBACK_COLORS[(str || '').charCodeAt(0) % FALLBACK_COLORS.length];
  }

  for (var i = 0; i < PIN_COUNT; i++) {
    var pin = pinnedTabs[i];
    var slot = document.createElement('div');

    if (pin) {
      slot.className = 'pin-slot filled';
      slot.title = pin.title || pin.url || '';

      // Check if the tab is still open in data
      var isOpen = !!(window.data && window.data[pin.tabId] && !window.data[pin.tabId].deleted);
      if (!isOpen) slot.classList.add('pin-closed');

      if (pin.favIconUrl) {
        var img = document.createElement('img');
        img.src = pin.favIconUrl;
        img.width = 20; img.height = 20;
        img.style.borderRadius = '3px';
        slot.appendChild(img);
      } else {
        var letter = document.createElement('div');
        letter.className = 'pin-letter';
        letter.style.background = hashColor(pin.title || '');
        letter.textContent = ((pin.title || '?')[0] || '?').toUpperCase();
        slot.appendChild(letter);
      }

      // Click: focus tab if open, else create new tab
      slot.addEventListener('click', (function (p) {
        return function () {
          if (window.data && window.data[p.tabId] && !window.data[p.tabId].deleted) {
            BrowserApi.focusTab(p.tabId, window.data[p.tabId].windowId);
          } else {
            BrowserApi.createTab(p.url || '');
          }
        };
      }(pin)));

      // Right-click: pin context menu
      slot.addEventListener('contextmenu', (function (idx) {
        return function (e) {
          e.preventDefault();
          ctxPinIndex = idx;
          var m = document.getElementById('pinCtxMenu');
          if (!m) return;
          m.style.left = Math.min(e.clientX, window.innerWidth - 180) + 'px';
          m.style.top  = Math.min(e.clientY, window.innerHeight - 60) + 'px';
          m.style.display = 'block';
        };
      }(i)));

      // Drag-over/drop (allow replacing a slot by dragging a tab onto it)
      slot.addEventListener('dragover', function (e) { e.preventDefault(); slot.classList.add('drop-active'); });
      slot.addEventListener('dragleave', function () { slot.classList.remove('drop-active'); });
      slot.addEventListener('drop', (function (idx2) {
        return function (e) {
          e.preventDefault();
          slot.classList.remove('drop-active');
          var tabId = parseInt(e.dataTransfer.getData('text/plain'));
          var t = window.data && window.data[tabId];
          if (!t) return;
          pinnedTabs[idx2] = { url: t.url || '', title: t.title || '', favIconUrl: t.favIconUrl || '', tabId: t.id };
          AppStorage.pinnedTabs.save(pinnedTabs);
          renderPins();
        };
      }(i)));

    } else {
      slot.className = 'pin-slot empty';
      var plus = document.createElement('span');
      plus.className = 'plus';
      plus.textContent = '+';
      slot.appendChild(plus);

      // Drop onto empty slot
      slot.addEventListener('dragover', function (e) { e.preventDefault(); slot.classList.add('drop-active'); });
      slot.addEventListener('dragleave', function () { slot.classList.remove('drop-active'); });
      slot.addEventListener('drop', (function (idx2) {
        return function (e) {
          e.preventDefault();
          slot.classList.remove('drop-active');
          var tabId = parseInt(e.dataTransfer.getData('text/plain'));
          var t = window.data && window.data[tabId];
          if (!t) return;
          pinnedTabs[idx2] = { url: t.url || '', title: t.title || '', favIconUrl: t.favIconUrl || '', tabId: t.id };
          AppStorage.pinnedTabs.save(pinnedTabs);
          renderPins();
        };
      }(i)));
    }

    slotsEl.appendChild(slot);
  }
}

// ── renderAll ─────────────────────────────────────────────────────────────────
function renderAll() {
  var treeEl = document.getElementById('tree');
  if (!treeEl || !window.localRoot) return;
  buildSidebarTree(treeEl, window.localRoot, windowNames, sidebarState);
  renderPins();
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

  // Restore persisted pinned tabs
  var savedPins = AppStorage.pinnedTabs.load();
  if (savedPins && Array.isArray(savedPins)) {
    pinnedTabs = savedPins;
  } else {
    pinnedTabs = new Array(PIN_COUNT).fill(null);
  }
  renderPins();

  // Load initial tab tree via crudApi (calls initializeTree → renderAll when done)
  loadWindowList(true);

  // Search
  document.getElementById('search').addEventListener('input', function () {
    sidebarState.query = this.value.toLowerCase().trim();
    renderAll();
  });

  // Collapse / Expand all toggle
  var allCollapsed = false;
  document.getElementById('collapseAll').addEventListener('click', function () {
    if (!allCollapsed) {
      traverse(window.localRoot, function (t) {
        if (t.children && t.children.length > 0) sidebarState.collapsedTabs.add(t.id);
      }, function (t) { return t.children; });
      this.textContent = '⊞';
      this.title = 'Expand all';
    } else {
      sidebarState.collapsedTabs.clear();
      this.textContent = '⊟';
      this.title = 'Collapse all';
    }
    allCollapsed = !allCollapsed;
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
  // Pin to Top
  document.getElementById('ctxPin').addEventListener('click', function () {
    if (!ctxTab) return;
    var emptyIdx = pinnedTabs.indexOf(null);
    if (emptyIdx === -1) { Fnon.Hint.Error('All pin slots are full'); return; }
    pinnedTabs[emptyIdx] = { url: ctxTab.url || '', title: ctxTab.title || '', favIconUrl: ctxTab.favIconUrl || '', tabId: ctxTab.id };
    AppStorage.pinnedTabs.save(pinnedTabs);
    hideCtxMenu();
    renderPins();
  });

  // Bookmark Tab
  document.getElementById('ctxBookmark').addEventListener('click', function () {
    if (!ctxTab) return;
    BrowserApi.bookmarkTab(ctxTab.url || '', ctxTab.customTitle || ctxTab.title || '');
    hideCtxMenu();
    Fnon.Hint.Success('Bookmarked');
  });

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
    sidebarState.onClose(ctxTab.id);
    hideCtxMenu();
  });

  document.addEventListener('click', function (e) {
    var ctxMenu    = document.getElementById('ctxMenu');
    var pinCtxMenu = document.getElementById('pinCtxMenu');
    if (ctxMenu    && !ctxMenu.contains(e.target))    hideCtxMenu();
    if (pinCtxMenu && !pinCtxMenu.contains(e.target)) hidePinCtxMenu();
  });

  // Unpin handler
  document.getElementById('ctxUnpin').addEventListener('click', function () {
    if (ctxPinIndex === null) return;
    pinnedTabs[ctxPinIndex] = null;
    AppStorage.pinnedTabs.save(pinnedTabs);
    hidePinCtxMenu();
    renderPins();
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
    if (e.key === 'Escape') { hideCtxMenu(); hideWinCtxMenu(); hidePinCtxMenu(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (!closedGroupStack.length) return;
      var group    = closedGroupStack.pop();
      var restored = 0;
      group.ids.forEach(function (id) {
        var tab = window.data && window.data[id];
        if (tab && tab.deleted) { tab.deleted = false; restored++; }
      });
      renderAll();
      if (restored) Fnon.Hint.Success('Restored ' + restored + ' tab' + (restored > 1 ? 's' : ''));
    }
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
