import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

// ============================================================================
// KONFIGURASI BASIS DATA FIREBASE (CLOUD FIRESTORE)
// ============================================================================
// Anda dapat langsung mengubah atau menempelkan kredensial proyek Firebase milik Anda di bawah ini:
export const firebaseConfig = {
  // Masukkan Web API Key dari Firebase Console -> Project Settings -> General
  apiKey: firebaseConfigJson.apiKey || "AIzaSyAlDOzFnMgg_6wZWvIqmQ230x167dWK3nk",

  // Domain autentikasi default: <project-id>.firebaseapp.com
  authDomain: firebaseConfigJson.authDomain || "delta-heuristic-5v4kj.firebaseapp.com",

  // Project ID Firebase / Google Cloud Console
  projectId: firebaseConfigJson.projectId || "delta-heuristic-5v4kj",

  // ID Database Cloud Firestore (misal: (default) atau ID database khusus)
  firestoreDatabaseId: firebaseConfigJson.firestoreDatabaseId || "ai-studio-risologypos-476dbfaf-8ffd-40bc-908a-bf8c1e583d2d",

  // Bucket penyimpanan Cloud Storage
  storageBucket: firebaseConfigJson.storageBucket || "delta-heuristic-5v4kj.firebasestorage.app",

  // Project number / Sender ID untuk FCM
  messagingSenderId: firebaseConfigJson.messagingSenderId || "871858303342",

  // Web App ID dari aplikasi Firebase
  appId: firebaseConfigJson.appId || "1:871858303342:web:b639e5fd5b99e4ece2917f",

  // Google OAuth Client ID (jika menggunakan Google Sign-In)
  oAuthClientId: firebaseConfigJson.oAuthClientId || "871858303342-jt1o7srbejk93760m8k8bu1ktgo7goda.apps.googleusercontent.com",
};

// Inisialisasi Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Inisialisasi Firebase Auth
export const auth = getAuth(app);

// Inisialisasi Cloud Firestore
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Operasi & Error handling sesuai standar Firebase Security Rules
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Koleksi Firestore
export const FIRESTORE_COLLECTIONS = {
  SETTINGS: 'store_settings',
  SETTINGS_DOC: 'store_config',
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  TRANSACTIONS: 'transactions',
  CUSTOMERS: 'customers',
  EXPENSES: 'expenses',
  DISCOUNTS: 'discounts',
} as const;

// Bersihkan nilai undefined agar aman disimpan ke Firestore
export function cleanFirestoreData<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        result[key] = cleanFirestoreData(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

// Uji koneksi Firestore saat pertama kali dimuat
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('✅ Firebase Firestore connected successfully:', firebaseConfig.projectId);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('⚠️ Firebase client offline, menggunakan cache lokal.');
    } else {
      console.log('Firebase ready:', (error as Error)?.message || 'OK');
    }
    return false;
  }
}

// Inisialisasi test koneksi
testConnection();
