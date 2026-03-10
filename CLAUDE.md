# Nonlinear-Browser — Claude Code guide

Chrome Extension (Manifest V3) that shows browser tabs as a compact indented list in a Chrome Side Panel.
No build system. No bundler. No module format. Plain script tags loaded by the browser.
No third-party JS — fnon was removed; all toast UI uses inline `showToast`/`showCloseToast`.

**Why no build system?** Chrome extensions load files directly from disk — no web server, no HTTP requests for JS files, so there's no network latency to optimize away. Chrome supports modern JS natively, so transpilation isn't needed either. A bundler would add complexity (MV3 service workers have quirks with `import()`) for no real benefit at this scale.

**Brave browser note:** The extension works in Brave (uses the standard `side_panel` API). However, Brave's sidebar "add to sidebar" UI only surfaces Chrome Web Store extensions — locally-loaded unpacked extensions won't appear in that list. Publishing to the CWS would make it show up there automatically (manifest is already set up correctly).

---

## Dev workflow

Edit a source file, then reload the extension at `chrome://extensions` (click the ↺ reload button next to the extension). There is no auto-reload — see "Why no build system?" above for why the CDP-based auto-reload approach isn't worth adding here.

Keep `chrome://extensions` pinned as a tab while developing. After reloading, re-open the side panel if it was already open.

---

## Running tests

```bash
npm install        # first time only
npm test           # Jest 29
```

85 tests across 3 suites, runtime ~2 s.

---

## Architecture

