/**
 * Tests for helperFunctions.js
 *
 * Strategy: eval() the source at module scope in sloppy mode so that
 * `function` declarations (traverse, wrapText, visualLength, …) are hoisted
 * into this file's scope and callable from every test.
 */
const fs   = require('fs');
const path = require('path');

eval(fs.readFileSync(path.join(__dirname, '..', 'helperFunctions.js'), 'utf8')); // eslint-disable-line no-eval

// ─── traverse ────────────────────────────────────────────────────────────────

describe('traverse', () => {
  test('returns early without calling traverseFn when parent is falsy', () => {
    const fn = jest.fn();
    traverse(null, fn, fn);
    expect(fn).not.toHaveBeenCalled();
  });

  test('calls traverseFn exactly once for a leaf node', () => {
    const leaf = { id: 'leaf' };
    const fn   = jest.fn();
    traverse(leaf, fn, () => null);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(leaf);
  });

  test('visits root then all descendants depth-first', () => {
    const grandchild = { id: 'gc',  children: [] };
    const child1     = { id: 'c1',  children: [grandchild] };
    const child2     = { id: 'c2',  children: [] };
    const root       = { id: 'root', children: [child1, child2] };

    const visited = [];
    traverse(
      root,
      node => visited.push(node.id),
      node => (node.children.length ? node.children : null),
    );

    expect(visited).toEqual(['root', 'c1', 'gc', 'c2']);
  });

  test('childrenFn returning null terminates recursion for that branch', () => {
    const child = { id: 'child' };
    const root  = { id: 'root', children: [child] };
    const fn    = jest.fn();

    // childrenFn always returns null → only root is visited
    traverse(root, fn, () => null);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(root);
  });
});

// ─── wrapText ────────────────────────────────────────────────────────────────

describe('wrapText', () => {
  test('always returns an array of exactly 4 strings', () => {
    const result = wrapText('');
    expect(result).toHaveLength(4);
    result.forEach(s => expect(typeof s).toBe('string'));
  });

  test('first element is non-empty for a short word', () => {
    const result = wrapText('short');
    // jsdom offsetWidth = 0, so the word fits on the first line
    expect(result[0].trim()).not.toBe('');
  });

  test('returns 4 strings for multi-word input', () => {
    const result = wrapText('hello world foo bar');
    expect(result).toHaveLength(4);
  });
});
