// ─── Chrome API stub (MV3) ───────────────────────────────────────────────────
global.chrome = {
  tabs: {
    onCreated:   { addListener: jest.fn() },
    onUpdated:   { addListener: jest.fn() },
    onRemoved:   { addListener: jest.fn() },
    onActivated: { addListener: jest.fn() },
    query:       jest.fn(),
    update:      jest.fn(),
    get:         jest.fn(),
    sendMessage: jest.fn(),
  },
  windows: {
    getAll:    jest.fn(),
    onCreated: { addListener: jest.fn() },
    onRemoved: { addListener: jest.fn() },
  },
  // MV3: chrome.action replaces chrome.browserAction
  action: {
    onClicked:               { addListener: jest.fn() },
    setBadgeText:            jest.fn(),
    setBadgeBackgroundColor: jest.fn(),
  },
  runtime: {
    getURL:       jest.fn(path => `chrome-extension://test/${path}`),
    onMessage:    { addListener: jest.fn() },
    onStartup:    { addListener: jest.fn() },
    lastError:    null,
  },
};

// ─── D3 stub (prevents ReferenceError if any file touches d3 on load) ───────
global.d3 = {};

// ─── Toast / dialog library stub ────────────────────────────────────────────
global.Fnon = {
  Hint:     { Init: jest.fn(), Success: jest.fn(), Error: jest.fn() },
  Dialogue: { Init: jest.fn(), Primary: jest.fn() },
};

// ─── Firebase stub ───────────────────────────────────────────────────────────
global.firebase = {
  auth:     jest.fn(() => ({ currentUser: null, onAuthStateChanged: jest.fn() })),
  database: jest.fn(),
};

// ─── AppStorage stub (overridden by eval(storage.js) in crudApi.test.js) ─────
global.AppStorage = {
  session: {
    load:         jest.fn(() => null),
    save:         jest.fn(),
    getTimestamp: jest.fn(() => null),
  },
  savedTrees: {
    load: jest.fn(() => []),
    save: jest.fn(),
  },
};

// ─── BrowserApi stub ─────────────────────────────────────────────────────────
global.BrowserApi = {
  getAllWindows: jest.fn(),
  removeTab:    jest.fn(),
  queryTabs:    jest.fn(),
  focusTab:     jest.fn(),
  createTab:    jest.fn(),
};

// ─── Visualisation functions (defined in visualize.js, mocked here) ──────────
global.drawTree       = jest.fn();
global.updateTree     = jest.fn();
global.initializeTree = jest.fn();

// ─── Window dimensions used by crudApi.js / wrapText ────────────────────────
global.innerWidth  = 1280;
global.innerHeight = 720;
// tabWidth is referenced by wrapText() to calculate line-break limits
global.tabWidth = 200;

// ─── DOM element required by visualLength() ──────────────────────────────────
// jsdom.offsetWidth always returns 0, which is fine – wrapText() still runs
// without errors and returns a 4-element array.
document.body.innerHTML = '<span id="ruler"></span>';
