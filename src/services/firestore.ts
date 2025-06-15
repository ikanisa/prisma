import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCi8mbUIHviolGC_vMg9UU5AtKqqfwhMTo",
  authDomain: "ikanisa-ac07c.firebaseapp.com",
  projectId: "ikanisa-ac07c",
  storageBucket: "ikanisa-ac07c.appspot.com",
  messagingSenderId: "884527325587",
  appId: "1:884527325587:web:961be313a11639e66b0866",
  measurementId: "G-KPWK62070L"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Initialize anonymous authentication
let sessionId: string | null = null;

export const initializeSession = async (): Promise<string> => {
  if (sessionId) return sessionId;
  
  try {
    const result = await signInAnonymously(auth);
    sessionId = result.user.uid;
    localStorage.setItem('sessionId', sessionId);
    return sessionId;
  } catch (error) {
    console.error('Authentication failed:', error);
    // Fallback to local session
    sessionId = localStorage.getItem('sessionId') || Math.random().toString(36).slice(2);
    localStorage.setItem('sessionId', sessionId);
    return sessionId;
  }
};

export const getSessionId = (): string => {
  return sessionId || localStorage.getItem('sessionId') || Math.random().toString(36).slice(2);
};

// Firestore operations
export const savePaymentRequest = async (data: {
  inputType: string;
  receiver: string;
  amount: number;
  ussdString: string;
  qrCodeUrl?: string;
  paymentLink?: string;
}) => {
  const sessionId = await initializeSession();
  return addDoc(collection(db, 'payments'), {
    sessionId,
    ...data,
    status: 'pending',
    createdAt: Timestamp.now()
  });
};

export const saveQRScanResult = async (data: {
  decodedUssd: string;
  decodedReceiver?: string;
  decodedAmount?: number;
  result: string;
  imageSource?: string;
}) => {
  const sessionId = await initializeSession();
  return addDoc(collection(db, 'qrHistory'), {
    sessionId,
    ...data,
    scannedAt: Timestamp.now()
  });
};

export const saveSharedLink = async (data: {
  receiver: string;
  amount: number;
  paymentLink: string;
}) => {
  const sessionId = await initializeSession();
  return addDoc(collection(db, 'sharedLinks'), {
    sessionId,
    ...data,
    sharedAt: Timestamp.now()
  });
};

export const logSessionEvent = async (data: {
  function: string;
  status: string;
  error?: string;
}) => {
  const sessionId = await initializeSession();
  return addDoc(collection(db, 'sessionLogs'), {
    sessionId,
    ...data,
    timestamp: Timestamp.now()
  });
};

export const getRecentQRCodes = async () => {
  const sessionId = getSessionId();
  const q = query(
    collection(db, 'qrCache'),
    where('sessionId', '==', sessionId),
    orderBy('createdAt', 'desc'),
    limit(5)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const fetchAds = async () => {
  // Mock implementation for ads - can be replaced with actual Firestore query
  return [];
};
