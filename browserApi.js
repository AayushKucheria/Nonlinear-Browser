window.BrowserApi = {
  getAllWindows(cb)       { chrome.windows.getAll({ populate: true }, cb); },
  removeTab(id)          { chrome.tabs.remove(id); },
  queryTabs(url, cb)     { chrome.tabs.query({ url }, cb); },
  focusTab(tabId, winId) { chrome.tabs.update(tabId, { active: true });
                           chrome.windows.update(winId, { focused: true }); },
  createTab(url)         { chrome.tabs.create({ url }); },
  muteTab(tabId, muted)  { chrome.tabs.update(tabId, { muted: muted }); },
  bookmarkTab(url, title){ chrome.bookmarks.create({ title: title, url: url }); }
};
