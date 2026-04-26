// sidepanel.js — bootstraps the Chrome Side Panel.
//
// Depends on (loaded before this file):
//   helperFunctions.js  — traverse, wrapText
//   storage.js          — AppStorage
//   browserApi.js       — BrowserApi
//   crudApi.js          — window.localRoot, window.data, addNewTab, updateTab, removeSubtree
//   renderer.js         — buildSidebarTree, countOpen

// Path to the local todos file — opened by the 📝 button via VS Code URL scheme.
// Chrome passes unknown schemes to the OS (xdg-open on Linux), so VS Code opens the file
// and the side panel stays open. Change the scheme prefix for other editors if needed.
var TODOS_FILE_PATH = '/home/aayush/Documents/Nonlinear-Browser/todos.md';
var TODOS_FILE_URL  = 'file://' + TODOS_FILE_PATH;  // kept for chrome.tabs.query check

// ── Drag state ────────────────────────────────────────────────────────────────
var dragState = { draggedId: null };


// ── Pinned tabs state ─────────────────────────────────────────────────────────
var PIN_COUNT       = 10;
var pinnedTabs      = [];   // array of {url, title, favIconUrl, tabId} | null
var ctxPinIndex     = null;
var _lastPinsState  = '';   // serialized snapshot; renderPins() bails if unchanged
var _pinDragSrc     = null; // index of the pin slot being dragged (null = tab drag)

// ── Suspend: pending resume tracking ─────────────────────────────────────────
// When resuming, createTab(url) fires tabCreated. pendingResume maps url →
// suspended tab node so tabCreated can reuse the existing node (preserving tree
// position) instead of inserting a duplicate.
var pendingResume = {}; // { [url]: tabNode[] } — queue so same-URL tabs don't collide

// ── Pin: pending open tracking ────────────────────────────────────────────────
// When clicking a dead pin, createTab(url) fires tabCreated. pendingPinOpen
// maps url → pin index so tabCreated can reconnect the slot with the new tabId.
var pendingPinOpen = {}; // { [url]: pinIndex[] } — queue so same-URL pins don't collide

// ── Undo-close stack ──────────────────────────────────────────────────────────
var closedGroupStack = [];   // [{ids: [tabId, ...]}]
var MAX_UNDO = 10;           // max undo entries; oldest group is purged when exceeded

// ── Extension-initiated close tracking ───────────────────────────────────────
// Tab IDs that the extension is intentionally closing via onClose.
// Used in tabRemoved to distinguish extension closes (don't re-parent children)
// from external closes via the Chrome tab bar (do re-parent children).
var _closingByExtension = new Set();

// ── Multi-select state ────────────────────────────────────────────────────────
var selectedTabIds = new Set();   // currently selected tab IDs
var selectMode     = false;       // single-clicks select instead of activate
var lastSelectedId = null;        // shift-click range anchor

function collectSubtree(tab, result) {
  result = result || [];
  if (!tab.deleted) result.push(tab.id);
  if (tab.children) tab.children.forEach(function (c) { collectSubtree(c, result); });
  return result;
}

// Remove a set of (soft-deleted) tab IDs from the tree and data entirely.
// Used when an undo group falls off the MAX_UNDO cap.
function _purgeGroup(ids) {
  ids.forEach(function (id) {
    var tab = window.data[id];
    if (!tab || !tab.deleted) return; // safety: never purge a live tab
    var parent = tab.parentId ? (window.data[tab.parentId] || window.localRoot) : window.localRoot;
    if (parent && parent.children) {
      var idx = parent.children.indexOf(tab);
      if (idx !== -1) parent.children.splice(idx, 1);
    }
    delete window.data[id];
  });
}

