# Nonlinear-Browser — Claude Code guide

Chrome Extension (Manifest V3) that shows browser tabs as a compact indented list in a Chrome Side Panel.
No build system. No bundler. No module format. Plain script tags loaded by the browser.
Third-party JS (fnon) is vendored into `lib/` — MV3 prohibits remote scripts.

---

## Running tests

```bash
npm install        # first time only
npm test           # Jest 29
```

52 tests across 3 suites, runtime ~2 s.

---

## Architecture

| File | Role |
|---|---|
| `manifest.json` | MV3 manifest; service worker = `background.js`, side panel = `sidepanel.html`; `_execute_action` command for `Ctrl+Shift+Y` |
| `background.js` | **MV3 service worker** — `setPanelBehavior`; forwards tab events + `tabActivated`; handles `closePanel` message via `setOptions` toggle |
| `sidepanel.html` | Side panel HTML shell — header (with ✕ close btn), search bar, tree div, footer (URL bar); drag CSS; two context menu divs |
| `sidepanel.js` | Bootstraps the panel; `sidebarState` with drag + context menu callbacks; `showUrlInFooter`; handles `tabActivated` from background |
| `renderer.js` | **Pure DOM renderer** — `countOpen`, `matchesSearch`, `renderTabRow`, `buildSidebarTree`; rows are draggable; contextmenu + mouseenter/leave listeners |
| `storage.js` | Storage layer — `window.AppStorage`; all localStorage/sessionStorage access and key names live here |
| `browserApi.js` | Browser API layer — `window.BrowserApi`; all `chrome.tabs.*` / `chrome.windows.*` calls live here |
| `crudApi.js` | Data layer — `window.localRoot` tree + `window.data` map; CRUD + `moveTab` + `deleteWindowTabs` |
| `helperFunctions.js` | `traverse`, `wrapText`, `visualLength` |
| `savedTrees.js` | localStorage-based tree snapshots — `saveTree`, `getSavedTrees`, `fetchTree` |
| `lib/` | Vendored JS: `fnon.min.js` |

**Global state (set on `window`):**
- `window.localRoot` — root node of the tab tree (`{id, title, children, …}`)
- `window.data` — flat `{[tabId]: tabObj}` map, kept in sync with localRoot
- `window.tabWidth` (200) — used by `wrapText` for line-break limits

---

## Testing approach

The source files execute Chrome code on load and export nothing, so `require()` doesn't work.

**Pattern:** `eval(fs.readFileSync('src.js', 'utf8'))` at the **top level** of each test file (not
inside `beforeAll`). In Node.js sloppy mode, `function` declarations inside `eval` hoist into the
enclosing module-wrapper scope and become callable from every test.

**Eval order matters in `crudApi.test.js`:**
1. `helperFunctions.js` — provides `wrapText` / `traverse` used by crudApi
2. `storage.js` — defines `window.AppStorage` (real implementation, not the setup.js stub)
3. `crudApi.js` — provides `updateTab`, `addNewTab`, `removeSubtree`, `localRootToData`

**Eval order matters in `renderer.test.js`:**
1. `helperFunctions.js` — provides `traverse` / `wrapText`
2. `storage.js` — defines `window.AppStorage`
3. `crudApi.js` — defines `window.localRoot`, `window.data`
4. `renderer.js` — provides `countOpen`, `matchesSearch`, `renderTabRow`, `buildSidebarTree`

**`let`-declared top-level vars** (e.g. `let isCurrent = true` in crudApi.js) are scoped to the
eval block and cannot be overridden from tests. Tests run with the defaults (`isCurrent = true`).

**State reset in `beforeEach`:** reassign `window.localRoot` and `window.data` directly; the
functions resolve them via the global scope so they pick up the new objects.

**`localStore` (defined in crudApi.js):** eval overrides the setup mock. To assert it ran, spy on
`Storage.prototype.setItem`.

**`visualLength`:** jsdom returns `offsetWidth = 0` for all elements. `wrapText` still produces a
valid 4-element array — all text lands on line 0.

