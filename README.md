# Nonlinear Browser

A Chrome extension (Manifest V3) that shows your browser tabs as a compact indented tree in Chrome's Side Panel — with real parent-child relationships based on how you opened each tab.

**Why?** A flat tab strip loses context the moment you open a second tab from a page. A tree remembers it:
- Navigate 100+ tabs intuitively — you always know where you came from
- See the research thread: which tabs spawned which
- Suspend entire branches to free RAM without losing your place

[Landing page](https://nonlinearbrowser.carrd.co/) · Ping [@aay17ush](https://twitter.com/aay17ush) if you want to talk about it

---

## Features

| Feature | How |
|---|---|
| **Tab tree** | Tabs are children of the tab that opened them; indented tree with connector lines |
| **Suspend tab / branch** | Right-click → Suspend Tab (leaf) or Suspend Branch (parent). Tab is removed from Chrome to free RAM; ghost row stays in the tree. Click it to reopen. |
| **Resume** | Click any ghost row — tab reopens in Chrome and reattaches to its original position in the tree |
| **Pinned strip** | 6 quick-access slots at the top; drag a tab row onto a slot to pin it |
| **Audio indicators** | 🔊 / 🔇 button on tabs playing or muted audio |
| **Cross-window drag** | Drag a tab onto another window's label to move it |
| **Undo close** | Ctrl+Z restores the last closed tab or branch |
| **Collapse / expand** | Click the ⊟ header button to collapse all branches at once |
| **Rename** | Right-click → Rename Tab or double-click a window label |
| **Bookmark** | Right-click → Bookmark Tab |
| **Search / filter** | Type in the search bar to filter the tree in real time |
| **Save tree** | Snapshot the current tree to localStorage; restore later |
| **Keyboard shortcut** | Ctrl+Shift+Y (Cmd+Shift+Y on Mac) to toggle the panel |

## Installation (development)

1. Clone the repo
2. Open `chrome://extensions`, enable **Developer mode**
3. Click **Load unpacked** and select the repo root
4. Open any Chrome window — the panel is available from the toolbar icon or the keyboard shortcut

```bash
npm install   # install Jest (tests only — no build step needed)
npm test      # run the 63-test suite
```

No build system, no bundler. Plain script tags. All third-party JS is vendored into `lib/`.

![Aayush exploring the depths of Hypertext and being amazed by this tree.](https://user-images.githubusercontent.com/29465889/124818529-cf795300-df73-11eb-937d-4512daf8e85b.png)
