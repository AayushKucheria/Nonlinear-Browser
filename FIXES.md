# Nonlinear Browser — Fix Plan

Audit date: 2026-02-21. Issues grouped by phase; tackle in order since Phase 1 is a prerequisite for several things in later phases.

---

## Phase 1 — Manifest V3 Migration ✅ DONE

Chrome 139 removes MV2 support entirely. This is the highest-priority work and touches several files.

### 1.1 `manifest.json`
- [x] Change `"manifest_version": 2` → `3`
- [x] Replace `"browser_action"` key → `"action"`
- [x] Replace `"background": { "persistent": false, "page": "tabs_api.html" }` → `"background": { "service_worker": "background.js" }`
- [x] Remove `"unsafe-eval"` from `content_security_policy` (banned in MV3)
- [x] Fix CSP format — MV3 uses an object, not a string:
  ```json
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
  ```
- [x] Remove CSS URLs from `script-src` (Font Awesome CSS was incorrectly listed there)
- [ ] Fill in real values: `"client_id"` (currently `"todo.apps.googleusercontent.com"`) and `"key"` (currently `"todo"`) — needs real Firebase project

### 1.2 `background.js` — rewritten as MV3 service worker
- [x] `chrome.browserAction.onClicked` → `chrome.action.onClicked`
- [x] `chrome.browserAction.setBadgeBackgroundColor` → `chrome.action.setBadgeBackgroundColor`
- [x] `chrome.browserAction.setBadgeText` → `chrome.action.setBadgeText`
- [x] `chrome.extension.getURL(...)` → `chrome.runtime.getURL(...)`
- [x] `chrome.tabs.create({"url": 'tabs_api.html'})` → `chrome.tabs.create({url: chrome.runtime.getURL('tabs_api.html')})`
- [x] Removed `window.*` references (service worker has no persistent window)
- [x] Added tab event listeners that forward to UI via `sendToUI()` / `chrome.tabs.sendMessage`

### 1.3 `close.js`
- [x] `chrome.browserAction.setBadgeText` → `chrome.action.setBadgeText`
- [x] Session timestamp (`sessionStorage.setItem('time', ...)`) moved here from old background page's `beforeunload`

### 1.4 `tabs_api.js`
- [x] `chrome.extension.getURL('tabs_api.html')` → `chrome.runtime.getURL('tabs_api.html')`

### 1.5 Architecture: background page → service worker
- [x] `background.js` is now the service worker (event listeners, badge management, message forwarding)
- [x] `tabs_api.html` is now a standalone extension page opened by clicking the action icon
- [x] Tab event listeners moved to service worker; UI receives them via `chrome.runtime.onMessage`
- [x] `window.*` state stays in the UI page (`tabs_api.html`); `localStorage` handles persistence (unchanged)
- [x] `<script src="background.js">` removed from `tabs_api.html`

### 1.6 Vendor all external scripts into `lib/` (MV3 blocks remote scripts in CSP)
- [x] `lib/d3.v6.min.js` (was `https://d3js.org/d3.v6.min.js`)
- [x] `lib/firebase-app.js`, `lib/firebase-auth.js`, `lib/firebase-database.js` (were gstatic CDN)
- [x] `lib/firebase-ui-auth.js` (was gstatic CDN)
- [x] `lib/fnon.min.js` + `lib/fnon.min.css` (were `node_modules/fnon/` which was deleted)
- [x] `lib/jquery-3.5.1.min.js` (was code.jquery.com, used in `authUI.html`)
- [x] Removed Appzi feedback widget `<script>` (non-core, was remote)
- [x] Updated `tabs_api.html` and `authUI.html` to reference `lib/` paths

---

## Phase 2 — Firebase / Auth (Critical, currently non-functional)

### 2.1 Fill in real Firebase config
- [ ] Create a Firebase project (or reuse existing) and get the real `firebaseConfig` object
- [ ] Replace the empty `firebaseConfig = {}` in `firebase.js` with real values
- [ ] Store secrets appropriately (not hardcoded if this goes public)

### 2.2 Fix hardcoded placeholder client ID
- [ ] `firebase.js:43` — `clientId: 'yooo.apps.googleusercontent.com'` → real OAuth client ID

### 2.3 Upgrade Firebase SDK (8.2.2 → v11 modular)
- [ ] Replace vendored Firebase 8.x files in `lib/` with modular SDK imports
- [ ] Rewrite `firebase.js` using the modular API (`import { initializeApp } from 'firebase/app'` etc.)
  - `firebase.initializeApp(config)` → `initializeApp(config)`
  - `firebase.auth()` → `getAuth(app)`
  - `firebase.database()` → `getDatabase(app)`
  - `firebase.auth().onAuthStateChanged(...)` → `onAuthStateChanged(auth, ...)`
  - `firebase.auth().signOut()` → `signOut(auth)`
- [ ] Upgrade FirebaseUI from 4.6.1 to current (6.x) or replace with custom sign-in UI (FirebaseUI has had slow updates)
- [ ] Note: modular SDK requires a bundler (Rollup/Vite/esbuild). This is a good time to add a minimal build step.

