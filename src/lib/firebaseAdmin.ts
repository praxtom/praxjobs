import admin from "firebase-admin";

// Check if running in a server-side environment
if (typeof window !== "undefined") {
  console.warn(
    "⚠️ firebase-admin should only be used in server-side environments. " +
      "For client-side Firebase interactions, use the Firebase JS SDK."
  );
}

// Singleton pattern to prevent multiple initializations
let adminApp: admin.app.App | null = null;

/**
 * Initialize Firebase Admin SDK
 * @returns {admin.app.App} Initialized Firebase Admin app
 * @throws {Error} If initialization fails
 */
export async function initializeFirebaseAdmin(): Promise<admin.app.App> {
  if (adminApp) {
    return adminApp;
  }
  try {
    // Let the SDK handle loading from the path specified in GOOGLE_APPLICATION_CREDENTIALS
    adminApp = admin.initializeApp();
    return adminApp;
  } catch (e) {
    console.error("❌ Failed to initialize Firebase Admin:", e);
    throw e;
  }
}

/**
 * Verify a Firebase ID token
 * @param token The ID token to verify
 * @returns The decoded token
 */
export async function verifyFirebaseToken(
  token: string
): Promise<admin.auth.DecodedIdToken> {
  if (!adminApp) {
    await initializeFirebaseAdmin();
  }
  return admin.auth(adminApp!).verifyIdToken(token);
}

/**
 * Get Firebase Admin Auth instance
 * @returns The Auth instance
 */
export function getFirebaseAdminAuth(): admin.auth.Auth {
  if (!adminApp) {
    throw new Error("Firebase Admin not initialized");
  }
  return admin.auth(adminApp!);
}

// Export Firebase Admin modules for convenience
export const { auth, firestore, storage } = admin;
