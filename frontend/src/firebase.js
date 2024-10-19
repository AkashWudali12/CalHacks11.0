// see: https://firebase.google.com/docs/web/setup

// import firebase from "firebase/app"
// import "firebase/auth"
// import "firebase/firestore"
// import "firebase/analytics";

import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

import { GA4React } from "ga-4-react";

import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAxfXDF83Zjrs9evXf_fQHvkosfqoimWsM",
  authDomain: "calhacks11-a6f72.firebaseapp.com",
  projectId: "calhacks11-a6f72",
  storageBucket: "calhacks11-a6f72.appspot.com",
  messagingSenderId: "218933998519",
  appId: "1:218933998519:web:b56a5469154b9188afae32"
};

//
// FIREBASE AUTH APP CONFIG
//
// https://firebase.google.com/docs/web/setup
// https://firebase.google.com/docs/reference/js/firebase
// https://firebase.google.com/docs/reference/js/firebase.auth

const app = firebase.initializeApp(firebaseConfig)
const analytics = getAnalytics(app);

export default app
