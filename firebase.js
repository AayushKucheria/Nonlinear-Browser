let user_signed_in = false;

// ******** firebase
var firebaseConfig = {
  apiKey: "AIzaSyBcXi7lHnFZPpiQJEwIvs9u_gp38zst1mQ",
  databaseURL: "https://nonlinear-browser-default-rtdb.firebaseio.com",
  authDomain: "nonlinear-browser.firebaseapp.com",
  projectId: "nonlinear-browser",
  storageBucket: "nonlinear-browser.appspot.com",
  messagingSenderId: "693229853662",
  appId: "1:693229853662:web:cc17084511b58095841b4f",
  measurementId: "G-76DQZXB7F5"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.auth().useDeviceLanguage();

var database = firebase.database();
// Initialize the FirebaseUI Widget using Firebase.

chrome.runtime.onMessage.addListener((req, sender,response) => {
  if(req.message === 'is_user_signed_in') {
    sendResponse({
      message: 'success',
      payload: user_signed_in
    });
  }
  else if(req.message === 'sign_out') {
    user_signed_in = false;
    sendResponse({ message: 'success'});
  }
  else if(req.message === 'sign_in') {
    user_signed_in = true;
    sendResponse({ message: 'success'});
  }
  return true;
});

var uiConfig = {
  callbacks: {
    // User successfully signed in.
    // Return type determines whether we continue the redirect automatically
    // or whether we leave that to developer to handle.
    signInSuccessWithAuthResult: function(authResult, redirectUrl) {
      window.close();
      return false;
    },
    uiShown: function() {
      // The widget is rendered.
    }
  },
  // Will use popup for IDP Providers sign-in flow instead of the default, redirect.
  signInFlow: 'popup',
  // signInSuccessUrl: '<url-to-redirect-to-on-success>', Can't redirect in extension
  signInOptions: [
    // Leave the lines as is for the providers you want to offer your users.
    {
      provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
      customParameters: {
        prompt: 'select_account'
      }
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
      console.log("User signed in: ", user.displayName);
      checkUser(user);
    }
    else {
      console.log("No user signed in");
    }
  });
}

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
  var user = firebase.auth().currentUser;
  checkUser(user);
  if(user) {
    var tree = database.ref().child('users').child(user.uid).child('tree');
    tree.once('value').then((snapshot) => {
      // Doing the same thing, but let's keep it for readibility
      if(snapshot.exists()) {
        console.log("Folder exists. Pushing tree.");
        database.ref('users/' + user.uid + '/tree').push(source);

      }
      else {
        console.log("Tree folder doesn't exist. Creating one and pushing tree.")
        database.ref('users/' + user.uid + '/tree').push(source);
      }
    });
  }
  else {
    console.log("No user detected. Can't save tree.");
  }
 // writeUserData(uid,name,email);
}

function createUser(user) {
    database.ref('users/' + user.uid).set({
      userId: user.uid,
      name: user.displayName,
      email: user.email,
    });

}