// Hard-delete a tab and its deleted children from the tree and data.
// Used for tabs closed externally (Chrome tab bar / another extension).
function _hardDeleteTab(tab) {
  if (tab.children) {
    tab.children.filter(function (c) { return c.deleted; }).forEach(_hardDeleteTab);
  }
  var parent = tab.parentId ? (window.data[tab.parentId] || window.localRoot) : window.localRoot;
  if (parent && parent.children) {
    var idx = parent.children.indexOf(tab);
    if (idx !== -1) parent.children.splice(idx, 1);
  }
  delete window.data[tab.id];
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
  collapsedWindows:   new Set(),
  showClosed:         false,
  query:              '',
  _draggingWindowId:  null,
  pinnedTabIds:       new Set(),

  onToggleWindow: function (windowId) {
    if (sidebarState.collapsedWindows.has(windowId)) {
      sidebarState.collapsedWindows.delete(windowId);
    } else {
      sidebarState.collapsedWindows.add(windowId);
    }
    renderAll();
  },

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
    if (closedGroupStack.length > MAX_UNDO) {
      var evicted = closedGroupStack.shift();
      _purgeGroup(evicted.ids);
    }
    // Mark as extension-initiated so tabRemoved won't re-parent children
    ids.forEach(function (tabId) { _closingByExtension.add(tabId); });
    // Close from deepest children first to avoid Chrome re-parenting them.
    // Suspended tabs are already gone from Chrome — soft-delete them directly.
    ids.slice().reverse().forEach(function (tabId) {
      var t = window.data && window.data[tabId];
      if (t && t.suspended) {
        t.deleted = true;
        _closingByExtension.delete(tabId);
      } else {
        BrowserApi.removeTab(tabId);
      }
    });
    renderAll();
    if (ids.length > 1) {
      showCloseToast(ids.length);
    }
  },

  onActivate: function (id) {
    clearSelection();
    var tab = window.data && window.data[id];
    if (!tab) return;
    if (tab.deleted) {
      // Tab was restored visually but Chrome tab is gone — reopen it
      BrowserApi.createTab(tab.url || '');
      return;
    }
    BrowserApi.focusTab(id, tab.windowId);
    // Optimistically update active indicator (targeted DOM, no full rebuild)
    _applyActiveTab(id);
  },

  onDragStart: function (id, windowId) {
    dragState.draggedId = id;
    sidebarState._draggingWindowId = windowId;
    var el = document.querySelector('[data-tab-id="' + id + '"]');
    if (el) el.classList.add('dragging');
    // If this tab is part of the selection, mark all selected tabs as dragging
    if (sidebarState.selectedTabIds && sidebarState.selectedTabIds.has(id)) {
      sidebarState.selectedTabIds.forEach(function(selId) {
        var selEl = document.querySelector('[data-tab-id="' + selId + '"]');
        if (selEl) selEl.classList.add('dragging');
      });
    }
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
    var sel = sidebarState.selectedTabIds;
    if (sel && sel.size > 0 && sel.has(dragState.draggedId)) {
      moveMultipleTabs(Array.from(sel), targetId, pos);
    } else {
      moveTab(dragState.draggedId, targetId, pos);
    }
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
    var sel = sidebarState.selectedTabIds;
    if (sel && sel.size > 0 && sel.has(draggedId)) {
      sel.forEach(function(id) { moveTabToWindow(id, targetWindowId); });
    } else {
      moveTabToWindow(draggedId, targetWindowId);
    }
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

  onDeleteWindow: function (windowId) {
    deleteWindowTabs(windowId);
    renderAll();
  },

  onSuspend: function (id) {
    var tab = window.data && window.data[id];
    if (!tab || tab.deleted) return;

    // Collect the tab and all its non-deleted descendants
    var toSuspend = [];
    function collect(t) {
      toSuspend.push(t);
      (t.children || []).forEach(function (c) { if (!c.deleted) collect(c); });
    }
    collect(tab);

    // Never suspend pinned tabs
    toSuspend = toSuspend.filter(function (t) {
      return !(sidebarState.pinnedTabIds && sidebarState.pinnedTabIds.has(t.id));
    });
    if (toSuspend.length === 0) return;

    // Mark all as suspended before removing from Chrome so the tabRemoved
    // handler knows to skip soft-deletion.
    toSuspend.forEach(function (t) { t.suspended = true; });

    // Remove from Chrome deepest-first (mirrors how onClose works).
    toSuspend.slice().reverse().forEach(function (t) { BrowserApi.removeTab(t.id); });

    renderAll();
  },

  onResume: function (id) {
    clearSelection();
    var tab = window.data && window.data[id];
    if (!tab || !tab.suspended) return;

    // Register before createTab so tabCreated can reuse this tree node
    var url = tab.url || tab.pendingUrl || '';
    if (url) {
      if (!pendingResume[url]) pendingResume[url] = [];
      pendingResume[url].push(tab);
    }

    BrowserApi.createTab(url, tab.windowId);
  },

  onNewTab: function (windowId) {
    BrowserApi.createTab('', windowId);
  },

  onSelect: function (id, event) {
    if (event.shiftKey && lastSelectedId !== null) {
      rangeSelectTo(id);
    } else {
      if (selectedTabIds.has(id)) { selectedTabIds.delete(id); }
      else                         { selectedTabIds.add(id); }
      _applySelectionUpdate(id);
    }
    lastSelectedId = id;
    updateSelectionBar();
  },
};

// Expose selection state on sidebarState so renderer reads live values
sidebarState.selectedTabIds = selectedTabIds;
sidebarState.selectMode     = false;

