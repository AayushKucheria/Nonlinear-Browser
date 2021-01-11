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
console.log(firebase);

firebase.auth().useDeviceLanguage();

// firebase.analytics();


// Initialize the FirebaseUI Widget using Firebase.
var ui = new firebaseui.auth.AuthUI(firebase.auth());

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

      // If you've to redirect to another html file, use this.
      // chrome.runtime.sendMessage({ message: 'sign_in'}, function(response) {
      //   if(response.message === 'success') {
      //     // document.getElementById('my_sign_in').style.display = 'none';
      //     // window.location.replace('./tabs_api.html');
      //   }
      // });
      //BUG No redirect URL has been found. You must either specify a signInSuccessUrl in the configuration, pass in a redirect URL to the widget URL, or return false from the callback.  Dismiss
      return false;
    },
    uiShown: function() {
      // The widget is rendered.
      // Hide the loader.
      document.getElementById('my_sign_in').style.display = 'none';
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
    // If yes enable on firebase console
    // firebase.auth.TwitterAuthProvider.PROVIDER_ID,
    firebase.auth.EmailAuthProvider.PROVIDER_ID
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

// The start method will wait until the DOM is loaded.
// Doo't need # when already specifying to get by id
document.getElementById("my_sign_in").addEventListener('click', () => {
  ui.start('#sign_in_options', uiConfig);
})

// const appDb =  app.database().ref();

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
    console.log('User state change detected from the Background script of the Chrome Extension:', user);


  });
}

window.onload = function() {
  initApp();
};






function write_db(source)
{
  console.log("Initializing database");


 var user = firebase.auth().currentUser;
 console.log(user.uid);
 var name, email, uid, treeId, tree;
 var fuck;
 tree=source;

 if(user)
 {
   console.log(tree.data)
   console.log("aa toh raha hai")
   name = user.displayName;
   email= user.email;
   uid= user.uid;
   fuck="fuck you"
   //tree=source.data;
 }
 writeUserData(uid,name,email,fuck);
}

 function writeUserData(userId, name, email,tree) {
   var database = firebase.database();
   database.ref('users/' + userId).set({
     userId: userId,
     name: name,
     email: email,
     tree: tree.data
    // treeId: treeId,
     //tree: tree
   });
 }