| File | Role |
|---|---|
| `manifest.json` | MV3 manifest; service worker = `background.js`, side panel = `sidepanel.html`; `_execute_action` command for `Ctrl+Shift+Y`; `focus-pin-1/2/3` commands for `Ctrl+Shift+1/2/3` (global pin shortcuts; Chrome limit = 4 total); permissions include `bookmarks`, `processes`, `alarms`; `host_permissions` includes `file:///*` (required for Chrome to consider granting file URL access; user must still enable "Allow access to file URLs" toggle at `chrome://extensions`) |
| `background.js` | **MV3 service worker** — `setPanelBehavior`; **`chrome.alarms.create('keepalive', { periodInMinutes: 0.4 })`** keeps the SW alive to prevent side-panel blank-screen on cold-start; forwards tab events + `tabActivated` + `tabAttached`; handles `closePanel` message via `setOptions` toggle; `chrome.commands.onCommand` forwards `focus-pin-N` commands to sidepanel as `{ type: 'focusPin', slot }` |
| `sidepanel.html` | Side panel HTML shell — header (`nonlinear browser` title, `☐` select-mode btn, `—` close btn), pinned strip (`#pinSlots`), search bar, **`#fileAccessBanner`** (amber warning strip; shown when `chrome.extension.isAllowedFileSchemeAccess()` returns false; dismissible), skeleton loader (`#skeleton`), tree div (`#tree`, initially hidden), selection bar (`#selectionBar`), footer (URL bar only); all feature CSS including `.win-label.is-active-space`; `#ctxMenu`, `#winCtxMenu`, `#pinCtxMenu` context menus; all `<script>` tags use `defer` so HTML (including skeleton) paints before scripts run |
| `sidepanel.js` | Bootstraps the panel; `sidebarState` with drag/audio/window-drop/suspend/resume/newTab/select callbacks; multi-select state (`selectedTabIds`, `selectMode`, `lastSelectedId`); `clearSelection`, `rangeSelectTo`, `_applySelectionUpdate`, `updateSelectionBar` helpers; **group drag** (`onDragStart` marks all selected rows `.dragging`; `onDrop`/`onWindowDrop` call `moveMultipleTabs` when dragged tab is in selection); `renderPins` (hash bail-out + pin drag-to-reorder; hash includes live `favIconUrl` from `window.data`); `_firstRender` skeleton swap; `_applyActiveTab` targeted DOM update (**also updates `.is-active-space` on win-label**); RAM polling via `_pollMemory`; `tabMemory` map on sidebarState; undo-close + Ctrl+Z; collapse/expand tabs + **collapse/expand spaces** (`collapsedWindows` Set + `onToggleWindow`); `showUrlInFooter`; `pendingResume` (**FIFO queue** `{[url]: tabNode[]}` — multiple suspended tabs at same URL each get their own slot; `shift()` on consume); `pendingPinOpen` (**FIFO queue** `{[url]: pinIndex[]}` — same rationale); **file access banner** (`chrome.extension.isAllowedFileSchemeAccess()` checked at init; shows `#fileAccessBanner` if false; dismissed by `#fileAccessDismiss` button); `_closingByExtension` set; `pinnedTabIds` Set on sidebarState; handles `focusPin` message (routes Ctrl+Shift+1-3 global shortcuts to the correct pin slot); handles `tabAttached` message (updates `windowId` on tab node when Chrome native drag moves tab between windows); **`showToast(message)`** (inline 2.5s toast for non-close notifications — pin-full, bookmarked, undo-restored; reuses `#toastWrap`/`#toastText` but hides kbd-hint and progress bar); **`showCloseToast(count)`** (close toast with Ctrl+Z hint and animated progress bar) |
| `renderer.js` | **Pure DOM renderer** — `countOpen`, `matchesSearch` (title + url + customTitle), `renderTabRow`, `buildSidebarTree`; `_faviconImgCache` (reuses `<img>` elements across rebuilds, eliminates flicker); `_makeNewTabRow` (+ New tab ghost row); guide-rail indent hierarchy (`.indent-wrap`); scrolling title animation on hover; RAM badge (`.tab-ram-badge`); audio 🔊/🔇 button; 🗑 close icon; `.tab-check` selection indicator; `is-selected` class; window-label drag targets; **space collapse** (click label toggles `.collapsed`; CSS rotates chevron); default label sequential `"Space N"` (render order, 1-based); **active space** (`_hasActiveTab` checks recursively; win-label gets `.is-active-space` when it contains the active tab) |
| `storage.js` | Storage layer — `window.AppStorage`; all localStorage/sessionStorage access and key names live here |
| `browserApi.js` | Browser API layer — `window.BrowserApi`; all `chrome.tabs.*` / `chrome.windows.*` / `chrome.bookmarks.*` / `chrome.processes.*` calls; `createTab(url, windowId?)` accepts optional windowId; `moveTab(tabId, windowId)` moves tab via `chrome.tabs.move(tabId, { windowId, index: -1 })` |
| `crudApi.js` | Data layer — `window.localRoot` tree + `window.data` map; CRUD + `moveTab` + `moveMultipleTabs` + `moveTabToWindow` + `updateTabWindowId` + `deleteWindowTabs`; new tabs inserted with `unshift` (newest-first); `dataToLocalRoot` resets all `children` arrays before rebuild (prevents double-insertion), sorts children by descending ID, promotes orphaned tabs (missing parent) to root; `loadWindowList` tracks seen tab IDs and marks unseen non-suspended tabs `deleted:true` (clears stale ghost tabs after session restore), syncs `windowId`/`audible`/`muted` for existing tabs |
| `helperFunctions.js` | `traverse`, `wrapText`, `visualLength` |
| `lib/` | Vendored JS: *(empty — fnon removed, d3 deleted)* |

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
- `global.chrome` — MV3 stubs for tabs, windows, action, runtime, sidePanel, bookmarks, **processes**; `chrome.tabs.move` stub added for cross-window drag tests
- `global.d3` — empty object (prevents ReferenceError)
- `global.Fnon` — stub kept for safety (fnon removed from production; stub prevents ReferenceError if any stale reference exists)
- `global.AppStorage` — stub with `jest.fn()` methods (session, savedTrees, windowNames, pinnedTabs); overridden by `eval(storage.js)` in crudApi/renderer tests
- `global.BrowserApi` — stub with `jest.fn()` methods for all Chrome tab/window calls + muteTab, bookmarkTab, **getProcessInfo**, **moveTab**
- `global.updateTree`, `global.initializeTree`, `global.drawTree` — `jest.fn()`
- `global.tabWidth = 200`, `global.innerWidth = 1280`, `global.innerHeight = 720`
- `<span id="ruler">` injected into jsdom body

