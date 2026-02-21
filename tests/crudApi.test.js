/**
 * Tests for crudApi.js
 *
 * Constraint: the source files are plain scripts (no module.exports) so we
 * eval() them at the top of this module in sloppy mode.  Function declarations
 * inside eval hoist into the enclosing (module-wrapper) scope and become
 * callable from every test below.
 *
 * eval order matters:
 *   1. helperFunctions.js  — provides wrapText / traverse used by crudApi.js
 *   2. crudApi.js          — provides updateTab / addNewTab / removeSubtree /
 *                            localRootToData
 *
 * Note: `let isCurrent = true` at the top of crudApi.js is block-scoped to
 * the eval and cannot be changed from outside; tests run with the default
 * value (true), which is the normal operating state.
 */
const fs   = require('fs');
const path = require('path');

eval(fs.readFileSync(path.join(__dirname, '..', 'helperFunctions.js'), 'utf8')); // eslint-disable-line no-eval
eval(fs.readFileSync(path.join(__dirname, '..', 'crudApi.js'),         'utf8')); // eslint-disable-line no-eval

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build the canonical localRoot shape used across tests. */
function makeRoot() {
  return {
    id: 'Root',
    title: 'Current Session',
    read: false,
    deleted: false,
    toggle: false,
    lines: ['Current Session'],
    children: [],
    x0: 0,
    y0: 0,
  };
}

/** Build a minimal tab object for use in window.data. */
function makeTab(id, overrides = {}) {
  return Object.assign(
    { id, title: '', url: '', pendingUrl: '', favIconUrl: '',
      parentId: '', children: [], toggle: false, deleted: false,
      read: false, x0: 0, y0: 0, lines: [''] },
    overrides,
  );
}

// ─── Per-test state reset ────────────────────────────────────────────────────

beforeEach(() => {
  window.localRoot = makeRoot();
  window.data      = {};
  updateTree.mockClear();
});

// ─── updateTab ───────────────────────────────────────────────────────────────

describe('updateTab', () => {
  test('missing tabId — does not throw and does not call updateTree', () => {
    expect(() => updateTab(999, { title: 'Anything' })).not.toThrow();
    expect(updateTree).not.toHaveBeenCalled();
  });

  test('title change — updates data[id].title and .lines, calls updateTree(window.localRoot)', () => {
    const tab = makeTab(1, { title: 'Old Title' });
    window.data[1] = tab;

    updateTab(1, { title: 'New Title' });

    expect(window.data[1].title).toBe('New Title');
    // wrapText produces a 4-element array; verify .lines was refreshed
    expect(Array.isArray(window.data[1].lines)).toBe(true);
    expect(window.data[1].lines).toHaveLength(4);
    // Fix 6c: must be called with window.localRoot, not a bare localRoot copy
    expect(updateTree).toHaveBeenCalledWith(window.localRoot);
  });

  test('favIconUrl change — updates field and calls updateTree', () => {
    const tab = makeTab(1, { favIconUrl: 'old.png' });
    window.data[1] = tab;

    updateTab(1, { favIconUrl: 'new.png' });

    expect(window.data[1].favIconUrl).toBe('new.png');
    expect(updateTree).toHaveBeenCalledWith(window.localRoot);
  });

  test('non-display field change (url) — updates field but does NOT call updateTree', () => {
    const tab = makeTab(1, { url: 'http://old.example' });
    window.data[1] = tab;

    updateTab(1, { url: 'http://new.example' });

    expect(window.data[1].url).toBe('http://new.example');
    expect(updateTree).not.toHaveBeenCalled();
  });

  test('changeInfo key not present on tab object — no change, no updateTree', () => {
    const tab = makeTab(1);
    window.data[1] = tab;

    // 'xyzzy' is not a property of tab, so hasOwnProperty check fails
    updateTab(1, { xyzzy: 'value' });

    expect(updateTree).not.toHaveBeenCalled();
  });
});

// ─── addNewTab ───────────────────────────────────────────────────────────────

