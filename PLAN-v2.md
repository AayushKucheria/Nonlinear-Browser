# visualize.js Rewrite Plan

## Why

A code quality audit (2026-02-21) identified `visualize.js` as the primary source of
architectural debt: **841 lines, 28+ globals, a 361-line `drawTree()`, and 4 boolean drag-state
flags** (`dragCommenced`, `clickFlag`, `selectedNode`, `draggingNode`). It's a God object that
owns rendering, zoom, pan, drag, animation, and UI interaction simultaneously. No other file
comes close to this level of coupling.

### Critical bugs fixed before this rewrite (all resolved, 23 tests green)

| Bug | File | Fix |
|---|---|---|
| `localRootToData()` only traversed last sibling branch | `crudApi.js:83` | Loop over all children with `forEach` |
| `fetchTree()` appended snapshot as child instead of replacing tree | `savedTrees.js:80` | Assign `window.localRoot = snapshot`, clear `window.data` first |
| `d3.selectAll('contextMenu')` missing dot — menu div never created | `context_menu.js:12` | `d3.selectAll('.contextMenu')` |
| Font Awesome loaded from CDN (breaks offline / strict CSP) | `tabs_api.html`, `savedTrees.js` | Removed CDN links; replaced FA icons with Unicode chars |

### Remaining structural problems (addressed by this rewrite)

- `visualize.js` is untestable in unit tests (browser-only D3); must be verified live
- `window.localRoot` / `window.data` mutated by 4 different files with no single owner
- `localStore()` not called after `updateTab()` — title changes not persisted on crash
- Two conflicting animation durations (`duration = 750`, `animationDuration = 500`)
- `xlink:href` usage (deprecated SVG attribute)
- `d3.select("rect")` tooltip appended to non-existent element (dead code)

---

## What we're taking from each prototype

| Proto | Take | Drop |
|---|---|---|
| **A** | Compact 160×52 nodes, dark theme, favicon+title+domain layout, ▶/▼ indicator | — |
| **B** | Auto-fit on load, hover tooltip (title + URL + child count), top-down layout | LTR attempt (never tried) |
| **C** | Edge panning, touchpad fix (scroll→pan, ctrl+scroll→zoom), pin-as-root + breadcrumb | LTR direction |
| **D** | Minimap (200×130, bottom-right, viewport rect, click-to-jump, pin highlight) | — |

Top-down layout stays. Root at top, depth grows downward.

---

## What gets preserved (untouched files)

- `background.js` — service worker, tab events forwarding
- `crudApi.js` — data layer (`window.localRoot`, `window.data`, CRUD ops)
- `helperFunctions.js` — `traverse`, `wrapText` (new renderer uses `title` directly, ignores `lines[]`)
- `close.js` — unload handler
- `tabs_api.js` — message receiver, bootstrap
- `savedTrees.js` — localStorage snapshots
- `context_menu.js` / `context_menu.css` — right-click menu
- `manifest.json`
- `lib/` — vendored JS (d3.v6.min.js; v6 vs v7 API differences are minor for what we use)

**Function signatures that must stay** (called from `tabs_api.js` and `crudApi.js`):
- `initializeTree(localRoot)` — called once at boot
- `updateTree(localRoot)` — called on tab changes
- `drawTree(source)` — called internally and from tab removal handler

---

## Drag-to-reparent

The current drag-to-reparent feature is tightly coupled to the old rendering.
**Defer it**: remove the drag listener from the new code. Mark where to re-hook it.

---

## Files to change

### 1. `visualize.js` — full rewrite

Keep the same exported API (`initializeTree`, `updateTree`, `drawTree`).
Throw away everything else.

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
- `click` on leaf → `openTab(d)` (navigate browser to real tab)
- `dblclick` on node with children → `pinNode(d.data)` (enter subtree)
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
  .on("zoom", e => {
    currentTransform = e.transform;
    g.attr("transform", e.transform);
    updateMinimapViewport();
  });
baseSvg.call(zoom);

// Plain scroll → pan
baseSvg.on("wheel.pan", event => {
  event.preventDefault();
  if (event.ctrlKey) return;
  zoom.translateBy(baseSvg, -event.deltaX * 0.5, -event.deltaY * 0.5);
}, { passive: false });
```
`window.currentPos` / `window.currentZoom` can be removed; state lives in `currentTransform`.

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
let pinStack = [];      // raw data node objects (ancestors)
let currentRootData;    // set to window.localRoot initially

function pinNode(nodeData) { ... }   // push + re-render
function popTo(index)      { ... }   // pop stack + re-render
function resetPin()        { ... }   // full reset
```
`drawTree` rebuilds hierarchy from `currentRootData`. When `pinStack` is empty,
`currentRootData === window.localRoot`. Subtree object is a live reference — tab
events still show up correctly while pinned.

