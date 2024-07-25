// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAX5eUF4JuFBG2kxcSVtaRg2vZKGJimLoI",
    authDomain: "yabbitreseller.firebaseapp.com",
    projectId: "yabbitreseller",
    storageBucket: "yabbitreseller.appspot.com",
    messagingSenderId: "515376714086",
    appId: "1:515376714086:web:d47c2c710de40e257c38a7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export const createUser = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('User created successfully:', userCredential.user.uid);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Error creating user:', error.message);
    return { success: false, error: error.message };
  }
};

export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('User signed in successfully:', userCredential.user.uid);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Error signing in:', error.message);
    return { success: false, error: error.message };
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
    console.log('User signed out successfully');
    return { success: true };
  } catch (error) {
    console.error('Error signing out:', error.message);
    return { success: false, error: error.message };
  }
};

export const getResellerAccessToken = async (userId) => {
  try {
    console.log('Attempting to retrieve access token for user:', userId);
    const docRef = doc(db, 'resellerTokens', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const accessToken = docSnap.data().accessToken;
      console.log('Access token retrieved successfully');
      return { success: true, accessToken };
    } else {
      console.log('No access token found for this user');
      return { success: false, error: 'No access token found for this user' };
    }
  } catch (error) {
    console.error('Error getting access token:', error);
    return { success: false, error: error.message };
  }
};

export { auth, db };