// ── RAM memory tracking ───────────────────────────────────────────────────────
var tabMemory = {};
sidebarState.tabMemory = tabMemory;

// ── Auto-suspend ──────────────────────────────────────────────────────────────
// Suspend tabs that haven't been activated in 30+ minutes.
var tabLastUsed = {};        // { [tabId]: Date.now() timestamp }
var AUTO_SUSPEND_MS = 30 * 60 * 1000;  // 30 minutes

function _autoSuspendCheck() {
  if (!window.data) return;
  var threshold = Date.now() - AUTO_SUSPEND_MS;
  Object.keys(window.data).forEach(function (idStr) {
    var id  = parseInt(idStr);
    var tab = window.data[id];
    if (!tab || tab.deleted || tab.suspended || tab.active) return;
    if (tab.audible && !tab.muted) return;  // never suspend a tab playing audio
    if (sidebarState.pinnedTabIds && sidebarState.pinnedTabIds.has(id)) return;
    // First time we see this tab: record now and skip (don't suspend on first pass)
    if (!tabLastUsed[id]) { tabLastUsed[id] = Date.now(); return; }
    if (tabLastUsed[id] < threshold) {
      sidebarState.onSuspend(id);
    }
  });
}
// Check every minute; give the panel 5 s to finish loading first.
setTimeout(function () { setInterval(_autoSuspendCheck, 60 * 1000); }, 5000);

function _pollMemory() {
  if (!chrome.processes || !chrome.processes.getProcessInfo) return;
  chrome.processes.getProcessInfo([], true, function (procs) {
    if (chrome.runtime.lastError) return;
    Object.values(procs).forEach(function (proc) {
      var mb = Math.round((proc.privateMemory || 0) / 1048576);
      (proc.tabs || []).forEach(function (tid) { tabMemory[tid] = mb; });
    });
    renderAll();
  });
}
// Poll every 8 seconds; first poll 2s after load
setTimeout(_pollMemory, 2000);
setInterval(_pollMemory, 8000);

// ── Context menu state (module-level so sidebarState callbacks can use them) ──
var ctxTab = null;
var ctxWindowId = null;

