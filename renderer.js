// renderer.js — pure DOM renderer for the sidebar tab tree.
// No Chrome API calls. All public functions exported on window.

(function () {
  'use strict';

  var FALLBACK_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#10b981'];

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
      (tab.active  ? ' is-active' : '') +
      (tab.deleted ? ' is-closed' : '');

    // URL tooltip (shown on row hover via CSS)
    var tip = document.createElement('div');
    tip.className = 'url-tip';
    tip.textContent = tab.url || tab.pendingUrl || '';
    row.appendChild(tip);

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

    // Favicon: <img> if favIconUrl present, else letter avatar
    var icon = document.createElement('span');
    icon.className = 'favicon';
    if (tab.favIconUrl) {
      var img = document.createElement('img');
      img.src = tab.favIconUrl;
      img.width  = 14;
      img.height = 14;
      img.style.borderRadius = '2px';
      icon.appendChild(img);
    } else {
      icon.style.background = hashColor(tab.title || '');
      icon.textContent = ((tab.title || '?')[0] || '?').toUpperCase();
    }
    inner.appendChild(icon);

    // Title
    var titleEl = document.createElement('span');
    titleEl.className = 'tab-title';
    titleEl.textContent = tab.title || '';
    inner.appendChild(titleEl);

    // Close button (✕)
    var cls = document.createElement('span');
    cls.className = 'tab-close';
    cls.textContent = '✕';
    cls.addEventListener('click', (function (id) {
      return function (e) {
        e.stopPropagation();
        state.onClose(id);
      };
    }(tab.id)));
    inner.appendChild(cls);

    row.appendChild(inner);

    // Click body → activate tab in browser
    if (!tab.deleted) {
      row.addEventListener('click', (function (id) {
        return function () { state.onActivate(id); };
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
