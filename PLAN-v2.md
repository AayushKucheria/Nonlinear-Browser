# visualize.js Upgrade Plan

## Current state (post-cleanup)

`visualize.js` was stripped from 841 → 340 lines (2026-02-22). What's gone:

- Drag-to-reparent system (dragListener, ghostCircle, templink, floater animation)
- SVG filter stack (drop-shadow, favicon blur)
- Three competing zoom/pan implementations replaced with a single `d3.zoom()`
- `xlink:href` replaced with `href`; dead tooltip code removed
- 15+ unused variables

What remains is readable and stable. The file now has one job: render the tree.

---

## Fixed bugs (all resolved, 23 tests green)

| Bug | File | Fix |
|---|---|---|
| `localRootToData()` only traversed last sibling branch | `crudApi.js` | Loop over all children with `forEach` |
| `fetchTree()` appended snapshot as child instead of replacing tree | `savedTrees.js` | Assign `window.localRoot = snapshot`, clear `window.data` first |
| `d3.selectAll('contextMenu')` missing dot | `context_menu.js` | `d3.selectAll('.contextMenu')` |
| Font Awesome loaded from CDN | `tabs_api.html` | Removed; replaced FA icons with Unicode |
| Two conflicting animation durations | `visualize.js` | `animationDuration` removed; `duration = 750` remains |
| `xlink:href` (deprecated SVG attribute) | `visualize.js` | Replaced with `href` |
| `d3.select("rect")` tooltip on nonexistent element | `visualize.js` | Removed |

---

## Remaining rough edges (not blocking, but worth knowing)

- `crudApi.js` mixes bare `localRoot` and `window.localRoot` — works because they're the same global, but it's the source of past bugs. `updateTab` was explicitly fixed; others weren't.
- Context menu array is rebuilt inside `drawTree()` on every render — should be a module-level constant.
- `drawTree(source)` — `tabs_api.js` calls it with the raw data object (`window.localRoot`), not a hierarchy node. Works because raw data has `x0`/`y0`, but it's a latent mismatch.
- `localStore()` not called after `updateTab()` — title changes aren't persisted if the page crashes.

---

## What we're taking from each prototype

| Proto | Take | Drop |
|---|---|---|
| **A** | Compact 160×52 nodes, dark theme, favicon+title+domain layout, ▶/▼ indicator | — |
| **B** | Auto-fit on load, hover tooltip (title + URL + child count), top-down layout | LTR attempt |
| **C** | Edge panning, touchpad fix (scroll→pan, ctrl+scroll→zoom), pin-as-root + breadcrumb | LTR direction |
| **D** | Minimap (200×130, bottom-right, viewport rect, click-to-jump) | — |

Top-down layout stays. Root at top, depth grows downward.

---

## What stays untouched

- `background.js`, `close.js`, `manifest.json`
- `crudApi.js`, `helperFunctions.js`, `savedTrees.js`, `context_menu.js`
- `tabs_api.js` — message receiver and bootstrap
- `lib/` — vendored d3.v6.min.js (v6 API differences from v7 are minor)

**Function signatures that must stay** (called from `tabs_api.js` and `crudApi.js`):
- `initializeTree(localRoot)` — called once at boot
- `updateTree(localRoot)` — called on tab changes
- `drawTree(source)` — called internally and from tab removal handler

---

## Drag-to-reparent

Already removed. If it comes back, re-hook it in the new rendering; don't revive the old implementation.

---

## Files to change

### 1. `visualize.js` — upgrade (not full rewrite)

The cleanup is done. Now layer on the new features.
Keep `initializeTree` / `updateTree` / `drawTree`. The node shape, layout, and zoom all need updating.