function showCtxMenu(tab, x, y) {
  ctxTab = tab;
  var m = document.getElementById('ctxMenu');
  if (!m) return;

  var isSuspended = !!tab.suspended;
  var hasBranch   = !!(tab.children && tab.children.length > 0);

  // Suspend item: hidden when already suspended; label changes for parent tabs
  var suspendEl        = document.getElementById('ctxSuspend');
  var resumeEl         = document.getElementById('ctxResume');
  var sepEl            = document.getElementById('ctxSuspendSep');
  var closeEl          = document.getElementById('ctxClose');
  var closeSelectedEl  = document.getElementById('ctxCloseSelected');

  if (suspendEl) {
    suspendEl.style.display = isSuspended ? 'none' : '';
    suspendEl.textContent   = hasBranch ? '💤 \u00a0Suspend Branch' : '💤 \u00a0Suspend Tab';
  }
  if (resumeEl) resumeEl.style.display = isSuspended ? '' : 'none';
  if (sepEl)    sepEl.style.display    = isSuspended ? 'none' : '';

  // Show "Close [N] selected" when multiple tabs are selected and this tab is among them
  var inSelection = selectedTabIds.size > 1 && selectedTabIds.has(tab.id);
  if (closeSelectedEl) {
    closeSelectedEl.style.display = inSelection ? '' : 'none';
    if (inSelection) closeSelectedEl.textContent = '✕ \u00a0Close ' + selectedTabIds.size + ' selected tabs';
  }
  if (closeEl) closeEl.style.display = inSelection ? 'none' : '';

  m.style.left = Math.min(x, window.innerWidth - 180) + 'px';
  m.style.top  = Math.min(y, window.innerHeight - 160) + 'px';
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

  // Bail out early if nothing that affects pin rendering has changed.
  // This prevents img elements from being recreated on every tab click,
  // which causes favicons to flicker (re-fetch or re-paint).
  var nextState = JSON.stringify(pinnedTabs.map(function (p) {
    if (!p) return null;
    var tabData = window.data && window.data[p.tabId];
    var isOpen = !!(tabData && !tabData.deleted);
    var liveFavicon = (isOpen && tabData) ? tabData.favIconUrl : null;
    return { tabId: p.tabId, url: p.url, isOpen: isOpen, favicon: liveFavicon || p.favIconUrl };
  }));
  if (nextState === _lastPinsState) return;
  _lastPinsState = nextState;
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

      var liveFavicon = (isOpen && window.data && window.data[pin.tabId]) ? window.data[pin.tabId].favIconUrl : null;
      var displayFavicon = liveFavicon || pin.favIconUrl;
      if (displayFavicon) {
        var img = document.createElement('img');
        img.src = displayFavicon;
        img.width = 20; img.height = 20;
        img.style.borderRadius = '3px';
        img.onerror = (function (sl, p) {
          return function () {
            if (sl.contains(this)) sl.removeChild(this);
            var fb = document.createElement('div');
            fb.className = 'pin-letter';
            fb.style.background = hashColor(p.title || '');
            fb.textContent = ((p.title || '?')[0] || '?').toUpperCase();
            sl.appendChild(fb);
          };
        }(slot, pin));
        slot.appendChild(img);
      } else {
        var letter = document.createElement('div');
        letter.className = 'pin-letter';
        letter.style.background = hashColor(pin.title || '');
        letter.textContent = ((pin.title || '?')[0] || '?').toUpperCase();
        slot.appendChild(letter);
      }

      // Click: focus tab if open, else create new tab and track pin slot for reconnect
      slot.addEventListener('click', (function (p, idx) {
        return function () {
          if (window.data && window.data[p.tabId] && !window.data[p.tabId].deleted) {
            BrowserApi.focusTab(p.tabId, window.data[p.tabId].windowId);
          } else {
            if (!pendingPinOpen[p.url]) pendingPinOpen[p.url] = [];
            pendingPinOpen[p.url].push(idx);
            BrowserApi.createTab(p.url || '');
          }
        };
      }(pin, i)));

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

      // Pin drag-to-reorder
      slot.draggable = true;
      slot.addEventListener('dragstart', (function (idx2) {
        return function () {
          _pinDragSrc = idx2;
          slot.classList.add('pin-dragging');
        };
      }(i)));
      slot.addEventListener('dragend', function () {
        _pinDragSrc = null;
        document.querySelectorAll('.pin-dragging, .pin-drag-over').forEach(function (el) {
          el.classList.remove('pin-dragging', 'pin-drag-over');
        });
      });

      // Drag-over/drop: pin-to-pin swap OR tab-to-pin replace
      slot.addEventListener('dragover', (function (idx2) {
        return function (e) {
          if (_pinDragSrc !== null) {
            if (_pinDragSrc !== idx2) { e.preventDefault(); slot.classList.add('pin-drag-over'); }
          } else {
            e.preventDefault(); slot.classList.add('drop-active');
          }
        };
      }(i)));
      slot.addEventListener('dragleave', function () {
        slot.classList.remove('drop-active', 'pin-drag-over');
      });
      slot.addEventListener('drop', (function (idx2) {
        return function (e) {
          e.preventDefault();
          slot.classList.remove('drop-active', 'pin-drag-over');
          if (_pinDragSrc !== null) {
            // Pin-to-pin swap
            var tmp = pinnedTabs[_pinDragSrc];
            pinnedTabs[_pinDragSrc] = pinnedTabs[idx2];
            pinnedTabs[idx2] = tmp;
            _pinDragSrc = null;
            AppStorage.pinnedTabs.save(pinnedTabs);
            _lastPinsState = '';  // force re-render
            renderPins();
          } else {
            // Tab-to-pin replace
            var tabId = parseInt(e.dataTransfer.getData('text/plain'));
            var t = window.data && window.data[tabId];
            if (!t) return;
            pinnedTabs[idx2] = { url: t.url || '', title: t.title || '', favIconUrl: t.favIconUrl || '', tabId: t.id };
            AppStorage.pinnedTabs.save(pinnedTabs);
            renderPins();
          }
        };
      }(i)));

    } else {
      slot.className = 'pin-slot empty';
      var plus = document.createElement('span');
      plus.className = 'plus';
      plus.textContent = '+';
      slot.appendChild(plus);

      // Drop onto empty slot (pin move or tab-to-pin)
      slot.addEventListener('dragover', function (e) { e.preventDefault(); slot.classList.add('drop-active'); });
      slot.addEventListener('dragleave', function () { slot.classList.remove('drop-active'); });
      slot.addEventListener('drop', (function (idx2) {
        return function (e) {
          e.preventDefault();
          slot.classList.remove('drop-active');
          if (_pinDragSrc !== null) {
            // Move pin to empty slot
            pinnedTabs[idx2] = pinnedTabs[_pinDragSrc];
            pinnedTabs[_pinDragSrc] = null;
            _pinDragSrc = null;
            AppStorage.pinnedTabs.save(pinnedTabs);
            _lastPinsState = '';  // force re-render
            renderPins();
          } else {
            var tabId = parseInt(e.dataTransfer.getData('text/plain'));
            var t = window.data && window.data[tabId];
            if (!t) return;
            pinnedTabs[idx2] = { url: t.url || '', title: t.title || '', favIconUrl: t.favIconUrl || '', tabId: t.id };
            AppStorage.pinnedTabs.save(pinnedTabs);
            renderPins();
          }
        };
      }(i)));
    }

    slotsEl.appendChild(slot);
  }
}

