

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


 function fetchTree(user_id,tree_id)
{
  // user=firebase.auth().currentUser;
  var tree = database.ref().child('users').child(user_id).child('tree').child(tree_id);

  tree.once('value').then((snapshot) => {
  console.log("afand", snapshot.val())
  current_tree = snapshot.val();
  console.log("childTree", current_tree)

  window.localRoot = current_tree;
  console.log("window.localRoot", window.localRoot)
  initializeTree(window.localRoot);
  document.title = window.localRoot.title;
})
}

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
  if(res[4])
    res[3] = res[3].substring(0, res[3].length-3) + "..."
  return res;
}

function visualLength(text) {
  var ruler = document.getElementById('ruler')
  ruler.style.fontSize = window.fontSize;
  ruler.style.fontWeight = 400;
  ruler.style.fontFamily = 'Playfair Display, serif'
  ruler.visibility = 'hidden';
  ruler.innerHTML = text;
  // console.log("", text, " width is ", ruler.offsetWidth);
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

function loggedInState() {
  document.querySelector('#log_in').style.display = 'none';
  document.querySelector('#log_out').style.display = 'block';
  Fnon.Hint.Success('Signed in successfully!');
};

function loggedOutState() {
  document.querySelector('#log_in').style.display = 'block';
  document.querySelector('#log_out').style.display = 'none';
  Fnon.Hint.Success('Logged out successfully!');
}
