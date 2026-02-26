'use strict';

const fs   = require('fs');
const path = require('path');

// ── Eval order matters ────────────────────────────────────────────────────────
// 1. helperFunctions.js — traverse / wrapText (used by crudApi)
// 2. storage.js         — real AppStorage (overrides setup.js stub)
// 3. crudApi.js         — window.localRoot / data helpers
// 4. renderer.js        — functions under test
eval(fs.readFileSync(path.join(__dirname, '../helperFunctions.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../storage.js'),         'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../crudApi.js'),         'utf8'));
eval(fs.readFileSync(path.join(__dirname, '../renderer.js'),        'utf8'));

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeTab(overrides) {
  return Object.assign(
    {
      id:         1,
      title:      'Test Tab',
      children:   [],
      active:     false,
      deleted:    false,
      url:        'https://example.com',
      favIconUrl: '',
      windowId:   1,
    },
    overrides
  );
}

function makeState(overrides) {
  return Object.assign(
    {
      collapsedTabs: new Set(),
      showClosed:    false,
      query:         '',
      onToggle:      jest.fn(),
      onClose:       jest.fn(),
      onActivate:    jest.fn(),
    },
    overrides
  );
}

function makeContainer() {
  return document.createElement('div');
}

// ── countOpen ─────────────────────────────────────────────────────────────────

describe('countOpen', () => {
  test('returns 0 for empty array', () => {
    expect(countOpen([])).toBe(0);
  });

  test('counts only non-closed tabs in a flat list', () => {
    const tabs = [
      makeTab({ id: 1, deleted: false }),
      makeTab({ id: 2, deleted: true  }),
      makeTab({ id: 3, deleted: false }),
    ];
    expect(countOpen(tabs)).toBe(2);
  });

  test('counts recursively through children', () => {
    const tabs = [
      makeTab({
        id:       1,
        deleted:  false,
        children: [
          makeTab({ id: 2, deleted: false }),
          makeTab({ id: 3, deleted: true  }),
        ],
      }),
    ];
    expect(countOpen(tabs)).toBe(2);
  });
});

// ── matchesSearch ─────────────────────────────────────────────────────────────

describe('matchesSearch', () => {
  test('empty query always returns true', () => {
    expect(matchesSearch(makeTab({ title: 'anything' }), '')).toBe(true);
  });

  test('returns true when tab.title matches query', () => {
    expect(matchesSearch(makeTab({ title: 'GitHub Issues' }), 'github')).toBe(true);
  });

  test('returns true when a descendant title matches (bubbles up)', () => {
    const tab = makeTab({
      title:    'Parent',
      children: [makeTab({ id: 2, title: 'Child with keyword', children: [] })],
    });
    expect(matchesSearch(tab, 'keyword')).toBe(true);
  });

  test('returns false when nothing matches', () => {
    const tab = makeTab({
      title:    'GitHub',
      children: [makeTab({ id: 2, title: 'Issues', children: [] })],
    });
    expect(matchesSearch(tab, 'youtube')).toBe(false);
  });
});

// ── renderTabRow — structure ──────────────────────────────────────────────────

describe('renderTabRow — structure', () => {
  test('appends a .tab-row div to container', () => {
    const c = makeContainer();
    renderTabRow(makeTab(), 0, c, [], true, makeState());
    expect(c.querySelector('.tab-row')).not.toBeNull();
  });

  test('.tab-row contains the tab title text', () => {
    const c = makeContainer();
    renderTabRow(makeTab({ title: 'My Cool Tab' }), 0, c, [], true, makeState());
    expect(c.querySelector('.tab-row').textContent).toContain('My Cool Tab');
  });

  test('every row has a .toggle span', () => {
    const c = makeContainer();
    renderTabRow(makeTab(), 0, c, [], true, makeState());
    expect(c.querySelector('.toggle')).not.toBeNull();
  });

  test('.toggle has .clickable for a tab with children', () => {
    const c   = makeContainer();
    const tab = makeTab({ children: [makeTab({ id: 2 })] });
    renderTabRow(tab, 0, c, [], true, makeState());
    expect(c.querySelector('.toggle').classList).toContain('clickable');
  });

  test('.toggle does NOT have .clickable for a leaf tab', () => {
    const c = makeContainer();
    renderTabRow(makeTab({ children: [] }), 0, c, [], true, makeState());
    expect(c.querySelector('.toggle').classList).not.toContain('clickable');
  });

  test('.favicon span is present', () => {
    const c = makeContainer();
    renderTabRow(makeTab(), 0, c, [], true, makeState());
    expect(c.querySelector('.favicon')).not.toBeNull();
  });

  test('.favicon shows first letter of title when no favIconUrl', () => {
    const c = makeContainer();
    renderTabRow(makeTab({ title: 'GitHub', favIconUrl: '' }), 0, c, [], true, makeState());
    expect(c.querySelector('.favicon').textContent).toBe('G');
  });

  test('.favicon renders an <img> when favIconUrl is set', () => {
    const c = makeContainer();
    renderTabRow(
      makeTab({ favIconUrl: 'https://example.com/favicon.ico' }),
      0, c, [], true, makeState()
    );
    expect(c.querySelector('.favicon img')).not.toBeNull();
  });
});

// ── renderTabRow — state classes ──────────────────────────────────────────────