// ── renderAll ─────────────────────────────────────────────────────────────────
var _firstRender = true;

var _renderScheduled = false;
function renderAll() {
  if (_renderScheduled) return;
  _renderScheduled = true;
  requestAnimationFrame(_doRender);
}

function _doRender() {
  _renderScheduled = false;
  var t0 = performance.now();
  var treeEl = document.getElementById('tree');
  if (!treeEl || !window.localRoot) return;

  if (_firstRender) {
    _firstRender = false;
    var skel = document.getElementById('skeleton');
    if (skel) skel.style.display = 'none';
    treeEl.style.display = '';
  }

  // Update set of open pinned tab IDs so renderer can hide them from the tree
  sidebarState.pinnedTabIds = new Set(
    pinnedTabs
      .filter(function (p) { return p && p.tabId && window.data && window.data[p.tabId] && !window.data[p.tabId].deleted; })
      .map(function (p) { return p.tabId; })
  );

  buildSidebarTree(treeEl, window.localRoot, windowNames, sidebarState);
  renderPins();
  console.log('[render] renderAll done in', (performance.now()-t0).toFixed(1)+'ms,',
    window.localRoot ? window.localRoot.children.length : 0, 'top-level nodes');
}

// ── Close toast ───────────────────────────────────────────────────────────────
var _toastTimer = null;
var _toastBarTimer = null;
var TOAST_DURATION = 4000;

function showToast(message) {
  var wrap   = document.getElementById('toastWrap');
  var textEl = document.getElementById('toastText');
  if (!wrap || !textEl) return;
  textEl.textContent = message;
  var kbd = wrap.querySelector('.toast-kbd');
  var bar = document.getElementById('toastBar');
  if (kbd) kbd.style.display = 'none';
  if (bar) bar.style.display = 'none';
  if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
  wrap.classList.add('visible');
  _toastTimer = setTimeout(function () { wrap.classList.remove('visible'); }, 2500);
}

function showCloseToast(count) {
  var wrap   = document.getElementById('toastWrap');
  var textEl = document.getElementById('toastText');
  var barEl  = document.getElementById('toastBar');
  if (!wrap || !textEl || !barEl) return;
  var kbd = wrap.querySelector('.toast-kbd');
  if (kbd) kbd.style.display = '';
  barEl.style.display = '';

  if (_toastTimer)    { clearTimeout(_toastTimer);    _toastTimer    = null; }
  if (_toastBarTimer) { clearTimeout(_toastBarTimer); _toastBarTimer = null; }

  textEl.textContent = count === 1 ? 'closed 1 tab' : 'closed ' + count + ' tabs';

  // Reset progress bar before showing
  barEl.style.transition = 'none';
  barEl.style.transform  = 'scaleX(0)';
  void barEl.offsetWidth; // reflow

  wrap.classList.add('visible');

  requestAnimationFrame(function () {
    barEl.style.transition = 'transform ' + TOAST_DURATION + 'ms linear';
    barEl.style.transform  = 'scaleX(1)';
  });

  _toastTimer = setTimeout(function () {
    wrap.classList.remove('visible');
    _toastBarTimer = setTimeout(function () {
      barEl.style.transition = 'none';
      barEl.style.transform  = 'scaleX(0)';
    }, 250);
  }, TOAST_DURATION);
}

window.showUrlInFooter = function (url) {
  var el   = document.getElementById('footerUrl');
  var hint = document.getElementById('kbdHint');
  if (el) el.textContent = url;
  if (hint) hint.style.visibility = url ? 'hidden' : 'visible';
};

