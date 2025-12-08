import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD8qdtbJjDUQiGChawaCQHEN6EgXSwL3dk",
  authDomain: "savings-tracker-e84f1.firebaseapp.com",
  projectId: "savings-tracker-e84f1",
  storageBucket: "savings-tracker-e84f1.firebasestorage.app",
  messagingSenderId: "911774980286",
  appId: "1:911774980286:web:3f7bfec0a8f6f941b3e6ef",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);