describe('renderTabRow — state classes', () => {
  test('adds .is-active for active tab', () => {
    const c = makeContainer();
    renderTabRow(makeTab({ active: true }), 0, c, [], true, makeState());
    expect(c.querySelector('.tab-row').classList).toContain('is-active');
  });

  test('does NOT add .is-active for inactive tab', () => {
    const c = makeContainer();
    renderTabRow(makeTab({ active: false }), 0, c, [], true, makeState());
    expect(c.querySelector('.tab-row').classList).not.toContain('is-active');
  });

  test('adds .is-closed for deleted tab', () => {
    const c = makeContainer();
    renderTabRow(makeTab({ deleted: true }), 0, c, [], true, makeState());
    expect(c.querySelector('.tab-row').classList).toContain('is-closed');
  });
});

// ── renderTabRow — tree lines ─────────────────────────────────────────────────

describe('renderTabRow — tree lines', () => {
  test('depth=0 → no .tree-lines element', () => {
    const c = makeContainer();
    renderTabRow(makeTab(), 0, c, [], true, makeState());
    expect(c.querySelector('.tree-lines')).toBeNull();
  });

  test('depth=1 → .tree-lines with a .seg.branch element', () => {
    const c = makeContainer();
    renderTabRow(makeTab(), 1, c, [], true, makeState());
    expect(c.querySelector('.tree-lines')).not.toBeNull();
    expect(c.querySelector('.seg.branch')).not.toBeNull();
  });

  test('depth=2 → .tree-lines with one ancestor .seg and one .seg.branch', () => {
    const c = makeContainer();
    renderTabRow(makeTab(), 2, c, [true], true, makeState());
    const lines = c.querySelector('.tree-lines');
    expect(lines).not.toBeNull();
    expect(lines.querySelectorAll('.seg').length).toBe(2);
    expect(c.querySelector('.seg.branch')).not.toBeNull();
  });
});

// ── renderTabRow — children ───────────────────────────────────────────────────

describe('renderTabRow — children', () => {
  test('renders children into the same container (below the parent row)', () => {
    const c      = makeContainer();
    const parent = makeTab({
      id:       1,
      children: [makeTab({ id: 2, title: 'Child Tab' })],
    });
    renderTabRow(parent, 0, c, [], true, makeState());
    expect(c.querySelectorAll('.tab-row').length).toBe(2);
    expect(c.textContent).toContain('Child Tab');
  });

  test('does NOT render children when tab is in collapsedTabs', () => {
    const c      = makeContainer();
    const parent = makeTab({
      id:       1,
      children: [makeTab({ id: 2, title: 'Child Tab' })],
    });
    const state = makeState({ collapsedTabs: new Set([1]) });
    renderTabRow(parent, 0, c, [], true, state);
    expect(c.querySelectorAll('.tab-row').length).toBe(1);
  });

  test('skips closed children when state.showClosed = false', () => {
    const c      = makeContainer();
    const parent = makeTab({
      id:       1,
      children: [makeTab({ id: 2, title: 'Closed Child', deleted: true })],
    });
    renderTabRow(parent, 0, c, [], true, makeState({ showClosed: false }));
    expect(c.querySelectorAll('.tab-row').length).toBe(1);
  });

  test('renders closed children when state.showClosed = true', () => {
    const c      = makeContainer();
    const parent = makeTab({
      id:       1,
      children: [makeTab({ id: 2, title: 'Closed Child', deleted: true })],
    });
    renderTabRow(parent, 0, c, [], true, makeState({ showClosed: true }));
    expect(c.querySelectorAll('.tab-row').length).toBe(2);
  });

  test('skips children that do not match the search query', () => {
    const c      = makeContainer();
    // Parent title matches 'parent'; child 'Unrelated Child' does not
    const parent = makeTab({
      id:       1,
      title:    'Parent',
      children: [makeTab({ id: 2, title: 'Unrelated Child', children: [] })],
    });
    renderTabRow(parent, 0, c, [], true, makeState({ query: 'parent' }));
    // Only the parent row rendered, not the child
    expect(c.querySelectorAll('.tab-row').length).toBe(1);
  });
});

// ── buildSidebarTree ──────────────────────────────────────────────────────────

describe('buildSidebarTree', () => {
  function makeLocalRoot(children) {
    return { id: 'Root', title: 'Current Session', children, x0: 0, y0: 0 };
  }

  test('renders a .win-label for each window group', () => {
    const c         = makeContainer();
    const localRoot = makeLocalRoot([
      makeTab({ id: 1, windowId: 1 }),
      makeTab({ id: 2, windowId: 2 }),
    ]);
    buildSidebarTree(c, localRoot, {}, makeState());
    expect(c.querySelectorAll('.win-label').length).toBe(2);
  });

  test('renders all open top-level tabs for a window', () => {
    const c         = makeContainer();
    const localRoot = makeLocalRoot([
      makeTab({ id: 1, windowId: 1, title: 'Tab One' }),
      makeTab({ id: 2, windowId: 1, title: 'Tab Two' }),
    ]);
    buildSidebarTree(c, localRoot, {}, makeState());
    expect(c.querySelectorAll('.tab-row').length).toBe(2);
  });

  test('window label shows the name from windowNames map', () => {
    const c         = makeContainer();
    const localRoot = makeLocalRoot([
      makeTab({ id: 1, windowId: 42 }),
    ]);
    const windowNames = { 42: 'My Research Window' };
    buildSidebarTree(c, localRoot, windowNames, makeState());
    expect(c.querySelector('.win-label').textContent).toContain('My Research Window');
  });
});
