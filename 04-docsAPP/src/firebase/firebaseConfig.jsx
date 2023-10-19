import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBqiFODdKDFas1VORm1NZdgRKu3TuddMOQ",
  authDomain: "docsapp-b7092.firebaseapp.com",
  projectId: "docsapp-b7092",
  storageBucket: "docsapp-b7092.appspot.com",
  messagingSenderId: "375756277563",
  appId: "1:375756277563:web:2e5366a2d4e624046ed91e",
};

export const app = initializeApp(firebaseConfig);
export const database = getFirestore(app);
