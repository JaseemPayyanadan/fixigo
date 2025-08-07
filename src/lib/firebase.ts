import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Check if we're in the browser and environment variables are available
const isClient = typeof window !== 'undefined';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCXtm_dJdKOydCWdhkSHN-7b4-3uEgdyF4',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'fixigo-8dc40.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'fixigo-8dc40',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'fixigo-8dc40.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '303353802217',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:303353802217:web:63f64c4e602726bfcdaf78',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-TSFLWZF5EL'
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app); 