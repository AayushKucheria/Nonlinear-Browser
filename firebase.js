// ******** firebase
var user;
var firebaseConfig = {};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.auth().useDeviceLanguage();

var database = firebase.database();
var currentRoot;
currentRoot = window.localRoot;
var url;
var childTree;

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
	signInOptions: [{
			provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
			customParameters: {
				prompt: 'select_account'
			},
			clientId: 'yooo.apps.googleusercontent.com'
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
	window._unsubscribeAuth = firebase.auth().onAuthStateChanged(function(user) {
		if (user) {
			loggedInState();
			checkUser(user);
			getSavedTrees(user);
		} else {
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
	if (isNewUser) {
		console.log("Creating user: ", user.displayName);
		createUser(user);
	} else {
		console.log("User already exists: ", user.displayName);
	}
}

// WORKS
function saveTree(source) {
	user = firebase.auth().currentUser; //get the current user

	if (!user) {
		chrome.tabs.create({
			url: chrome.runtime.getURL("authUI.html")
		}); //user needs to be signed in
	} else {
		checkUser(user);

		var tree = database.ref().child('users').child(user.uid).child('tree'); //get the current tree of the user
		var updates = {};

		tree.once('value').then((snapshot) => {
			if (!source.uid) {
				source.uid = database.ref('users/' + user.uid + '/tree').push().key;
			}
			console.log("Saving tree: ", source);
			updates['users/' + user.uid + '/tree/' + source.uid] = source;
			var x = prompt('Enter the title with which you want to save the tree')
			source.title = x; // It is necessary to change the title before update as update pushes it to the db
			database.ref().update(updates, (error) => {
				if (error) {
          Fnon.Hint.Danger(source.title + ' save failed. Please try in some time.')
				}
        else {
					// console.log("after change", source)
          Fnon.Hint.Success(source.title + ' saved successfully.')
          getSavedTrees(user);
				};
			})
		})
	}
};

function clearSavedTrees() {
	var ulElem = document.getElementById('dropdown');
	while(ulElem.hasChildNodes()) {
		ulElem.removeChild(ulElem.lastChild);
	}
}


function getSavedTrees(user) {
	clearSavedTrees();
	var i = 0;
	var tree = database.ref().child('users').child(user.uid).child('tree');

	tree.once('value').then((snapshot) => {
		snapshot.forEach(function(childSnapshot) {
			let newElement = document.createElement('li')
			var temp_id = "tree" + i;
			var key = childSnapshot.key;
			newElement.id = key
			childTree = childSnapshot.val();

      // tree_dict[key] = childTree; // adding the current json file to the dictionary whose key is this tree's id
      // console.log("added in dictionary", key)
      // console.log("window.localRoot", childTree)
      // console.log("title hai", childTree.title)
      // newElement.innerHTML = '<a href="#" id="'+temp_id+'">"'+childTree.title+'"</a>'
			// tree_dict[key] = childTree; // adding the current json file to the dictionary whose key is this tree's id

      var div = document.createElement("div");
      div.id = "div";
			// console.log("childTree?", childTree)
			var a = document.createElement('a');
			a.href = '#';
			a.id = temp_id;
			a.textContent = childTree.title;
			newElement.appendChild(a);
      newElement.onclick = function() {
				console.log("Fetching ", this.id, " for ", user.uid);
				fetchTree(user.uid, this.id)
        // url = "chrome-extension://jjbpfnijgokebcbepdobkbneconogbkm/tabs_api.html" + "?" + "user" + "=" + user.uid + "&" + "tree" + "=" + key;
        // chrome.tabs.create({
        //   "url": url
        // })
      }
			div.className += "divElem"; //givin
			var icon1 = document.createElement('i');
      icon1.className += 'fa fa-pencil-square-o fa-lg'
			icon1.onclick = function() {
				var newTitle = prompt('Enter new name: ')
				var previousTitle = icon1.parentNode.childNodes[0].innerText; // Gets text of li in div
				let currentref = database.ref().child('users').child(user.uid).child('tree').child(key);
        if(newTitle) {
          currentref.update({
            title: newTitle
          });
          Fnon.Hint.Success('Renamed ' + previousTitle + ' to ' + newTitle + ' successfully.');
          getSavedTrees(user);
        }
			}

			var icon2 = document.createElement('i');
      icon2.className += 'fa fa-trash-o fa-lg'
			icon2.onclick = function() {
				let currentref = database.ref().child('users').child(user.uid).child('tree').child(key);
				//deletes the current tree being selected
				var treeName = icon2.parentNode.childNodes[0].innerText; // Gets text of li in div
				Fnon.Ask.Danger('Are you sure you want to delete ' + treeName, 'Confirmation', 'Yes', 'No', (result) => {
          console.log(result);
					currentref.remove();
					getSavedTrees(user);
				});
			}

      div.appendChild(newElement);
      div.appendChild(icon1);
      div.appendChild(icon2);

			document.querySelector('.dropdown').appendChild(div);
			i = i + 1;
		})
	})
}

function createUser(user) {
	database.ref('users/' + user.uid).set({
		userId: user.uid,
		name: user.displayName,
		email: user.email,
	});

}