**Minimap** (separate `<svg id="minimap-svg">` in HTML):
- Always renders full `window.localRoot` (ignores pin state) at tiny scale
- Node rects: `max(3, NODE_W * scale)` × `max(2, NODE_H * scale)`, filled `#2d4a7a`
- Pinned: non-pinned nodes 0.35 opacity; pinned subtree `#3a6ad4`; pin root `#63b3ed`
- Viewport rect: semi-transparent blue rect tracking `currentTransform`
- Click → jump main viewport to that point (300ms transition)
- `renderMinimap()` called at end of every `drawTree`
- `updateMinimapViewport()` called in zoom callback

**Tooltip** (`<div id="node-tooltip">`, `position:fixed`, `pointer-events:none`):
- `mouseenter` → show; `mousemove` → reposition; `mouseleave` → hide
- Content: title, URL, child count
- Replaces current blur-favicon-on-hover

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

Replace the current white/blue scheme:

```css
body { background: #1a1a2e; }
.svg-container { background: #1a1a2e; }

rect.node-bg { fill: #16213e; stroke: #2d4a7a; stroke-width: 1px; rx: 5; }
rect.node-bg:hover { fill: #1a2f5e; stroke: #4a90d9; }
rect.node-bg.pinned-root { fill: #1e3a6e; stroke: #63b3ed; stroke-width: 2px; }
rect.node-bg.read    { fill: #2a3a2a; }
rect.node-bg.deleted { fill: #3a1a1a; }

text.node-title  { fill: #e2e8f0; font-size: 12px; font-weight: 500; }
text.node-domain { fill: #718096; font-size: 10px; }
text.node-indicator { fill: #4a5568; font-size: 10px; }

path.link { fill: none; stroke: #2d3748; stroke-width: 1.5px; }

/* Breadcrumb, tooltip, minimap styles go here */
```

Remove: `.ghostCircle`, `.templink`, `.activeDrag`, `rect.node`.

---

## Implementation phases

### Phase 1 — Dark theme + compact nodes + standard zoom
- Rewrite `visualize.js`: new node design, `d3.zoom`, keep `initializeTree` / `updateTree` / `drawTree` working
- Update `styles.css` to dark theme
- Verify: `tabs_api.js` boots correctly, tab events update the tree

### Phase 2 — Touchpad fix + edge panning + auto-fit
- Add touchpad zoom filter, `wheel.pan` listener, edge panning RAF loop, `fitToNodes`
- Verify: trackpad scroll pans, ctrl+scroll/pinch zooms, edge panning works

### Phase 3 — Pin-as-root + breadcrumb
- Add `pinStack`, `pinNode`, `popTo`, `resetPin`
- Add `<div id="pin-breadcrumb">` to HTML + CSS
- Wire dblclick → `pinNode`, Escape → `popTo`
- Verify: pin/unpin works, breadcrumb reflects path, tab events work while pinned

### Phase 4 — Minimap
- Add minimap HTML + CSS, `renderMinimap()`, `updateMinimapViewport()`, click-to-jump
- Verify: minimap tracks full tree, viewport rect follows pan/zoom, pin highlights work

### Phase 5 — Hover tooltip
- Add `<div id="node-tooltip">` to HTML + CSS
- Wire `mouseenter` / `mousemove` / `mouseleave` on nodes
- Verify: tooltip shows correct info, doesn't interfere with click/dblclick

---

## Risk / notes

- **D3 v6 vs v7**: prototypes used v7 from CDN; extension uses vendored v6. API is nearly
  identical. `d3.pointer(event)` and `zoom.translateBy` exist in both.
- **`window.currentRoot`**: keep assigning it in `initializeTree` / `updateTree` in case
  anything reads it; use `currentRootData` for actual rendering.
- **`wrapText` / `lines[]`**: still called in `addNewTab`, stored on nodes. New renderer
  ignores `lines[]` and reads `title` directly. No breakage.
- **Tests**: 23 tests cover `crudApi.js` and `helperFunctions.js` only. `visualize.js` is
  browser-only D3 — must be verified by loading the extension in Chrome.
