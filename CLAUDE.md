# Nonlinear-Browser — Claude Code guide

Chrome Extension (Manifest V3) that visualises browser tabs as an interactive D3 tree.
No build system. No bundler. No module format. Plain script tags loaded by the browser.
Third-party JS (D3, fnon, jQuery) is vendored into `lib/` — MV3 prohibits remote scripts.

---

## Running tests

```bash
npm install        # first time only
npm test           # Jest 29
```

23 tests across 2 suites, runtime ~1 s.

---

## Architecture

| File | Role |
|---|---|
| `manifest.json` | MV3 manifest; service worker = `background.js`, UI page = `tabs_api.html` |
| `background.js` | **MV3 service worker** — handles `chrome.action.onClicked`, startup, and forwards tab events to the UI page via `chrome.tabs.sendMessage` |
| `tabs_api.js` | Bootstraps the UI; receives tab events from the service worker via `chrome.runtime.onMessage` and drives the tree |
| `close.js` | UI page unload handler — clears badge via `chrome.action`, saves session timestamp |
| `crudApi.js` | Data layer — `window.localRoot` tree + `window.data` map; CRUD functions |
| `helperFunctions.js` | `traverse`, `wrapText`, `visualLength` |
| `visualize.js` | D3 rendering — `drawTree`, `updateTree`, `initializeTree`; also owns `floaterActive` drag glow |
| `context_menu.js` | Right-click context menu |
| `savedTrees.js` | localStorage-based tree snapshots — `saveTree`, `getSavedTrees`, `fetchTree` |
| `lib/` | Vendored JS: `d3.v6.min.js`, `fnon.min.js`, `jquery-3.5.1.min.js` |

**Global state (set on `window`):**
- `window.localRoot` — root node of the tab tree (`{id, title, children, …}`)
- `window.data` — flat `{[tabId]: tabObj}` map, kept in sync with localRoot
- `window.tabWidth` (200), `window.fontSize` (16), `window.currentRoot` — layout constants

---

## Testing approach

The source files execute D3/Chrome code on load and export nothing, so `require()` doesn't work.

**Pattern:** `eval(fs.readFileSync('src.js', 'utf8'))` at the **top level** of each test file (not
inside `beforeAll`). In Node.js sloppy mode, `function` declarations inside `eval` hoist into the
enclosing module-wrapper scope and become callable from every test.

**Eval order matters in `crudApi.test.js`:**
1. `helperFunctions.js` — provides `wrapText` / `traverse` used by crudApi
2. `crudApi.js` — provides `updateTab`, `addNewTab`, `removeSubtree`, `localRootToData`

**`let`-declared top-level vars** (e.g. `let isCurrent = true` in crudApi.js) are scoped to the
eval block and cannot be overridden from tests. Tests run with the defaults (`isCurrent = true`).

**State reset in `beforeEach`:** reassign `window.localRoot` and `window.data` directly; the
functions resolve them via the global scope so they pick up the new objects.

**`localStore` (defined in crudApi.js):** eval overrides the setup mock. To assert it ran, spy on
`Storage.prototype.setItem`.

**`visualLength`:** jsdom returns `offsetWidth = 0` for all elements. `wrapText` still produces a
valid 4-element array — all text lands on line 0.

### Mocks (tests/setup.js)
- `global.chrome` — MV3 stubs for tabs, windows, action, runtime (replaces old browserAction/extension stubs)
- `global.d3` — empty object (prevents ReferenceError)
- `global.Fnon` — stub for toast/dialog library
- `global.updateTree`, `global.initializeTree`, `global.drawTree` — `jest.fn()`
- `global.tabWidth = 200`, `global.innerWidth = 1280`, `global.innerHeight = 720`
- `<span id="ruler">` injected into jsdom body

---

## What the tests cover

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

## What cannot be unit tested (requires live browser)

- `floaterActive` flag stopping the drag-glow animation
- `.interrupt()` calls stopping in-flight D3 transitions
- Service worker ↔ UI message passing (`sendToUI` / `chrome.runtime.onMessage`)
- `removeEventListener` for `click.contextMenu`

See `FIXES.md` for the full fix plan and remaining work.

---

## Key conventions

- **No `window.` prefix** in most crudApi functions (uses bare `localRoot`, `data`). This is
  intentional — they rely on the global scope. `updateTab` is the exception: it was fixed to use
  `window.localRoot` explicitly so tests can assert the correct reference.
- Tab nodes: `{id, title, parentId, children[], lines[], url, pendingUrl, favIconUrl, windowId,
  toggle, deleted, read, x0, y0}`
- `wrapText` splits on `/(?=[\s\\/%,\.])/` and fills up to 4 lines; line 0-1 use 50% of tabWidth,
  lines 2-3 use 70%.
- `traverse(parent, traverseFn, childrenFn)` — `childrenFn` returning `null`/falsy stops that branch.
