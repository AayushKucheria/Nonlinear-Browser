// renderer.js — pure DOM renderer for the sidebar tab tree.
// No Chrome API calls. All public functions exported on window.

(function () {
  'use strict';

  var FALLBACK_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#10b981'];

  // ---------------------------------------------------------------------------
  // Favicon img element cache — keyed by tab.id.
  // Reusing existing <img> elements avoids re-fetching / re-painting favicons on
  // every full tree rebuild, eliminating the flicker visible on tab-switch.
  // ---------------------------------------------------------------------------
  var _faviconImgCache = {};  // { tabId: { src: string, el: HTMLElement } }

  // ---------------------------------------------------------------------------
  // Title overlay — shows full tab title below the hovered row when the title
  // is truncated (scrollWidth > clientWidth).
  // ---------------------------------------------------------------------------
  var _titleOverlay = null;

  function _removeOverlay() {
    if (_titleOverlay) { _titleOverlay.remove(); _titleOverlay = null; }
  }

  function _showOverlay(titleEl, rowEl, text) {
    _removeOverlay();
    if (titleEl.scrollWidth <= titleEl.clientWidth + 1) return;
    var rr = rowEl.getBoundingClientRect();
    var tr = titleEl.getBoundingClientRect();
    var ov = document.createElement('div');
    ov.className = 'title-overlay';
    ov.textContent = text;
    ov.style.left  = tr.left + 'px';
    ov.style.width = (rr.right - tr.left - 4) + 'px';
    var spaceBelow = window.innerHeight - rr.bottom;
    if (spaceBelow >= 48) ov.style.top = (rr.bottom + 2) + 'px';
    else ov.style.bottom = (window.innerHeight - rr.top + 2) + 'px';
    document.body.appendChild(ov);
    _titleOverlay = ov;
  }

  // ---------------------------------------------------------------------------
  // _makeNewTabRow(windowId, state) — "+ New tab" ghost row at top of each window
  // ---------------------------------------------------------------------------
  function _makeNewTabRow(windowId, state) {
    var row   = document.createElement('div'); row.className = 'new-tab-row';
    var inner = document.createElement('div'); inner.className = 'new-tab-inner';
    var plus  = document.createElement('span'); plus.className = 'new-tab-plus'; plus.textContent = '+';
    var lbl   = document.createElement('span'); lbl.className = 'new-tab-label'; lbl.textContent = 'New tab';
    inner.appendChild(plus); inner.appendChild(lbl); row.appendChild(inner);
    row.addEventListener('click', function () { if (state.onNewTab) state.onNewTab(windowId); });
    return row;
  }

  function hashColor(str) {
    return FALLBACK_COLORS[(str || '').charCodeAt(0) % FALLBACK_COLORS.length];
  }

  // ---------------------------------------------------------------------------
  // countOpen(tabs) → number
  // Counts non-deleted (open) tabs recursively.
  // ---------------------------------------------------------------------------
  function countOpen(tabs) {
    var n = 0;
    for (var i = 0; i < tabs.length; i++) {
      var t = tabs[i];
      if (!t.deleted) n++;
      if (t.children && t.children.length) n += countOpen(t.children);
    }
    return n;
  }
  window.countOpen = countOpen;

  // ---------------------------------------------------------------------------
  // matchesSearch(tab, query) → boolean
  // Returns true if tab.title contains query (case-insensitive),
  // or if any descendant title matches (search bubbles up to parents).
  // Empty query always returns true.
  // ---------------------------------------------------------------------------
  function matchesSearch(tab, query) {
    if (!query) return true;
    var q = query.toLowerCase();
    if ((tab.title || '').toLowerCase().indexOf(q) !== -1) return true;
    var children = tab.children || [];
    for (var i = 0; i < children.length; i++) {
      if (matchesSearch(children[i], q)) return true;
    }
    return false;
  }
  window.matchesSearch = matchesSearch;

  // ---------------------------------------------------------------------------
  // renderTabRow(tab, depth, container, ancestors, isLast, state)
  //
  // Renders one tab row and recurses into visible children.
  // All rows are appended directly to `container` (flat list, not nested).
  //
  // state = {
  //   collapsedTabs : Set<id>
  //   showClosed    : boolean
  //   query         : string
  //   onToggle(id)  : called when collapse arrow is clicked
  //   onClose(id)   : called when ✕ is clicked
  //   onActivate(id): called when row body is clicked
  // }
  // ---------------------------------------------------------------------------
  function renderTabRow(tab, depth, container, ancestors, isLast, state) {
    var collapsedTabs = state.collapsedTabs;
    var showClosed    = state.showClosed;
    var query         = state.query;

    // ── Row wrapper ──────────────────────────────────────────────────────────
    var row = document.createElement('div');
    row.className = 'tab-row' +
      (tab.active              ? ' is-active'  : '') +
      (tab.deleted             ? ' is-closed'  : '') +
      (tab.suspended           ? ' is-suspended' : '') +
      (tab.audible && !tab.muted ? ' is-audible' : '') +
      (tab.muted               ? ' is-muted'   : '');

    // Drag-and-drop
    row.draggable = true;
    row.dataset.tabId = tab.id;
    row.addEventListener('dragstart', function (e) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(tab.id));
      state.onDragStart(tab.id, tab.windowId);
    });
    row.addEventListener('dragend', function () { state.onDragEnd(); });
    row.addEventListener('dragover', function (e) {
      if (!tab.deleted) { e.preventDefault(); state.onDragOver(tab.id, row, e.clientY); }
    });
    row.addEventListener('drop', function (e) {
      e.preventDefault(); state.onDrop(tab.id, e.clientY, row);
    });

    // URL in footer on hover + title overlay
    row.addEventListener('mouseenter', function () {
      if (window.showUrlInFooter) window.showUrlInFooter(tab.url || tab.pendingUrl || '');
      _showOverlay(titleEl, row, tab.customTitle || tab.title || '');
    });
    row.addEventListener('mouseleave', function () {
      if (window.showUrlInFooter) window.showUrlInFooter('');
      _removeOverlay();
    });

    // Right-click context menu
    row.addEventListener('contextmenu', function (e) { state.onContextMenu(tab, e); });

    // Active left bar
    if (tab.active) {
      var bar = document.createElement('div');
      bar.className = 'active-bar';
      row.appendChild(bar);
    }

    // ── Tree connector lines (depth > 0 only) ────────────────────────────────
    if (depth > 0) {
      var lines = document.createElement('div');
      lines.className = 'tree-lines';
      // One segment per ancestor level (vertical line or blank gap)
      for (var i = 0; i < depth - 1; i++) {
        var seg = document.createElement('span');
        seg.className = 'seg' + (ancestors[i] ? ' vert' : '');
        lines.appendChild(seg);
      }
      // Branch connector for this node
      var branch = document.createElement('span');
      branch.className = 'seg branch';
      lines.appendChild(branch);
      row.appendChild(lines);
    }

    // ── Inner content ────────────────────────────────────────────────────────
    var inner = document.createElement('div');
    inner.className = 'tab-inner';

    // Toggle arrow — present on every row for consistent alignment
    var hasChildren = tab.children && tab.children.length > 0;
    var tog = document.createElement('span');
    tog.className = 'toggle' + (hasChildren ? ' clickable' : '');
    if (hasChildren) {
      tog.textContent = collapsedTabs.has(tab.id) ? '▶' : '▾';
      tog.addEventListener('click', (function (id) {
        return function (e) {
          e.stopPropagation();
          state.onToggle(id);
        };
      }(tab.id)));
    }
    inner.appendChild(tog);

    // Favicon: <img> if favIconUrl present (reuse cached element to avoid flicker),
    // else letter avatar.
    var icon = document.createElement('span');
    icon.className = 'favicon';
    if (tab.favIconUrl) {
      var cached = _faviconImgCache[tab.id];
      if (cached && cached.src === tab.favIconUrl) {
        icon.appendChild(cached.el);  // reuse same element — no re-fetch, no flicker
      } else {
        var img = document.createElement('img');
        img.src = tab.favIconUrl;
        img.width = 14; img.height = 14; img.style.borderRadius = '2px';
        _faviconImgCache[tab.id] = { src: tab.favIconUrl, el: img };
        icon.appendChild(img);
      }
    } else {
      icon.style.background = hashColor(tab.title || '');
      icon.textContent = ((tab.title || '?')[0] || '?').toUpperCase();
    }
    inner.appendChild(icon);

    // Title + URL (URL visible only on suspended rows via CSS)
    var titleWrap = document.createElement('span');
    titleWrap.className = 'tab-title-wrap';

    var titleEl = document.createElement('span');
    titleEl.className = 'tab-title';
    titleEl.textContent = tab.customTitle || tab.title || '';
    titleWrap.appendChild(titleEl);

    var urlEl = document.createElement('span');
    urlEl.className = 'tab-url';
    urlEl.textContent = tab.url || tab.pendingUrl || '';
    titleWrap.appendChild(urlEl);

    inner.appendChild(titleWrap);

    // RAM badge — shown for non-suspended tabs consuming >= 150 MB
    var memMB = (state.tabMemory && state.tabMemory[tab.id]) || 0;
    if (!tab.suspended && memMB >= 150) {
      var badge = document.createElement('span');
      badge.className = 'tab-ram-badge';
      badge.textContent = '\u2191 ' + memMB + 'MB';
      inner.appendChild(badge);
    }

    // Sleep icon — only visible on suspended rows via CSS
    var sleepEl = document.createElement('span');
    sleepEl.className = 'tab-sleep';
    sleepEl.textContent = '💤';
    inner.appendChild(sleepEl);

    // Audio indicator (🔊/🔇) — only visible when tab is audible or muted
    var audio = document.createElement('span');
    audio.className = 'tab-audio';
    audio.title = tab.muted ? 'Unmute tab' : 'Mute tab';
    audio.textContent = tab.muted ? '🔇' : '🔊';
    audio.addEventListener('click', (function (id) {
      return function (e) { e.stopPropagation(); state.onMute(id); };
    }(tab.id)));
    inner.appendChild(audio);

    // Close button (🗑)
    var cls = document.createElement('span');
    cls.className = 'tab-close';
    cls.textContent = '🗑';
    cls.addEventListener('click', (function (id) {
      return function (e) {
        e.stopPropagation();
        state.onClose(id);
      };
    }(tab.id)));
    inner.appendChild(cls);

    row.appendChild(inner);

    // Click body → activate (or resume if suspended)
    if (!tab.deleted) {
      row.addEventListener('click', (function (id) {
        return function () {
          if (tab.suspended) {
            if (state.onResume) state.onResume(id);
          } else {
            state.onActivate(id);
          }
        };
      }(tab.id)));
    }

    container.appendChild(row);

    // ── Recurse into children ────────────────────────────────────────────────
    if (!collapsedTabs.has(tab.id)) {
      var children = tab.children || [];
      var visible  = children.filter(function (c) {
        if (c.deleted && !showClosed) return false;
        return matchesSearch(c, query);
      });
      for (var j = 0; j < visible.length; j++) {
        var child      = visible[j];
        var childIsLast = (j === visible.length - 1);
        renderTabRow(
          child,
          depth + 1,
          container,
          ancestors.concat([!isLast]),
          childIsLast,
          state
        );
      }
    }
  }
  window.renderTabRow = renderTabRow;

  // ---------------------------------------------------------------------------
  // buildSidebarTree(container, localRoot, windowNames, state)
  //
  // Clears container then renders the full sidebar:
  //   - Groups localRoot.children by windowId
  //   - Renders a collapsible .win-label per window (double-click to rename)
  //   - Calls renderTabRow for each top-level tab in the window
  // ---------------------------------------------------------------------------
  function buildSidebarTree(container, localRoot, windowNames, state) {
    // Save existing favicon img elements before clearing so they can be reused,
    // avoiding re-fetches and the flicker that comes with full DOM rebuilds.
    container.querySelectorAll('[data-tab-id]').forEach(function (row) {
      var img = row.querySelector('.favicon img');
      if (img) _faviconImgCache[row.dataset.tabId] = { src: img.getAttribute('src'), el: img };
    });
    container.innerHTML = '';
    var showClosed = state.showClosed;
    var query      = state.query;

    // Group top-level tabs by windowId (insertion order preserved)
    var windowMap = [];      // [{windowId, tabs:[]}]
    var windowIdx = {};      // windowId → index in windowMap
    var children  = (localRoot && localRoot.children) || [];
    for (var i = 0; i < children.length; i++) {
      var tab = children[i];
      var wid = tab.windowId;
      if (windowIdx[wid] === undefined) {
        windowIdx[wid] = windowMap.length;
        windowMap.push({ windowId: wid, tabs: [] });
      }
      windowMap[windowIdx[wid]].tabs.push(tab);
    }

    for (var wi = 0; wi < windowMap.length; wi++) {
      var windowId   = windowMap[wi].windowId;
      var tabs       = windowMap[wi].tabs;
      var winName    = (windowNames && windowNames[windowId]) || ('Window ' + windowId);
      var openCount  = countOpen(tabs);

      // ── Window label ──────────────────────────────────────────────────────
      var label = document.createElement('div');
      label.className = 'win-label';
      label.dataset.windowId = windowId;
      label.addEventListener('contextmenu', function (e) { state.onWindowContextMenu(windowId, e); });

      var chev = document.createElement('span');
      chev.className = 'win-chevron';
      chev.textContent = '▾';

      var nameEl = document.createElement('span');
      nameEl.className = 'win-name';
      nameEl.textContent = winName;
      nameEl.title = 'Double-click to rename';

      var count = document.createElement('span');
      count.className = 'win-count';
      count.textContent = openCount;

      label.appendChild(chev);
      label.appendChild(nameEl);
      label.appendChild(count);

      // Cross-window drag: highlight label when dragging from a different window
      label.addEventListener('dragover', (function (wid, lbl) {
        return function (e) {
          if (state._draggingWindowId !== null && state._draggingWindowId !== wid) {
            e.preventDefault();
            lbl.classList.add('dz-append');
          }
        };
      }(windowId, label)));
      label.addEventListener('dragleave', (function (lbl) {
        return function () { lbl.classList.remove('dz-append'); };
      }(label)));
      label.addEventListener('drop', (function (wid, lbl) {
        return function (e) {
          e.preventDefault();
          lbl.classList.remove('dz-append');
          var draggedId = parseInt(e.dataTransfer.getData('text/plain'));
          state.onWindowDrop(wid, draggedId);
        };
      }(windowId, label)));

      // Double-click to rename (persisted via AppStorage.windowNames)
      nameEl.addEventListener('dblclick', function (e) {
        e.stopPropagation();
        var el = e.currentTarget;
        el.contentEditable = 'true';
        el.focus();
        var range = document.createRange();
        range.selectNodeContents(el);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
      });

      nameEl.addEventListener('blur', (function (wid, original) {
        return function (e) {
          var el = e.currentTarget;
          el.contentEditable = 'false';
          var newName = el.textContent.trim() || original;
          el.textContent = newName;
          windowNames[wid] = newName;
          if (window.AppStorage && AppStorage.windowNames) {
            AppStorage.windowNames.save(windowNames);
          }
        };
      }(windowId, winName)));

      nameEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
        if (e.key === 'Escape') {
          var el = e.currentTarget;
          el.textContent = el.getAttribute('data-original') || el.textContent;
          el.blur();
        }
        e.stopPropagation();
      });

      container.appendChild(label);
      container.appendChild(_makeNewTabRow(windowId, state));

      // ── Tabs for this window ──────────────────────────────────────────────
      var visible = tabs.filter(function (t) {
        if (t.deleted && !showClosed) return false;
        return matchesSearch(t, query);
      });
      for (var ti = 0; ti < visible.length; ti++) {
        renderTabRow(
          visible[ti],
          0,
          container,
          [],
          ti === visible.length - 1,
          state
        );
      }
    }
  }
  window.buildSidebarTree = buildSidebarTree;

}());