describe('addNewTab', () => {
  test('tab with no openerTabId is pushed to window.localRoot.children and data[id] is created', () => {
    const tab = { id: 10, title: 'Google', url: 'https://google.com',
                  pendingUrl: '', favIconUrl: '', windowId: 1 };

    addNewTab(tab);

    // Fix regression: must end up in localRoot.children
    expect(window.localRoot.children).toHaveLength(1);
    expect(window.localRoot.children[0].id).toBe(10);
    // data entry created
    expect(window.data[10]).toBeDefined();
    expect(window.data[10].id).toBe(10);
  });

  test('new-tab page (chrome://newtab/) is treated as a root-level tab', () => {
    const tab = { id: 11, title: '', url: '', pendingUrl: 'chrome://newtab/',
                  favIconUrl: '', windowId: 1 };

    addNewTab(tab);

    expect(window.localRoot.children).toHaveLength(1);
    expect(window.data[11]).toBeDefined();
  });

  test('tab with valid openerTabId is pushed to parent children, not localRoot', () => {
    const parentTab = makeTab(5);
    window.data[5]  = parentTab;

    const tab = { id: 20, title: 'Child', url: 'https://child.com',
                  openerTabId: 5, pendingUrl: '', favIconUrl: '', windowId: 1 };

    addNewTab(tab);

    // Must NOT land on localRoot
    expect(window.localRoot.children).toHaveLength(0);
    // Must land on the parent
    expect(parentTab.children).toHaveLength(1);
    expect(parentTab.children[0].id).toBe(20);
    // data entry created
    expect(window.data[20]).toBeDefined();
  });
});

// ─── removeSubtree ───────────────────────────────────────────────────────────

describe('removeSubtree', () => {
  test('removes tab from data and from localRoot.children when tab has no parent', () => {
    const tab = makeTab(30);
    window.data[30] = tab;
    window.localRoot.children = [tab];

    removeSubtree(30);

    expect(window.data[30]).toBeUndefined();
    expect(window.localRoot.children).toHaveLength(0);
  });

  test('also removes all descendant tabs from data', () => {
    const child       = makeTab(31);
    const grandchild  = makeTab(32);
    child.children    = [grandchild];
    const tab         = makeTab(30);
    tab.children      = [child];

    window.data[30] = tab;
    window.data[31] = child;
    window.data[32] = grandchild;
    window.localRoot.children = [tab];

    removeSubtree(30);

    expect(window.data[30]).toBeUndefined();
    expect(window.data[31]).toBeUndefined();
    expect(window.data[32]).toBeUndefined();
  });

  test('removes tab from parent children when tab has a parent', () => {
    const parent = makeTab(40);
    const tab    = makeTab(41, { parentId: 40 });
    parent.children = [tab];

    window.data[40] = parent;
    window.data[41] = tab;

    removeSubtree(41);

    expect(window.data[41]).toBeUndefined();
    expect(parent.children).toHaveLength(0);
    // parent itself is untouched
    expect(window.data[40]).toBeDefined();
  });

  test('calls updateTree with window.localRoot', () => {
    const tab = makeTab(50);
    window.data[50] = tab;
    window.localRoot.children = [tab];

    removeSubtree(50);

    expect(updateTree).toHaveBeenCalledWith(window.localRoot);
  });

  test('calls localStore (persists to localStorage)', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem');
    const tab = makeTab(51);
    window.data[51] = tab;
    window.localRoot.children = [tab];

    removeSubtree(51);

    expect(setItem).toHaveBeenCalledWith('user', expect.any(String));
    setItem.mockRestore();
  });
});

// ─── localRootToData ─────────────────────────────────────────────────────────

describe('localRootToData', () => {
  test('traverses from window.localRoot.children (Fix 6a: typo regression)', () => {
    const child = makeTab('tab1');
    window.localRoot.children = [child];

    localRootToData();

    // The last (and only) child plus its subtree must be in data
    expect(window.data['tab1']).toBe(child);
  });

  test('traverses all children and their descendants', () => {
    const grandchild = makeTab('gc');
    const child1     = makeTab('c1');
    const child2     = makeTab('c2');
    child2.children  = [grandchild];

    window.localRoot.children = [child1, child2];

    localRootToData();

    expect(window.data['c1']).toBeDefined();   // all siblings included
    expect(window.data['c2']).toBeDefined();
    expect(window.data['gc']).toBeDefined();
  });

  test('does nothing when localRoot.children is empty (no crash)', () => {
    window.localRoot.children = [];
    expect(() => localRootToData()).not.toThrow();
    expect(window.data).toEqual({});
  });
});
