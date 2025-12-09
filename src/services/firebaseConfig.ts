// src/services/firebaseConfig.ts
import { initializeApp } from "firebase/app";
// Importar o serviço de Firestore
import { getFirestore } from "firebase/firestore"; 

// Sua configuração do app Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCartyWzi7vl6wWTnRLnU9DDAqGcIivaiY",
  authDomain: "scout-c8e92.firebaseapp.com",
  projectId: "scout-c8e92",
  storageBucket: "scout-c8e92.firebasestorage.app",
  messagingSenderId: "124321063732",
  appId: "1:124321063732:web:bd6be8b1f0f71d82963b61",
  measurementId: "G-LT24JX3ZH1" // Manter se você pretende usar Analytics, mas não será inicializado agora
};

// Inicializa o Firebase App
const app = initializeApp(firebaseConfig);

// Inicializa o Cloud Firestore e exporta a referência
export const firestoreDb = getFirestore(app);

// A inicialização do Analytics foi removida pois não está sendo utilizada
// e estava gerando warnings. Se precisar, você pode descomentar e ajustar.
// const analytics = getAnalytics(app);
