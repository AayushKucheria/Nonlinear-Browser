window.AppStorage = {
  session: {
    load()          { return JSON.parse(localStorage.getItem('user')); },
    save(data)      { localStorage.setItem('user', JSON.stringify(data)); },
    getTimestamp()  { return sessionStorage.getItem('time'); }
  },
  savedTrees: {
    load()          { return JSON.parse(localStorage.getItem('savedTrees') || '[]'); },
    save(trees)     { localStorage.setItem('savedTrees', JSON.stringify(trees)); }
  }
};