### 2.4 Fix swapped delete/rename icons in `firebase.js`
- [ ] `icon1` has `fa-pencil-square-o` class but runs delete logic — swap the actions or swap the icon classes
- [ ] `icon2` has `fa-trash-o` class but runs rename logic — same

---

## Phase 3 — Bug Fixes ✅ DONE

### 3.1 `context_menu.js` — `stopPropogation` typo + missing call
- [x] `event.stopPropogation` → `event.stopPropagation()`

### 3.2 `context_menu.js` — `index` is undefined
- [x] `openCallback(data, index)` → `openCallback(data)` (removed undefined `index`)

### 3.3 `visualize.js` — wrong SVG attribute for circle radius
- [x] `.attr('radius', 200)` → `.attr('r', 200)` on the `ghostCircle`

### 3.4 `visualize.js` — missing `return` in path generator
- [x] Added `return` before `d3.linkVertical()...` in `updateTempConnector`

### 3.5 `crudApi.js` — `openedTabId` typo
- [x] `currentTab.openedTabId` → `currentTab.openerTabId` (condition in `loadWindowList`)

### 3.6 `visualize.js` — deprecated `wheelDelta`
- [x] `event.wheelDeltaX` → `-event.deltaX`
- [x] `event.wheelDeltaY` → `-event.deltaY`

### 3.7 `helperFunctions.js` — `res[4]` always undefined
- [x] `if(res[4])` → `if(word < words.length)` (check if words remained unprocessed after loop)

### 3.8 `firebase.js` — undeclared global `newElement`
- [x] Added `let` to `newElement = document.createElement('li')` in `getSavedTrees`

### 3.9 `background.js` — relative URL in `chrome.tabs.create`
- [x] Fixed as part of the service worker rewrite (1.2)

---

## Phase 4 — Deprecated API Cleanup (Medium, browser warnings)

### 4.1 `xlink:href` → `href` in `visualize.js`
- [ ] All `.attr('xlink:href', ...)` calls should become `.attr('href', ...)`
  - Affects: favicon image, toggle arrow image, update of favicon, update of toggle

### 4.2 D3: lock to a specific version with integrity hash
- [ ] Consider upgrading from v6 → v7 (or just pinning v6 — now vendored in `lib/` so version is already locked)
- [ ] If upgrading to v7, check event API — v6 already uses `(event, d)` so the main code should be fine; verify drag events

### 4.3 Font Awesome 4.7.0 → 6.x
- [ ] Update CDN link to Font Awesome 6
- [ ] Update icon class names: `fa-pencil-square-o` → `fa-pen-square`, `fa-trash-o` → `fa-trash`
  - FA5+ dropped the `-o` (outline) variants

### 4.4 `visualize.js:38` — `d3.select("rect")` selects nothing
- [ ] The tooltip `<div>` is appended inside an SVG `<rect>` that doesn't exist yet — this is invalid DOM
- [ ] Either remove it (it's never used) or move to `d3.select("body")`

---

## Phase 5 — Dependency & Build Hygiene (Lower priority)

### 5.1 Stop loading from `node_modules` directly ✅ DONE
- [x] `fnon` and all other third-party JS moved to `lib/` — `node_modules/` is no longer referenced in any HTML file

### 5.2 Add a minimal build step
- [ ] Once Firebase modular SDK is added (Phase 2.3), a bundler is required anyway
- [ ] Recommended: Vite with `@crxjs/vite-plugin` for Chrome extension bundling (handles MV3, HMR, CSP automatically)
- [ ] This would also allow importing D3 and fnon as npm packages instead of vendored files in `lib/`

### 5.3 Remove dead files
- [ ] Delete `not_working_d3_crudApi.js` — clearly abandoned, just adds noise

### 5.4 `crudApi.js:4` — `var fetch` shadows global `fetch`
- [ ] Remove the unused `var fetch;` declaration

---

## Suggested Order of Attack

```
✅ Phase 1 (MV3) → ✅ Phase 3 (bugs) → Phase 2 (Firebase) → Phase 4 (deprecations) → Phase 5 (build)
```

Phase 2 (Firebase modular) naturally leads into Phase 5 (bundler) since you'll need one anyway.

---

## Files Touched Per Phase

| File | Phase |
|---|---|
| `manifest.json` | 1.1 ✅ |
| `background.js` | 1.2, 1.5, 3.9 ✅ |
| `close.js` | 1.3 ✅ |
| `tabs_api.js` | 1.4, 1.5 ✅ |
| `tabs_api.html` | 1.5, 1.6, 5.1 ✅ |
| `authUI.html` | 1.6, 2.3 (1.6 ✅) |
| `lib/` | 1.6 ✅ (new directory) |
| `firebase.js` | 2.1, 2.2, 2.3, 2.4, 3.8 (3.8 ✅) |
| `authUI.js` | 2.3 |
| `context_menu.js` | 3.1, 3.2 ✅ |
| `visualize.js` | 3.3, 3.4, 3.6, 4.1, 4.2, 4.4 (3.3–3.6 ✅) |
| `crudApi.js` | 3.5, 5.4 (3.5 ✅) |
| `helperFunctions.js` | 3.7 ✅ |
| `not_working_d3_crudApi.js` | 5.3 (delete) |
