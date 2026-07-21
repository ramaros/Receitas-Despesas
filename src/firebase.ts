import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import firebaseConfigJson from '../firebase-applet-config.json';

const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || firebaseConfigJson?.apiKey || "",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson?.authDomain || "",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson?.projectId || "",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson?.storageBucket || "",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson?.messagingSenderId || "",
  appId: metaEnv.VITE_FIREBASE_APP_ID || firebaseConfigJson?.appId || "",
  firestoreDatabaseId: metaEnv.VITE_FIREBASE_DATABASE_ID || firebaseConfigJson?.firestoreDatabaseId || ""
};

const isConfigured = !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey.trim() !== "");

let app;
let auth: any = null;
let db: any = null;
let googleProvider: any = null;

if (isConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    // Support database ID if available, otherwise fallback
    db = firebaseConfig.firestoreDatabaseId 
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
      
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
  } catch (error) {
    console.error("Erro ao inicializar o Firebase: ", error);
  }
}

export { auth, db, googleProvider };
export const isFirebaseConfigured = isConfigured;

// Helper to sign in with Google
export async function signInWithGoogle() {
  if (!isConfigured || !auth || !googleProvider) {
    throw new Error("O Firebase não foi configurado. Ative a integração de nuvem.");
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Erro no login Google: ", error);
    throw error;
  }
}

// Helper to sign out
export async function logoutUser() {
  if (!isConfigured || !auth) return;
  try {
    await fbSignOut(auth);
  } catch (error) {
    console.error("Erro ao deslogar: ", error);
    throw error;
  }
}

// Upload transactions & templates to Firestore
export async function uploadToCloud(userId: string, data: { transactions: any[]; templates: any[] }) {
  if (!isConfigured || !db) return;
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      transactions: data.transactions,
      templates: data.templates,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (error) {
    console.error("Erro ao enviar dados para a nuvem: ", error);
    throw error;
  }
}

// Download transactions & templates from Firestore
export async function downloadFromCloud(userId: string): Promise<{ transactions: any[]; templates: any[]; updatedAt?: number } | null> {
  if (!isConfigured || !db) return null;
  try {
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        transactions: data.transactions || [],
        templates: data.templates || [],
        updatedAt: data.updatedAt
      };
    }
    return null;
  } catch (error) {
    console.error("Erro ao baixar dados da nuvem: ", error);
    throw error;
  }
}