---

## What the tests cover

### crudApi.test.js (33 tests)

| Group | What's verified |
|---|---|
| `updateTab` | Missing tabId no-throw; title/favIcon/audible triggers `updateTree`; non-display field does not |
| `addNewTab` | No opener → root; `chrome://newtab/` → root; opener → parent; audible/muted init false |
| `removeSubtree` | Removes tab + descendants from data; splices parent; calls `updateTree` + `localStore` |
| `localRootToData` | Traverses `window.localRoot.children` (regression fix) |
| `dataToLocalRoot` | Top-level tab pushed to root; child nested under valid parent; orphaned parent promoted to root (no crash) |
| `moveTabToWindow` | Moves tab + updates windowId; recursively updates descendants; noop if same window; calls `BrowserApi.moveTab` on cross-window; does not call on same-window |
| `moveTab — cross-window` | Updates windowId on tab + children; calls `BrowserApi.moveTab` on cross-window; does not call on same-window |
| `checkLastSession` | No dialog when no session; no dialog when session exists (silent merge) |
| `BrowserApi.moveTab` | Delegates to `chrome.tabs.move(tabId, { windowId, index: -1 })` |

### renderer.test.js (45 tests)

| Group | What's tested |
|---|---|
| `countOpen` | Empty list; flat list with deleted tabs; recursive children; `isSpace:true` tabs counted; deleted parent with live children returns 0 |
| `matchesSearch` | Empty query; title match; url match; customTitle match; descendant match bubbles up; no match; `isSpace:true` tab matched by title |
| `renderTabRow` — structure | `.tab-row` appended; title text; `.toggle` present; `.clickable` for parents; `.favicon` with letter or `<img>` |
| `renderTabRow` — state classes | `.is-active` / `.is-closed` from `tab.active` / `tab.deleted` |
| `renderTabRow` — indent-wrap | depth=0 no padding/border; depth=1 10px paddingLeft + 1px borderLeft + 2px marginLeft; depth=2 20px paddingLeft + 12px marginLeft |
| `renderTabRow` — children | Renders into same container; respects `collapsedTabs`; respects `showClosed`; filters by search query |
| `renderTabRow` — audio indicator | `.tab-audio` always present; `🔊`/`is-audible` when audible; `🔇`/`is-muted` when muted; click fires `state.onMute` |
| `renderTabRow` — RAM badge | Badge shown when `tabMemory[id] >= 150`; omitted when `< 150` or `null` |
| `buildSidebarTree` | `.win-label` per window; tab count; `windowNames` map; `.new-tab-row` per window; default label sequential `"Space N"` (not windowId-based); contextmenu on each label fires with that label's own windowId; click label toggles `collapsedWindows` via `state.onToggleWindow` |

## What cannot be unit tested (requires live browser)

- Service worker ↔ side panel message passing (`sendToUI` / `chrome.runtime.onMessage`)
- Tab focus / close via `BrowserApi.focusTab` / `BrowserApi.removeTab`
- Space-name rename persistence (double-click / right-click → Rename Space)
- Drag-and-drop reordering (DOM drag events), including **group drag** (multi-select + drag moves all selected tabs together)
- Cross-window drag (drag tab onto window label → `moveTabToWindow` / `moveMultipleTabs`)
- Close panel button / keyboard shortcut (`chrome.sidePanel.setOptions`)
- Active tab highlighting updating in real time on tab switch (`_applyActiveTab` DOM mutations)
- Audio mute/unmute (`BrowserApi.muteTab` round-trip)
- Pinned tabs strip (drag-to-pin, pin drag-to-reorder, click-to-focus, right-click → Unpin)
- Bookmark tab (`BrowserApi.bookmarkTab` → Chrome bookmarks bar)
- Undo close (Ctrl+Z restores soft-deleted tabs; clicking re-opens via `createTab`)
- Suspend / resume (`BrowserApi.removeTab` + `pendingResume` reuse; `tabRemoved` guard for suspended tabs)
- RAM polling (`_pollMemory` → `chrome.processes.getProcessInfo`; live badge updates)
- Skeleton loader swap (requires real DOMContentLoaded + first `renderAll` call)
- Scrolling title animation (requires real `scrollWidth` / `clientWidth` — jsdom returns 0 for both)
- New-tab row click (requires `BrowserApi.createTab` round-trip to produce a `tabCreated` event)
- Multi-select (Ctrl+Click, Shift+Click range, select-mode toggle, selection bar actions)

