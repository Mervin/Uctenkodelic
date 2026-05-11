import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import type { BackendService } from './backend';
import type { SessionData } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

const firebaseConfig = {
  apiKey: "AIzaSyCOgZhq83Ab1PGZoiyvJa6Ykl_eWANzFfg",
  authDomain: "uctenkodelic.firebaseapp.com",
  projectId: "uctenkodelic",
  storageBucket: "uctenkodelic.firebasestorage.app",
  messagingSenderId: "984949791280",
  appId: "1:984949791280:web:ebd4b70b0c498997326bf5",
  measurementId: "G-JHS48FQZRW"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export class FirebaseBackendService implements BackendService {
  async createSession(initialData: Omit<SessionData, 'id' | 'createdAt'>): Promise<SessionData> {
    const id = uuidv4();
    const newSession: SessionData = {
      ...initialData,
      id,
      createdAt: Date.now(),
    };
    
    let safeSession = { ...newSession };
    // Firestore has a 1MB limit per document. 
    // If the base64 image string is too large, we drop it from the remote database
    // so it doesn't crash the sync. The person who uploaded it still has it locally via state.
    if (safeSession.imageUrl && safeSession.imageUrl.length > 900000) {
      console.warn("Image too large for Firestore (>1MB), stripping image for remote sync.");
      safeSession.imageUrl = null;
    }
    
    await setDoc(doc(db, "sessions", id), safeSession);
    return newSession; 
  }

  async getSession(id: string): Promise<SessionData | null> {
    const docSnap = await getDoc(doc(db, "sessions", id));
    if (docSnap.exists()) {
      return docSnap.data() as SessionData;
    }
    return null;
  }

  async updateSession(id: string, update: Partial<SessionData>): Promise<void> {
    const safeUpdate = { ...update };
    if (safeUpdate.imageUrl && safeUpdate.imageUrl.length > 900000) {
      console.warn("Image too large for Firestore (>1MB), stripping image for remote sync.");
      safeUpdate.imageUrl = null;
    }
    
    await updateDoc(doc(db, "sessions", id), safeUpdate);
  }

  subscribeToSession(id: string, callback: (data: SessionData) => void): () => void {
    const unsubscribe = onSnapshot(doc(db, "sessions", id), (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as SessionData);
      }
    });
    return unsubscribe;
  }
}

export const backendService = new FirebaseBackendService();