**Node design (top-down, 160×52px):**
```
┌─────────────────────────────────┐  ← 160px wide
│ 🌐  Title text ellipsized…   ▼ │  ← row 1: favicon 14×14, title 12px, indicator
│    domain.com                   │  ← row 2: domain 10px, gray
└─────────────────────────────────┘  52px tall
```
- Background: `#16213e`, stroke: `#2d4a7a`, border-radius 5px
- Hover: `#1a2f5e`, stroke: `#4a90d9`
- Pinned root: `#1e3a6e`, stroke `#63b3ed` 2px
- `click` on node with children → toggle collapse
- `click` on leaf → `openTab(d)`
- `dblclick` on node with children → `pinNode(d.data)`
- `contextmenu` → existing `window.contextMenu(event, d, menu)` call

**Layout:**
```js
treeLayout = d3.tree()
  .nodeSize([NODE_W * 1.05, 90])
  .separation((a, b) => a.parent === b.parent ? 1 : 1.2);
// Root placed at (innerWidth/2, 60), depth grows downward
```

**Zoom / Pan:**
```js
const zoom = d3.zoom()
  .scaleExtent([0.05, 6])
  .filter(event => {
    if (event.type === 'wheel') return event.ctrlKey;   // ctrl+wheel/pinch = zoom
    return !event.ctrlKey && !event.button;
  })
  .on('zoom', e => {
    currentTransform = e.transform;
    g.attr('transform', e.transform);
    updateMinimapViewport();
  });
baseSvg.call(zoom);

// Plain scroll → pan
baseSvg.on('wheel.pan', event => {
  event.preventDefault();
  if (event.ctrlKey) return;
  zoom.translateBy(baseSvg, -event.deltaX * 0.5, -event.deltaY * 0.5);
}, { passive: false });
```
`currentTransform` already exists in the current code — just wire it up properly.

**Auto-fit** — `fitToNodes(nodes, animate)` called at end of `initializeTree` and after pin/unpin.
Computes bounding box → scale → translate via `zoom.transform`.

**Edge panning:**
```js
// mousemove on baseSvg → track mouse coords → RAF loop
// v = ((EDGE_ZONE - dist) / EDGE_ZONE)² * MAX_SPEED  (quadratic)
// EDGE_ZONE = 60px, MAX_SPEED = 8px/frame
// zoom.translateBy(baseSvg, dx, dy) each frame
```

**Pin-as-root:**
```js
let pinStack = [];      // raw data node objects (ancestors of currentRootData)
let currentRootData;    // set to window.localRoot initially

function pinNode(nodeData) { ... }   // push currentRootData → pinStack, set currentRootData = nodeData
function popTo(index)      { ... }   // currentRootData = pinStack[index], trim stack
function resetPin()        { ... }   // pinStack = [], currentRootData = window.localRoot
```
`drawTree` rebuilds hierarchy from `currentRootData`. When `pinStack` is empty,
`currentRootData === window.localRoot`. Subtree is a live reference — tab events still apply while pinned.

**Minimap** (separate `<svg id="minimap-svg">` in HTML):
- Always renders full `window.localRoot` (ignores pin state)
- Node rects: `max(3, NODE_W * scale)` × `max(2, NODE_H * scale)`, filled `#2d4a7a`
- Pin highlight: non-pinned nodes 0.35 opacity; pinned subtree `#3a6ad4`; pin root `#63b3ed`
- Viewport rect: semi-transparent blue rect tracking `currentTransform`
- Click → jump main viewport to that point (300ms transition)
- `renderMinimap()` called at end of every `drawTree`
- `updateMinimapViewport()` called in zoom callback

**Tooltip** (`<div id="node-tooltip">`, `position:fixed`, `pointer-events:none`):
- `mouseenter` → show; `mousemove` → reposition; `mouseleave` → hide
- Content: title, URL, child count
- Replaces current delete-icon-on-hover

**Controls kept:**
- `#centerTree` → `fitToNodes(lastRenderedNodes, true)`
- `#zoomIn` / `#zoomOut` → `zoom.scaleBy(baseSvg, 1.5)` / `zoom.scaleBy(baseSvg, 0.67)`

---

### 2. `tabs_api.html` — add overlay elements

Add before closing `</body>`:

```html
<!-- Breadcrumb for pin-as-root -->
<div id="pin-breadcrumb"></div>

<!-- Hover tooltip -->
<div id="node-tooltip">
  <div class="tt-title"></div>
  <div class="tt-url"></div>
  <div class="tt-meta"></div>
</div>

<!-- Minimap -->
<div id="minimap-wrap">
  <div id="minimap-label">Overview</div>
  <svg id="minimap-svg">
    <g id="mm-links"></g>
    <g id="mm-nodes"></g>
    <rect id="mm-viewport"></rect>
  </svg>
</div>
```

The `<span id="ruler">` stays (used by wrapText / tests).

---

### 3. `styles.css` — dark theme + new node styles

```css
body { background: #1a1a2e; }
.svg-container { background: #1a1a2e; }

rect.node-bg { fill: #16213e; stroke: #2d4a7a; stroke-width: 1px; }
rect.node-bg:hover { fill: #1a2f5e; stroke: #4a90d9; }
rect.node-bg.pinned-root { fill: #1e3a6e; stroke: #63b3ed; stroke-width: 2px; }
rect.node-bg.read    { fill: #2a3a2a; }
rect.node-bg.deleted { fill: #3a1a1a; }

text.node-title  { fill: #e2e8f0; font-size: 12px; font-weight: 500; }
text.node-domain { fill: #718096; font-size: 10px; }
text.node-indicator { fill: #4a5568; font-size: 10px; }

path.link { fill: none; stroke: #2d3748; stroke-width: 1.5px; }
```

---

## Implementation phases

### Phase 1 — Dark theme + compact nodes + zoom upgrade ✦ start here
- Swap node dimensions to 160×52, switch from `lines[]` multi-text to single title + domain row
- Replace current fill colors with dark theme
- Upgrade zoom: add `wheel.pan` listener and ctrl+scroll filter (the `zoomer` is already a single `d3.zoom()` — just needs the filter and scaleExtent widened)
- Add `fitToNodes()`, call it from `initializeTree`
- Update `styles.css`
- Verify: boots correctly, tab events update tree, scroll pans, ctrl+scroll zooms

### Phase 2 — Edge panning + auto-fit polish
- Add edge panning RAF loop
- Call `fitToNodes` after pin/unpin and on `#centerTree` click
- Verify: edge panning works, center button fits tree to view

### Phase 3 — Pin-as-root + breadcrumb
- Add `pinStack`, `currentRootData`, `pinNode`, `popTo`, `resetPin`
- Add `<div id="pin-breadcrumb">` to HTML + CSS
- Wire dblclick → `pinNode`, Escape → pop one level
- Verify: pin/unpin works, breadcrumb reflects path, tab events work while pinned

### Phase 4 — Minimap
- Add minimap HTML + CSS, `renderMinimap()`, `updateMinimapViewport()`, click-to-jump
- Verify: minimap tracks full tree, viewport rect follows pan/zoom, pin highlights work

### Phase 5 — Hover tooltip
- Add `<div id="node-tooltip">` to HTML + CSS
- Wire `mouseenter` / `mousemove` / `mouseleave` on nodes
- Replace delete-icon-on-hover with tooltip (simpler, less intrusive)
- Verify: tooltip shows correct info, doesn't block click/dblclick

---

## Notes

- **D3 v6**: prototypes used v7 from CDN; extension uses vendored v6. API is nearly identical for what we use — `d3.pointer(event)`, `zoom.translateBy`, `zoom.transform` all exist in v6.
- **`window.currentRoot`**: keep assigning it in `initializeTree` / `updateTree` in case anything reads it externally; use `currentRootData` for actual rendering decisions.
- **`wrapText` / `lines[]`**: still called in `addNewTab`, stored on nodes. New renderer can ignore `lines[]` and read `title` directly. No breakage either way.
- **Tests**: 23 tests cover `crudApi.js` and `helperFunctions.js` only. `visualize.js` is browser-only D3 — verify by loading the extension in Chrome after each phase.