### Mocks (tests/setup.js)
- `global.chrome` — MV3 stubs for tabs, windows, action, runtime, sidePanel
- `global.d3` — empty object (prevents ReferenceError)
- `global.Fnon` — stub for toast/dialog library
- `global.AppStorage` — stub with `jest.fn()` methods (session, savedTrees, windowNames); overridden by `eval(storage.js)` in crudApi/renderer tests
- `global.BrowserApi` — stub with `jest.fn()` methods for all Chrome tab/window calls
- `global.updateTree`, `global.initializeTree`, `global.drawTree` — `jest.fn()`
- `global.tabWidth = 200`, `global.innerWidth = 1280`, `global.innerHeight = 720`
- `<span id="ruler">` injected into jsdom body

---

## What the tests cover

### crudApi.test.js (9 tests)

| Test | Bug fix verified |
|---|---|
| `updateTab` missing tabId → no throw | Null guard (Fix 6b) |
| `updateTab` title/favIcon → calls `updateTree(window.localRoot)` | `localRoot` → `window.localRoot` (Fix 6c) |
| `updateTab` non-display field → no `updateTree` call | Regression |
| `addNewTab` no opener → pushed to `window.localRoot.children` | Regression |
| `addNewTab` with opener → pushed to parent's children | Regression |
| `removeSubtree` → removes tab + descendants from data, splices parent | Regression |
| `localRootToData` → traverses `window.localRoot.children` | Typo fix (Fix 6a) |
| `traverse` null/leaf/tree | Core utility |
| `wrapText` empty / short input | Core utility |

### renderer.test.js (29 tests)

| Group | What's tested |
|---|---|
| `countOpen` | Empty list; flat list with deleted tabs; recursive children |
| `matchesSearch` | Empty query; title match; descendant match bubbles up; no match |
| `renderTabRow` — structure | `.tab-row` appended; title text; `.toggle` present; `.clickable` for parents; `.favicon` with letter or `<img>` |
| `renderTabRow` — state classes | `.is-active` / `.is-closed` from `tab.active` / `tab.deleted` |
| `renderTabRow` — tree lines | depth=0 no lines; depth=1 has `.seg.branch`; depth=2 has ancestor + branch |
| `renderTabRow` — children | Renders into same container; respects `collapsedTabs`; respects `showClosed`; filters by search query |
| `buildSidebarTree` | `.win-label` per window; tab count; `windowNames` map used for label text |

## What cannot be unit tested (requires live browser)

- Service worker ↔ side panel message passing (`sendToUI` / `chrome.runtime.onMessage`)
- Tab focus / close via `BrowserApi.focusTab` / `BrowserApi.removeTab`
- Window-name rename persistence (double-click / right-click → Rename Window)
- Drag-and-drop reordering (DOM drag events)
- Close panel button / keyboard shortcut (`chrome.sidePanel.setOptions`)
- Active tab highlighting updating in real time on tab switch

---

## Key conventions

- **No `window.` prefix** in most crudApi functions (uses bare `localRoot`, `data`). This is
  intentional — they rely on the global scope. `updateTab` is the exception: it was fixed to use
  `window.localRoot` explicitly so tests can assert the correct reference.
- Tab nodes: `{id, title, customTitle?, parentId, children[], lines[], url, pendingUrl, favIconUrl, windowId,
  toggle, deleted, active, read, x0, y0}`
- `deleted: true` = closed/removed tab (soft-delete kept in tree for "N closed tabs" display)
- `active: true` = currently active tab; set by `loadWindowList` from Chrome and updated on `tabActivated` messages
- `customTitle` = optional user-set display name (right-click → Rename Tab); renderer prefers it over `title`
- `wrapText` splits on `/(?=[\s\\/%,\.])/` and fills up to 4 lines; line 0-1 use 50% of tabWidth,
  lines 2-3 use 70%.
- `traverse(parent, traverseFn, childrenFn)` — `childrenFn` returning `null`/falsy stops that branch.
- `AppStorage.windowNames` — key `'windowNames'`; `{[windowId]: string}` map for custom window labels
