// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDzR2iJ_Nyd5PL3bq2jVMHcPBO9hSM1qVY",
  authDomain: "betterlifeauth.firebaseapp.com",
  projectId: "betterlifeauth",
  storageBucket: "betterlifeauth.firebasestorage.app",
  messagingSenderId: "491143554685",
  appId: "1:491143554685:web:1c6f0353470586b7b83314"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth and export it
export const auth = getAuth(app);

