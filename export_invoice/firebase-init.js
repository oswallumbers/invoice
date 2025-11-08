// PASTE YOUR FIREBASE CONFIGURATION OBJECT HERE
 const firebaseConfig = {
    apiKey: "AIzaSyAMesZEMlRPhbzTZkDtz6SqAdW60GAmLb0",
    authDomain: "export-inv-82c4e.firebaseapp.com",
    projectId: "export-inv-82c4e",
    storageBucket: "export-inv-82c4e.firebasestorage.app",
    messagingSenderId: "174774832913",
    appId: "1:174774832913:web:6de53bc9e11da8e2e7c6b0",
    measurementId: "G-V935DH905E"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); // Get a Firestore instance
