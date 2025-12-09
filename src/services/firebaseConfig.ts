// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCartyWzi7vl6wWTnRLnU9DDAqGcIivaiY",
  authDomain: "scout-c8e92.firebaseapp.com",
  projectId: "scout-c8e92",
  storageBucket: "scout-c8e92.firebasestorage.app",
  messagingSenderId: "124321063732",
  appId: "1:124321063732:web:bd6be8b1f0f71d82963b61",
  measurementId: "G-LT24JX3ZH1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);