// ── _applyActiveTab ───────────────────────────────────────────────────────────
// Targeted DOM update for tab-activation: only touches the two affected rows
// instead of rebuilding the entire tree (eliminates favicon flicker on clicks).
function _applyActiveTab(tabId) {
  // Update data model
  if (window.localRoot) {
    traverse(window.localRoot, function (t) { t.active = false; }, function (t) { return t.children; });
  }
  var tab = window.data && window.data[tabId];
  if (tab && !tab.deleted) tab.active = true;

  // Targeted DOM — only touch the two affected rows
  document.querySelectorAll('.tab-row.is-active').forEach(function (el) {
    el.classList.remove('is-active');
    var bar = el.querySelector('.active-bar');
    if (bar) bar.remove();
  });
  var newRow = document.querySelector('[data-tab-id="' + tabId + '"]');
  if (newRow) {
    newRow.classList.add('is-active');
    if (!newRow.querySelector('.active-bar')) {
      var bar = document.createElement('div');
      bar.className = 'active-bar';
      newRow.insertBefore(bar, newRow.firstChild);
    }
  }

  // Update active space label (targeted — no full rebuild)
  document.querySelectorAll('.win-label.is-active-space').forEach(function (el) {
    el.classList.remove('is-active-space');
  });
  if (tab && !tab.deleted) {
    var spaceEl = document.querySelector('.win-label[data-window-id="' + tab.windowId + '"]');
    if (spaceEl) spaceEl.classList.add('is-active-space');
  }
}

// ── Multi-select helpers ──────────────────────────────────────────────────────
function _applySelectionUpdate(id) {
  var row = document.querySelector('[data-tab-id="' + id + '"]');
  if (!row) return;
  var sel = selectedTabIds.has(id);
  row.classList.toggle('is-selected', sel);
  var check = row.querySelector('.tab-check');
  if (check) check.textContent = sel ? '●' : '○';
}

function clearSelection() {
  selectedTabIds.clear();
  lastSelectedId = null;
  document.querySelectorAll('.tab-row.is-selected').forEach(function (el) {
    el.classList.remove('is-selected');
    var c = el.querySelector('.tab-check');
    if (c) c.textContent = '○';
  });
  updateSelectionBar();
}

function rangeSelectTo(toId) {
  var rows = Array.from(document.querySelectorAll('#tree .tab-row[data-tab-id]'));
  var ids  = rows.map(function (r) { return parseInt(r.dataset.tabId); }).filter(function (id) { return id > 0; });
  var fromIdx = lastSelectedId !== null ? ids.indexOf(lastSelectedId) : -1;
  var toIdx   = ids.indexOf(toId);
  if (fromIdx === -1) fromIdx = toIdx;
  var start = Math.min(fromIdx, toIdx), end = Math.max(fromIdx, toIdx);
  for (var i = start; i <= end; i++) {
    var id = ids[i];
    if (window.data && window.data[id] && !window.data[id].deleted) {
      selectedTabIds.add(id);
      _applySelectionUpdate(id);
    }
  }
}

function updateSelectionBar() {
  var bar = document.getElementById('selectionBar');
  var ct  = document.getElementById('selCount');
  if (!bar) return;
  var n = selectedTabIds.size;
  bar.classList.toggle('visible', n > 0);
  if (ct) ct.textContent = n + ' tab' + (n !== 1 ? 's' : '');
}