---

## Key conventions

- **No `window.` prefix** in most crudApi functions (uses bare `localRoot`, `data`). This is
  intentional — they rely on the global scope. `updateTab` is the exception: it was fixed to use
  `window.localRoot` explicitly so tests can assert the correct reference.
- Tab nodes: `{id, title, customTitle?, parentId, children[], lines[], url, pendingUrl, favIconUrl, windowId,
  toggle, deleted, active, audible, muted, suspended, read, x0, y0}`
- `deleted: true` = closed/removed tab (soft-delete kept in tree for "N closed tabs" display)
- `active: true` = currently active tab; set by `loadWindowList` from Chrome and updated on `tabActivated` messages
- `audible: true` = tab is producing sound; `muted: true` = tab is muted; toggled via audio button (🔊/🔇)
- `suspended: true` = tab removed from Chrome to free RAM; ghost row stays in tree. Suspending a parent cascades to all children. Resuming is always per-tab (click the ghost row or right-click → Resume Tab). Closing a suspended tab soft-deletes it directly (`deleted = true`) — no `BrowserApi.removeTab` call since the tab is already gone from Chrome.
- `customTitle` = optional user-set display name (right-click → Rename Tab); renderer prefers it over `title`
- `wrapText` splits on `/(?=[\s\\/%,\.])/` and fills up to 4 lines; line 0-1 use 50% of tabWidth,
  lines 2-3 use 70%.
