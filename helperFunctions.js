

function initToast() {

  Fnon.Hint.Init({
    position: 'center-bottom',
    animation: 'slide-bottom'
  });
}

// async function fetchUser(user_id)
// {
//   // console.log("user id", user_id)
//   var user_tree = database.ref().child('users').child(user_id)
//
//     // console.log("tree user ", user_tree)
//
//   user_tree.once('value').then((snapshot) => {
//
//     console.log("snapshot.val", snapshot.val())
//     return snapshot.val();
//
//   })};


// ================ Wrapping Tab Titles
function wrapText(text) {
  let words = text.split(/(?=[\s\\/%,\.])/),
    res = ["", "", "", ""],
    limit = false;
    var line=0, word=0;
  while(line < 4 && word < words.length) {
    let limit = line < 2 ? 0.5 * window.tabWidth : 0.7 * window.tabWidth
    if((visualLength(res[line]) + visualLength(words[word])) < limit) {
      res[line] +=  " " + words[word++];
    }
    else {
      res[++line] += words[word++];
    }
  }
  if(word < words.length)
    res[3] = res[3].substring(0, res[3].length-3) + "..."
  return res;
}

function visualLength(text) {
  var ruler = document.getElementById('ruler')
  // ruler.style.fontSize = '16px';
  // ruler.style.fontWeight = 500;
  // ruler.style.fontFamily = 'Roboto'
  ruler.visibility = 'hidden';
  ruler.textContent = text;
  return ruler.offsetWidth;
}

// ================
// Traverse through all the nodes
// parent = Node, traverseFn = what to do while traversing, childrenFn = children if present else null
function traverse(parent, traverseFn, childrenFn) {
  if(!parent) return;

  traverseFn(parent);

  var children = childrenFn(parent);
  if(children) {
    var count = children.length;
    for(var i = 0; i < count; i++) {
      traverse(children[i], traverseFn, childrenFn);
    }
  }
}

