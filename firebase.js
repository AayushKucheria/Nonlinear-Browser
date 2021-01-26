
// ******** firebase
var user;
var firebaseConfig = {
  apiKey: "Aafidsufhiasufhdiufhsifhsuf",
  databaseURL: "hsdaudsifhafiudhf.com",
  authDomain: "nonlinear-browser.firebaseapp.com",
  projectId: "nonlinear-browser",
  storageBucket: "nonlinear-browser.appspot.com",
  messagingSenderId: "32424234234",
  appId: "1:43243662:web:cc17084511342423b4f",
  measurementId: "G-12324"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.auth().useDeviceLanguage();

var database = firebase.database();

// Initialize the FirebaseUI Widget using Firebase.
// Details: https://github.com/firebase/firebaseui-web
var uiConfig = {
  callbacks: {
    signInSuccessWithAuthResult: function(authResult) {
      var user = authResult.user;
      var credential = authResult.credential;
      var isNewUser = authResult.additionalUserInfo.isNewUser;
      var providerId = authResult.additionalUserInfo.providerId;
      var operationType = authResult.operationType;
      window.close(); // Closes the tab

      return false; // Return value doesn't matter for us, since we'll be redirecting manually.
    },
    // signInFailure: function(error, credential) {
    //   console.log("Sign in failed with error: ", error, " for user: ", credential);
    //   return void; // Correct return value?
    // }
    uiShown: function() {
      // The widget is rendered.
    }
  },
  // Will use popup for IDP Providers sign-in flow instead of the default, redirect.
  signInFlow: 'popup',
  signInOptions: [
    {
      provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
      customParameters: {
        prompt: 'select_account'
      },
      clientId: '693229853662-0ib0k3hru04sb2da03e6nltso00at1ur.apps.googleusercontent.com'
    },
    firebase.auth.EmailAuthProvider.PROVIDER_ID
    // If yes enable on firebase console
    // firebase.auth.TwitterAuthProvider.PROVIDER_ID,
    // Don't need the rest
    // firebase.auth.PhoneAuthProvider.PROVIDER_ID,
    // firebase.auth.FacebookAuthProvider.PROVIDER_ID,
    // firebase.auth.GithubAuthProvider.PROVIDER_ID
  ],
  // Terms of service url.
  // tosUrl: '<your-tos-url>',
  // Privacy policy url.
  // privacyPolicyUrl: '<your-privacy-policy-url>'
};

/**
 * initApp handles setting up the Firebase context and registering
 * callbacks for the auth status.
 *
 * The core initialization is in firebase.App - this is the glue class
 * which stores configuration. We provide an app name here to allow
 * distinguishing multiple app instances.
 *
 * This method also registers a listener with firebase.auth().onAuthStateChanged.
 * This listener is called when the user is signed in or out, and that
 * is where we update the UI.
 *
 * When signed in, we also authenticate to the Firebase Realtime Database.
 */
function initApp() {
  // Listen for auth state changes.
  firebase.auth().onAuthStateChanged(function(user) {
    if(user) {
      loggedInState();
      checkUser(user);
    }
    else {
      loggedOutState();
    }
  });
}

document.querySelector('#log_out').addEventListener('click', function() {
  firebase.auth().signOut();
});

window.onload = function() {
  initApp();
};


// Check if user is new. If yes, add to database.
function checkUser(user) {
  var isNewUser = (user.metadata.creationTime === user.metadata.lastSignInTime) ? true : false;
  if(isNewUser) {
    console.log("Creating user: ", user.displayName);
    createUser(user);
  }
  else {
    console.log("User already exists: ", user.displayName);
  }
}


function saveTree(source) {
  user = firebase.auth().currentUser; //get the current user

  if(!user) {
    chrome.tabs.create({url:chrome.extension.getURL("authUI.html")}); //user needs to be signed in
  }
  else {
    checkUser(user);
    var tree = database.ref().child('users').child(user.uid).child('tree'); //get the current tree of the user
    var updates = {};

    tree.once('value').then((snapshot) => {
      if(!source.uid) {
        source.uid = database.ref('users/' + user.uid + '/tree').push().key;
      }
      updates['users/' + user.uid + '/tree/' + source.uid] = source;
      database.ref().update(updates, (error) => {
        if(error) {
          console.log("Tree not saved.")
          sendToast(source.title + " rabbit hole save failed.");
        }
        else {
          console.log("source.title is", source.title)
          sendToast(source.title + " rabbit hole saved successfully!");
        }
      });
    });
  }
}

function showSavedTrees() {
  var usref = firebase.database().ref("users/"+user.uid);
  console.log("user is", user)

  usref.once('value', function(snapshot) {
    snapshot.forEach( function(childSnapshot) {
      if((childSnapshot.key)=="tree"){
        var dtree = childSnapshot.val();
        console.log("current tree is", dtree)
      }
    });

    });

  }

function createUser(user) {
    database.ref('users/' + user.uid).set({
      userId: user.uid,
      name: user.displayName,
      email: user.email,
    });

}
