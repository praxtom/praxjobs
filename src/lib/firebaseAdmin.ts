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
  console.log("[FirebaseAdmin Debug] initializeFirebaseAdmin called."); // Log call
  if (adminApp) {
    console.log("[FirebaseAdmin Debug] Admin app already initialized."); // Log existing instance
    return adminApp;
  }
  try {
    console.log(
      // Log env var check
      "[FirebaseAdmin Debug] GOOGLE_APPLICATION_CREDENTIALS:",
      process.env.GOOGLE_APPLICATION_CREDENTIALS || "Not Set"
    );
    // Let the SDK handle loading from the path specified in GOOGLE_APPLICATION_CREDENTIALS
    console.log("[FirebaseAdmin Debug] Calling admin.initializeApp()..."); // Log SDK call
    adminApp = admin.initializeApp();
    console.log("[FirebaseAdmin Debug] admin.initializeApp() successful."); // Log success
    return adminApp;
  } catch (e) {
    console.error(
      "[FirebaseAdmin Debug] ❌ Failed to initialize Firebase Admin:",
      e
    ); // Log failure
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
  console.log(
    // Log token being verified (truncated)
    "[FirebaseAdmin Debug] verifyFirebaseToken called with token:",
    token ? token.substring(0, 20) + "..." : "null"
  );
  if (!adminApp) {
    console.log(
      "[FirebaseAdmin Debug] Admin app not initialized, calling initializeFirebaseAdmin..."
    ); // Log init call from verify
    await initializeFirebaseAdmin();
  }
  try {
    console.log(
      "[FirebaseAdmin Debug] Calling admin.auth().verifyIdToken()..."
    ); // Log SDK call
    const decodedToken = await admin.auth(adminApp!).verifyIdToken(token);
    console.log(
      "[FirebaseAdmin Debug] verifyIdToken successful for UID:",
      decodedToken.uid
    ); // Log success
    return decodedToken;
  } catch (error) {
    console.error("[FirebaseAdmin Debug] ❌ verifyIdToken failed:", error); // Log failure
    throw error; // Re-throw the error
  }
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
