import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyANvPl756yN6ykDdJD2wyHRF1-SzxGGUzk",
  authDomain: "alquezar-sistema.firebaseapp.com",
  projectId: "alquezar-sistema",
  storageBucket: "alquezar-sistema.appspot.com",
  messagingSenderId: "9204549458",
  appId: "1:9204549458:web:5a1fce1802566c2a3f5c8b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