- `traverse(parent, traverseFn, childrenFn)` — `childrenFn` returning `null`/falsy stops that branch.
- `AppStorage.windowNames` — key `'windowNames'`; `{[windowId]: string}` map for custom window labels
- `AppStorage.pinnedTabs` — key `'pinnedTabs'`; array of 10 `{url, title, favIconUrl, tabId} | null` entries
- `sidebarState._draggingWindowId` — tracks the source windowId during a drag; used by window-label `dragover` to allow cross-window drops
- `closedGroupStack` (sidepanel.js) — undo stack; each entry is `{ids: [tabId, ...]}` for a closed subtree; Ctrl+Z pops and un-deletes
- `pendingResume` (sidepanel.js) — `{[url]: tabNode[]}` **FIFO queue**; populated by `onResume` (`push`) before calling `createTab(url)`; consumed by `tabCreated` handler (`shift`) to reuse the existing tree node (preserving position) instead of inserting a duplicate. Queue (not map) so multiple suspended tabs at the same URL each get correctly matched in FIFO order.
- `pendingPinOpen` (sidepanel.js) — `{[url]: pinIndex[]}` **FIFO queue**; populated when clicking a dead pin slot (`push`); consumed in `tabCreated` (`shift`) to reconnect the new tab to its pin slot. Queue prevents collision when multiple pins share the same URL.
- `_lastPinsState` (sidepanel.js) — serialized snapshot of pin slot state; `renderPins()` bails out early when unchanged to prevent favicon `<img>` elements from being recreated on every `renderAll()` call (fixes flicker on tabs that have slow/no-cache favicons). Hash includes live `favIconUrl` from `window.data[tabId]` (not just the stored value) so dynamic favicon changes (e.g. Toggl timer icon) are detected.
- `_pinDragSrc` (sidepanel.js) — index of the pin slot currently being dragged (`null` = it's a tab drag, not a pin drag). Used to distinguish pin-to-pin reorder from tab-to-pin drop in the same drag/drop handlers.
- `_firstRender` (sidepanel.js) — boolean; `renderAll()` hides `#skeleton` and shows `#tree` on the first call, then clears the flag. `#tree` starts hidden via inline `style="display:none"`.
- **Side panel cold-start latency** — Chrome blocks first paint of side panel pages until all resources are loaded. Mitigations applied: all `<script>` tags have `defer` (skeleton paints before scripts run); `chrome.alarms.create('keepalive', { periodInMinutes: 0.4 })` in `background.js` fires every ~24s to prevent the MV3 service worker from going idle (SW cold-start was the main cause of 10–15s blank panels).
- `_applyActiveTab(tabId)` (sidepanel.js) — targeted DOM update: traverses data model to clear/set `.active`, then queries the live DOM to move `.is-active`/`.active-bar` without a full tree rebuild; also moves `.is-active-space` to the win-label of the newly active tab's window. Called from `onActivate` and the `tabActivated` message handler.
- **`tabAttached` message** — fired by `background.js` `chrome.tabs.onAttached` listener when a tab is dragged between Chrome windows via native Chrome UI; `sidepanel.js` updates `tab.windowId` in `window.data` and calls `renderAll()` so the tab appears under the correct space immediately.
- **Active space highlight** — `.win-label.is-active-space` (blue name + count badge + separator line) marks the space containing the active tab. Set during full renders by `_hasActiveTab()` in renderer.js; updated targeted by `_applyActiveTab()` in sidepanel.js.
- **Ctrl+Shift+1-3 global pin shortcuts** — registered as extension commands in manifest.json (`focus-pin-1/2/3`); Chrome limit is 4 total (1 used by `_execute_action`). background.js `chrome.commands.onCommand` forwards them as `{ type: 'focusPin', slot }` via `sendToUI`; sidepanel.js `focusPin` handler focuses the tab (or creates it via `pendingPinOpen` if dead). Slots 4-10 can be configured manually at `chrome://extensions/shortcuts`.
- `tabMemory` (sidepanel.js) — `{[tabId]: number}` map of MB usage; set on `sidebarState.tabMemory`; populated by `_pollMemory()` every 8s via `chrome.processes.getProcessInfo`; read by `renderer.js` to render RAM badges.
- `_faviconImgCache` (renderer.js IIFE scope) — `{[tabId]: {src, el}}` map; `buildSidebarTree` saves existing `<img>` elements before clearing the container; `renderTabRow` reuses them when the src matches, preventing re-fetch/flicker on full rebuilds.
- `_makeNewTabRow(windowId, state)` (renderer.js) — builds the `+  New tab` ghost row; calls `state.onNewTab(windowId)` on click (guarded with `if (state.onNewTab)`).
- `_closingByExtension` (sidepanel.js) — `Set<tabId>`; populated by `onClose` before calling `BrowserApi.removeTab`; consumed by `tabRemoved` handler to distinguish extension-initiated closes (skip re-parent) from external closes (re-parent live children to grandparent).
- `pinnedTabIds` (sidebarState, sidepanel.js) — `Set<tabId>` of currently-open pinned tab IDs; recomputed in `renderAll` from `pinnedTabs`; passed to `renderTabRow` which skips the row but still renders children at the same depth level (so pinned tabs don't appear twice in the tree). Unpin calls `renderAll()` (not just `renderPins()`) so `pinnedTabIds` is recomputed and the tab reappears in the tree.
- `collapsedWindows` (sidebarState, sidepanel.js) — `Set<windowId>` of collapsed spaces; toggled by `onToggleWindow(windowId)`; read by `buildSidebarTree` to skip rendering new-tab-row + tab rows for that window; win-label gets `.collapsed` class which CSS uses to rotate the chevron.
- **Guide-rail hierarchy** (renderer.js) — `.indent-wrap` div with `paddingLeft: depth*10px` + `borderLeft: 1px solid #e8e8e8` replaces the old `.seg.branch`/`.seg.vert` tree-line elements. Each level costs 10px instead of 16px. The 1px left border is the visual spine.
- **Scrolling title** (renderer.js) — on `mouseenter`, `requestAnimationFrame` measures `titleEl.scrollWidth - titleWrap.clientWidth`; if overflow > 2px, sets `--scroll-px` and `--scroll-dur` CSS vars and adds `.scrolling` class which runs a `title-scroll` keyframe animation. On `mouseleave`, class is removed. The title's parent (`.tab-title-wrap`) clips overflow; the title element itself has no `text-overflow`.
- `showCtxMenu` (sidepanel.js) — updates context menu item visibility before showing: hides/shows Suspend vs Resume based on `tab.suspended`; changes label to "Suspend Branch" when tab has children; shows `#ctxCloseSelected` ("Close N selected tabs") when `selectedTabIds.size > 1` and the right-clicked tab is in the selection (hides `#ctxClose` in that case).
- Context menu helpers: `showCtxMenu`, `hideCtxMenu`, `showWinCtxMenu`, `hideWinCtxMenu`, `hidePinCtxMenu` — all module-level in sidepanel.js
- **Rename bug:** `hideCtxMenu()` nulls `ctxTab`. Always capture `var tab = ctxTab` before calling `hideCtxMenu()` in any context menu handler that needs the tab reference afterward.
- **Window contextmenu closure pattern** — `buildSidebarTree` attaches contextmenu listeners using `e.currentTarget.dataset.windowId` (read at dispatch time) instead of a closed-over `var windowId` (which always resolves to the last iteration's value after the loop). Always use `dataset` for event-listener values that vary per element in a loop.
- **`dataToLocalRoot` null guard** — if `tabObj.parentId` points to a node not in `data`, the tab is promoted to root (`tabObj.parentId = ''`). Prevents crash on stale/orphaned parentIds (e.g. after clearing localStorage between versions).
- **`countOpen` semantics** — only recurses into children when the parent is non-deleted. A deleted parent's children are considered invisible, so they don't inflate the badge count.
- **`BrowserApi.moveTab`** — `moveTab(tabId, windowId)` calls `chrome.tabs.move(tabId, { windowId, index: -1 })`. Called by `moveTab`, `moveMultipleTabs`, and `moveTabToWindow` in crudApi when the target window differs, so tabs physically move in Chrome.
- `moveMultipleTabs(ids, targetId, position)` (crudApi.js) — batch group drag; strips any tab whose ancestor is also in the selection (avoids double-moves); sorts remaining tabs by current tree order; batch-removes all, then inserts them as a block at the target position. Called from `onDrop`/`onWindowDrop` in sidepanel.js when the dragged tab is part of `selectedTabIds`.
- `selectedTabIds` (sidepanel.js) — `Set<tabId>` of currently selected tabs; set on `sidebarState.selectedTabIds` so renderer reads it live. `clearSelection()` clears state + removes `.is-selected` from DOM. `onActivate`/`onResume` always call `clearSelection()`.
- `selectMode` (sidepanel.js) — boolean; when true, single clicks call `onSelect` instead of activating. Toggled by `#selectToggle` button; adds `body.select-mode` class. Escape exits select mode.
- `lastSelectedId` (sidepanel.js) — anchor for Shift+Click range selection via `rangeSelectTo(toId)`.
- `sidebarState.onSelect(id, event)` — handles Ctrl/Meta click (toggle), Shift click (`rangeSelectTo`), and select-mode single click.
- `_applySelectionUpdate(id)` (sidepanel.js) — targeted DOM update (no full rebuild): toggles `.is-selected` and updates `.tab-check` text on one row.
- `updateSelectionBar()` (sidepanel.js) — shows/hides `#selectionBar` and updates `#selCount` text based on `selectedTabIds.size`.
- `.tab-check` (renderer.js) — first child of `.tab-inner` on every tab row; shows ○/● for unselected/selected; hidden by default, visible via `body.select-mode` or `.is-selected`.
