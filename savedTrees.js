function saveTree() {
  var title = prompt('Enter a name for this tree:');
  if (!title) return;

  var saved = AppStorage.savedTrees.load();
  var snapshot = JSON.parse(JSON.stringify(window.localRoot));
  saved.push({ id: Date.now().toString(), title: title, snapshot: snapshot });
  AppStorage.savedTrees.save(saved);
  Fnon.Hint.Success(title + ' saved successfully.');
  getSavedTrees();
}

function clearSavedTrees() {
  var ulElem = document.getElementById('dropdown');
  while (ulElem.hasChildNodes()) {
    ulElem.removeChild(ulElem.lastChild);
  }
}

function getSavedTrees() {
  clearSavedTrees();
  var saved = AppStorage.savedTrees.load();
  saved.forEach(function(tree) {
    var div = document.createElement('div');
    div.className = 'divElem';

    var li = document.createElement('li');
    li.id = tree.id;

    var a = document.createElement('a');
    a.href = '#';
    a.textContent = tree.title;
    li.appendChild(a);
    li.onclick = function() {
      fetchTree(tree.id);
    };

    var icon1 = document.createElement('i');
    icon1.textContent = '✏';
    icon1.onclick = function(e) {
      e.stopPropagation();
      var newTitle = prompt('Enter new name:');
      if (!newTitle) return;
      var previousTitle = tree.title;
      var list = AppStorage.savedTrees.load();
      var idx = list.findIndex(function(t) { return t.id === tree.id; });
      if (idx !== -1) {
        list[idx].title = newTitle;
        AppStorage.savedTrees.save(list);
        Fnon.Hint.Success('Renamed ' + previousTitle + ' to ' + newTitle + ' successfully.');
        getSavedTrees();
      }
    };

    var icon2 = document.createElement('i');
    icon2.textContent = '🗑';
    icon2.onclick = function(e) {
      e.stopPropagation();
      var treeName = tree.title;
      Fnon.Ask.Danger('Are you sure you want to delete ' + treeName, 'Confirmation', 'Yes', 'No', function() {
        var list = AppStorage.savedTrees.load();
        list = list.filter(function(t) { return t.id !== tree.id; });
        AppStorage.savedTrees.save(list);
        getSavedTrees();
      });
    };

    div.appendChild(li);
    div.appendChild(icon1);
    div.appendChild(icon2);
    document.querySelector('.dropdown').appendChild(div);
  });
}

function fetchTree(tree_id) {
  var saved = AppStorage.savedTrees.load();
  var tree = saved.find(function(t) { return t.id === tree_id; });
  if (!tree) return;
  console.log('Loading tree:', tree.title);
  window.localRoot = tree.snapshot;
  window.data = {};
  localRootToData();
  initializeTree(window.localRoot);
}

document.addEventListener('DOMContentLoaded', function() {
  getSavedTrees();
});
