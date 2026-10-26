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
// Membaca variabel lingkungan Vite (import.meta.env.VITE_FIREBASE_*) dengan
// fallback otomatis ke konfigurasi proyek firebase-applet-config.json
// ============================================================================
export const firebaseConfig = {
  // Web API Key dari variabel lingkungan Vite atau konfigurasi proyek
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    firebaseConfigJson.apiKey ||
    'AIzaSyAlDOzFnMgg_6wZWvIqmQ230x167dWK3nk',

  // Domain autentikasi Firebase (<project-id>.firebaseapp.com)
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    firebaseConfigJson.authDomain ||
    'delta-heuristic-5v4kj.firebaseapp.com',

  // ID Proyek Google Cloud / Firebase
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID ||
    firebaseConfigJson.projectId ||
    'delta-heuristic-5v4kj',

  // ID Database Cloud Firestore
  firestoreDatabaseId:
    import.meta.env.VITE_FIREBASE_DATABASE_ID ||
    firebaseConfigJson.firestoreDatabaseId ||
    'ai-studio-risologypos-476dbfaf-8ffd-40bc-908a-bf8c1e583d2d',

  // Bucket penyimpanan Cloud Storage
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    firebaseConfigJson.storageBucket ||
    'delta-heuristic-5v4kj.firebasestorage.app',

  // Sender ID untuk Firebase Cloud Messaging
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    firebaseConfigJson.messagingSenderId ||
    '871858303342',

  // ID Aplikasi Web Firebase
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    firebaseConfigJson.appId ||
    '1:871858303342:web:b639e5fd5b99e4ece2917f',

  // Google OAuth Client ID
  oAuthClientId:
    import.meta.env.VITE_FIREBASE_OAUTH_CLIENT_ID ||
    firebaseConfigJson.oAuthClientId ||
    '871858303342-jt1o7srbejk93760m8k8bu1ktgo7goda.apps.googleusercontent.com',
};

// Inisialisasi Firebase App (Singleton)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Inisialisasi Firebase Authentication
export const auth = getAuth(app);

// Inisialisasi layanan Cloud Firestore dan ekspor variabel basis data (db)
export const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

// Enum tipe operasi database untuk pelacakan & penanganan galat
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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  return errInfo;
}

// Nama koleksi dokumen di Cloud Firestore
export const FIRESTORE_COLLECTIONS = {
  SETTINGS: 'store_settings',
  SETTINGS_DOC: 'store_config',
  SHIFT_CONFIG_DOC: 'shift_config',
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  TRANSACTIONS: 'transactions',
  CUSTOMERS: 'customers',
  EXPENSES: 'expenses',
  DISCOUNTS: 'discounts',
  SHIFTS: 'shifts',
  CASHIERS: 'cashiers',
} as const;

// Helper untuk membersihkan nilai undefined secara rekursif (termasuk di dalam Array) sebelum dikirim ke Firestore
export function cleanFirestoreData<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      if (Array.isArray(val)) {
        result[key] = val
          .filter((item) => item !== undefined)
          .map((item) =>
            item !== null && typeof item === 'object' && !Array.isArray(item) && !(item instanceof Date)
              ? cleanFirestoreData(item)
              : item
          );
      } else if (
        val !== null &&
        typeof val === 'object' &&
        !(val instanceof Date)
      ) {
        result[key] = cleanFirestoreData(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

// Fungsi verifikasi koneksi awal ke server Cloud Firestore
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('✅ Cloud Firestore terhubung:', firebaseConfig.projectId);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('⚠️ Klien Firebase sedang offline, menggunakan sinkronisasi antrean.');
    } else {
      console.log('ℹ️ Status koneksi Firestore:', (error as Error)?.message || 'Siap');
    }
    return false;
  }
}

testConnection();