// ── DOMContentLoaded ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  console.log('[init] DOMContentLoaded');
  console.time('[init] total');

  // Restore persisted window names
  if (AppStorage.windowNames) {
    windowNames = AppStorage.windowNames.load() || {};
  }

  // Restore persisted pinned tabs; pad to PIN_COUNT (migration: 6 → 10 slots)
  var savedPins = AppStorage.pinnedTabs.load();
  if (savedPins && Array.isArray(savedPins)) {
    pinnedTabs = savedPins;
    while (pinnedTabs.length < PIN_COUNT) pinnedTabs.push(null);
  } else {
    pinnedTabs = new Array(PIN_COUNT).fill(null);
  }
  renderPins();

  // Show warning banner if extension lacks file:// URL access
  chrome.extension.isAllowedFileSchemeAccess(function (allowed) {
    if (!allowed) document.getElementById('fileAccessBanner').style.display = 'flex';
  });
  document.getElementById('fileAccessDismiss').addEventListener('click', function () {
    document.getElementById('fileAccessBanner').style.display = 'none';
  });

  // Silently restore last session and load live Chrome tabs
  console.log('[init] calling checkLastSession');
  checkLastSession();

  // Final save on panel close to capture any last-second state
  window.addEventListener('beforeunload', function () { if (typeof localStore === 'function') localStore(); });

  // Search
  document.getElementById('search').addEventListener('input', function () {
    sidebarState.query = this.value.toLowerCase().trim();
    renderAll();
  });

  // Collapse / Expand all toggle
  var allCollapsed = false;
  document.getElementById('collapseAll').addEventListener('click', function () {
    if (!allCollapsed) {
      // Collapse all tab branches
      traverse(window.localRoot, function (t) {
        if (t.children && t.children.length > 0) sidebarState.collapsedTabs.add(t.id);
      }, function (t) { return t.children; });
      // Collapse all spaces/windows
      if (window.data) {
        Object.values(window.data).forEach(function (tab) {
          if (tab.windowId && !tab.deleted) sidebarState.collapsedWindows.add(tab.windowId);
        });
      }
      this.textContent = '⊞';
      this.title = 'Expand all';
    } else {
      sidebarState.collapsedTabs.clear();
      sidebarState.collapsedWindows.clear();
      this.textContent = '⊟';
      this.title = 'Collapse all';
    }
    allCollapsed = !allCollapsed;
    renderAll();
  });

  // Close panel button
  document.getElementById('closePanel').addEventListener('click', function () {
    chrome.runtime.sendMessage({ type: 'closePanel' });
  });

  // Todos button — open file in VS Code via vscode:// URL scheme.
  // Chrome passes the unknown scheme to the OS (xdg-open on Linux) so VS Code
  // opens the file and the side panel remains intact.
  document.getElementById('openTodos').addEventListener('click', function () {
    window.open('vscode://file/' + TODOS_FILE_PATH);
  });

  // ── Tab context menu ──────────────────────────────────────────────────────
  // Pin to Top
  document.getElementById('ctxPin').addEventListener('click', function () {
    if (!ctxTab) return;
    var emptyIdx = pinnedTabs.indexOf(null);
    if (emptyIdx === -1) { showToast('All pin slots are full'); return; }
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
    showToast('Bookmarked');
  });

  document.getElementById('ctxRename').addEventListener('click', function () {
    if (!ctxTab) return;
    var tab = ctxTab;  // capture before hideCtxMenu nulls ctxTab
    hideCtxMenu();
    var row = document.querySelector('[data-tab-id="' + tab.id + '"]');
    if (!row) return;
    var titleEl = row.querySelector('.tab-title');
    if (!titleEl) return;
    var saved = tab.customTitle || tab.title;
    titleEl.contentEditable = 'true'; titleEl.focus();
    var range = document.createRange(); range.selectNodeContents(titleEl);
    window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
    titleEl.addEventListener('blur', function () {
      titleEl.contentEditable = 'false';
      tab.customTitle = titleEl.textContent.trim() || saved;
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

  document.getElementById('ctxSuspend').addEventListener('click', function () {
    if (!ctxTab) return;
    sidebarState.onSuspend(ctxTab.id);
    hideCtxMenu();
  });

  document.getElementById('ctxResume').addEventListener('click', function () {
    if (!ctxTab) return;
    sidebarState.onResume(ctxTab.id);
    hideCtxMenu();
  });

  document.getElementById('ctxCloseSelected').addEventListener('click', function () {
    hideCtxMenu();
    Array.from(selectedTabIds).slice().reverse().forEach(function (id) {
      var tab = window.data && window.data[id];
      if (tab && !tab.deleted) sidebarState.onClose(id);
    });
    clearSelection();
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
    renderAll();  // recomputes pinnedTabIds so the tab reappears in the tree
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

  // ── Multi-select controls ─────────────────────────────────────────────────

  // Select mode toggle button
  document.getElementById('selectToggle').addEventListener('click', function () {
    selectMode = !selectMode;
    sidebarState.selectMode = selectMode;
    document.body.classList.toggle('select-mode', selectMode);
    this.classList.toggle('active', selectMode);
    if (!selectMode) clearSelection();
  });

  // Selection bar: close selected
  document.getElementById('selClose').addEventListener('click', function () {
    Array.from(selectedTabIds).slice().reverse().forEach(function (id) {
      var tab = window.data && window.data[id];
      if (tab && !tab.deleted) sidebarState.onClose(id);
    });
    clearSelection();
  });

  // Selection bar: clear
  document.getElementById('selClear').addEventListener('click', clearSelection);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      hideCtxMenu(); hideWinCtxMenu(); hidePinCtxMenu();
      clearSelection();
      if (selectMode) {
        selectMode = false; sidebarState.selectMode = false;
        document.body.classList.remove('select-mode');
        var st = document.getElementById('selectToggle');
        if (st) st.classList.remove('active');
      }
    }
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
      if (restored) showToast('Restored ' + restored + ' tab' + (restored > 1 ? 's' : ''));
    }
  });
});

