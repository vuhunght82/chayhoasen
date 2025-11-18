import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCv6UWIbg6LG5oCksURNi_s0mEIRPX9OVw",
  authDomain: "chayhoasen-8c00e.firebaseapp.com",
  databaseURL: "https://chayhoasen-8c00e-default-rtdb.firebaseio.com",
  projectId: "chayhoasen-8c00e",
  storageBucket: "chayhoasen-8c00e.firebasestorage.app",
  messagingSenderId: "784762496840",
  appId: "1:784762496840:web:6bd162e47d0a56411d357d",
  measurementId: "G-LS3S1P7C8N"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the database service and export it for use in other files
export const database = getDatabase(app);
export const storage = getStorage(app);