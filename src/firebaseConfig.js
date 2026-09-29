import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseReady = Object.values(config).every(Boolean)
  && Boolean(import.meta.env.VITE_AUTHORIZED_EMAIL)
export const authorizedEmail = import.meta.env.VITE_AUTHORIZED_EMAIL?.trim().toLowerCase() ?? ''
export const firebaseApp = firebaseReady
  ? (getApps().length ? getApp() : initializeApp(config))
  : null
export const auth = firebaseApp ? getAuth(firebaseApp) : null
export const db = firebaseApp ? initializeDatabase(firebaseApp) : null

function initializeDatabase(app) {
  const firestoreKey = Symbol.for('testo-date.firestore')
  if (globalThis[firestoreKey]) return globalThis[firestoreKey]

  try {
    globalThis[firestoreKey] = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  } catch (error) {
    console.warn('[testo-date] Cache persistente indisponível nesta instância; usando a instância Firestore existente.', error)
    globalThis[firestoreKey] = getFirestore(app)
  }

  return globalThis[firestoreKey]
}