// ── Message bus: receive tab events from background.js ────────────────────────
chrome.runtime.onMessage.addListener(function (message) {
  if (!message || !message.type) return;

  if (message.type === 'tabCreated') {
    tabLastUsed[message.tab.id] = Date.now();
    // Check if this is a resume — reuse the suspended node to preserve tree position
    var newUrl = message.tab.url || message.tab.pendingUrl || '';
    var suspendedNode = newUrl && pendingResume[newUrl] && pendingResume[newUrl].shift();
    if (!pendingResume[newUrl] || !pendingResume[newUrl].length) delete pendingResume[newUrl];
    if (suspendedNode) {
      delete window.data[suspendedNode.id];
      suspendedNode.id        = message.tab.id;
      suspendedNode.windowId  = message.tab.windowId;
      suspendedNode.suspended = false;
      suspendedNode.active    = message.tab.active || false;
      window.data[suspendedNode.id] = suspendedNode;
      if (typeof localStore === 'function') localStore();
      renderAll();
    } else {
      // Check if this tab was opened for a dead pin slot — reconnect it before rendering
      var pinQueue = newUrl && pendingPinOpen[newUrl];
      if (pinQueue && pinQueue.length) {
        var pinIdx = pinQueue.shift();
        if (!pinQueue.length) delete pendingPinOpen[newUrl];
        if (pinnedTabs[pinIdx]) {
          pinnedTabs[pinIdx].tabId = message.tab.id;
          AppStorage.pinnedTabs.save(pinnedTabs);
        }
      }
      addNewTab(message.tab);
      // addNewTab calls updateTree → renderAll internally
    }

  } else if (message.type === 'tabRemoved') {
    var tab = window.data && window.data[message.tabId];
    if (tab) {
      // Skip soft-deletion for intentionally suspended tabs
      if (tab.suspended) return;

      var closedByExtension = _closingByExtension.has(message.tabId);
      _closingByExtension.delete(message.tabId);

      if (!closedByExtension) {
        // Tab was closed externally (Chrome tab bar / another extension).
        // Re-parent any live children so they stay visible in the sidebar
        // instead of becoming invisible orphans under a deleted parent.
        var liveChildren = (tab.children || []).filter(function (c) { return !c.deleted && !c.suspended; });
        if (liveChildren.length > 0) {
          var gp = tab.parentId ? (window.data[tab.parentId] || window.localRoot) : window.localRoot;
          if (!gp || gp.deleted) gp = window.localRoot;
          var newParentId = (gp === window.localRoot) ? '' : String(gp.id);
          var tabIdx = gp.children.indexOf(tab);
          liveChildren.forEach(function (c, ci) {
            c.parentId = newParentId;
            if (tabIdx !== -1) {
              gp.children.splice(tabIdx + 1 + ci, 0, c);
            } else {
              gp.children.push(c);
            }
          });
          // Detach live children from the closing tab's children list
          tab.children = tab.children.filter(function (c) { return c.deleted || c.suspended; });
        }
      }

      if (closedByExtension) {
        // Extension-initiated close — soft-delete so Ctrl+Z can restore it
        tab.deleted = true;
      } else {
        // External close — hard-delete, no undo entry exists
        _hardDeleteTab(tab);
      }
      if (typeof localStore === 'function') localStore();
      renderAll();
    }

  } else if (message.type === 'tabUpdated') {
    updateTab(message.tabId, message.changeInfo);
    // updateTab calls updateTree → renderAll if display fields changed
    // Keep stored pin favicon in sync so dead-pin slots show the right icon
    if (message.changeInfo.favIconUrl) {
      var didUpdatePin = false;
      pinnedTabs.forEach(function (p, i) {
        if (p && p.tabId === message.tabId) {
          pinnedTabs[i] = { url: p.url, title: p.title, favIconUrl: message.changeInfo.favIconUrl, tabId: p.tabId };
          didUpdatePin = true;
        }
      });
      if (didUpdatePin) { AppStorage.pinnedTabs.save(pinnedTabs); _lastPinsState = ''; }
    }

  } else if (message.type === 'tabAttached') {
    var attachedTab = window.data && window.data[message.tabId];
    if (attachedTab) {
      attachedTab.windowId = message.windowId;
      renderAll();
    }

  } else if (message.type === 'tabActivated') {
    tabLastUsed[message.tabId] = Date.now();
    _applyActiveTab(message.tabId);

  } else if (message.type === 'focusPin') {
    var pin = pinnedTabs[message.slot];
    if (pin) {
      if (window.data && window.data[pin.tabId] && !window.data[pin.tabId].deleted) {
        BrowserApi.focusTab(pin.tabId, window.data[pin.tabId].windowId);
      } else {
        if (!pendingPinOpen[pin.url]) pendingPinOpen[pin.url] = [];
        pendingPinOpen[pin.url].push(message.slot);
        BrowserApi.createTab(pin.url || '');
      }
    }
  }
});
