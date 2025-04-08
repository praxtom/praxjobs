import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  type Auth,
  type User,
  browserLocalPersistence,
  setPersistence,
  onAuthStateChanged
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Centralized Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
  measurementId: import.meta.env.PUBLIC_FIREBASE_MEASUREMENT_ID
}

// Enhanced Firebase Initialization Function
export function initializeFirebase () {
  try {
    // Validate configuration
    if (!firebaseConfig.apiKey) {
      console.error(
        '❌ Firebase configuration is incomplete. Check environment variables.'
      )
      return null
    }

    // Prevent multiple initializations
    if (getApps().length > 0) {
      // console.log('✅ Firebase app already initialized') // Removed for prod
      return {
        app: getApps()[0] as FirebaseApp,
        auth: getAuth(),
        db: getFirestore(),
        googleProvider: new GoogleAuthProvider()
      }
    }

    // Initialize Firebase app
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)
    const db = getFirestore(app)

    // Set persistence (optional, but recommended)
    // Only set persistence in browser environment
    if (typeof window !== 'undefined') {
      setPersistence(auth, browserLocalPersistence).catch(error => {
        // console.error('Error setting persistence:', error) // Keep minimal for prod, maybe log server-side if critical
      })
    }

    return {
      app,
      auth,
      db,
      googleProvider: new GoogleAuthProvider()
    }
  } catch (error) {
    console.error('Firebase initialization error:', error)
    return null
  }
}

// Fallback Database Initialization
function getFallbackDb () {
  const instance = initializeFirebase()
  return instance?.db
}

// Safe Current User Retrieval
export async function getCurrentUser (auth: Auth | null): Promise<User | null> {
  if (!auth) return null

  return new Promise(resolve => {
    const unsubscribe = onAuthStateChanged(
      auth,
      user => {
        unsubscribe()
        resolve(user)
      },
      error => {
        // console.error('Error getting current user:', error) // Keep minimal for prod
        resolve(null)
      }
    )
  })
}

// Safe Firebase Instance Creation for both SSR and Client
export const firebaseInstance = initializeFirebase()

// Explicitly export the database with type assertion
export const db = (firebaseInstance?.db || getFallbackDb()) as ReturnType<
  typeof getFirestore
>
