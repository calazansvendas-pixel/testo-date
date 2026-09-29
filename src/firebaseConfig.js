import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

const defaultConfig = {
  apiKey: 'AIzaSyAC92L-jXRdfDHHi4pJmSmAvxGFoqS8Cmc',
  authDomain: 'testo-date.firebaseapp.com',
  projectId: 'testo-date',
  storageBucket: 'testo-date.firebasestorage.app',
  messagingSenderId: '940393033507',
  appId: '1:940393033507:web:a1fec7d8277347151e6696',
}

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultConfig.appId,
}

export const authorizedEmail = (import.meta.env.VITE_AUTHORIZED_EMAIL || 'calazansvendas@gmail.com').trim().toLowerCase()
export const firebaseReady = Object.values(config).every(Boolean) && Boolean(authorizedEmail)
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