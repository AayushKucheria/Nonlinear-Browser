window.AppStorage = {
  session: {
    load()          { return JSON.parse(localStorage.getItem('user')); },
    save(data)      { localStorage.setItem('user', JSON.stringify(data)); },
    getTimestamp()  { return sessionStorage.getItem('time'); }
  },
  windowNames: {
    load()          { return JSON.parse(localStorage.getItem('windowNames') || '{}'); },
    save(names)     { localStorage.setItem('windowNames', JSON.stringify(names)); }
  },
  pinnedTabs: {
    load()          { return JSON.parse(localStorage.getItem('pinnedTabs') || 'null'); },
    save(pins)      { localStorage.setItem('pinnedTabs', JSON.stringify(pins)); }
  }
};
