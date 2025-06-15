
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, DocumentData } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY", // <-- TODO: set in Firebase Console
  authDomain: "YOUR_FIREBASE_AUTH_DOMAIN",
  projectId: "YOUR_FIREBASE_PROJECT_ID",
  // ...include other required config values!
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export async function fetchAds(): Promise<DocumentData[]> {
  const adsSnapshot = await getDocs(collection(db, 'ads'));
  return adsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}
