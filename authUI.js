
var ui = new firebaseui.auth.AuthUI(firebase.auth());

// The start method will wait until the DOM is loaded.
console.log("Hello babe!");
ui.start('#sign_in_options', uiConfig);
