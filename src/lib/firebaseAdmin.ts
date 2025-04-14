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
import fs from "fs";
import path from "path";

export async function initializeFirebaseAdmin(): Promise<admin.app.App> {
  console.log("[FirebaseAdmin Debug] initializeFirebaseAdmin called.");
  if (adminApp) {
    console.log("[FirebaseAdmin Debug] Admin app already initialized.");
    return adminApp;
  }
  try {
    // 1. Try FIREBASE_SERVICE_ACCOUNT_JSON env var (Netlify-friendly)
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson) {
      console.log(
        "[FirebaseAdmin Debug] Using FIREBASE_SERVICE_ACCOUNT_JSON env var for credentials."
      );
      const serviceAccount = JSON.parse(serviceAccountJson);
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      return adminApp;
    }

    // 2. Try secrets/firebase-admin-key.json (included in Netlify bundle)
    const keyPath = path.resolve(
      __dirname,
      "../../secrets/firebase-admin-key.json"
    );
    if (fs.existsSync(keyPath)) {
      console.log(
        "[FirebaseAdmin Debug] Using secrets/firebase-admin-key.json for credentials."
      );
      const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      return adminApp;
    }

    // 3. Fallback: default initialization (GOOGLE_APPLICATION_CREDENTIALS or GCP env)
    console.log(
      "[FirebaseAdmin Debug] Falling back to default admin.initializeApp(). GOOGLE_APPLICATION_CREDENTIALS:",
      process.env.GOOGLE_APPLICATION_CREDENTIALS || "Not Set"
    );
    adminApp = admin.initializeApp();
    return adminApp;
  } catch (e) {
    console.error(
      "[FirebaseAdmin Debug] ❌ Failed to initialize Firebase Admin:",
      e
    );
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
