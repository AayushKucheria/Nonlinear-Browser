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
// firebase.analytics();

const db= firebase.firestore();
