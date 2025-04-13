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
    console.log(
      "🔄 Firebase Admin already initialized, returning existing app"
    );
    return adminApp;
  }

  try {
    let credentials: admin.ServiceAccount;

    // --- Attempt 1: Build from individual environment variables ---
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (projectId && clientEmail && privateKeyRaw) {
      console.log(
        "🔧 Building Firebase Admin credentials from individual env vars..."
      );
      // Construct object with only the core required fields for ServiceAccount type
      credentials = {
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKeyRaw.replace(/\\n/g, "\n"), // Replace escaped newlines
      };
    } else {
      // --- Attempt 2: Use single FIREBASE_ADMIN_CREDENTIALS variable ---
      console.log("🔧 Attempting to use FIREBASE_ADMIN_CREDENTIALS env var...");
      const credentialsJson = process.env.FIREBASE_ADMIN_CREDENTIALS;
      if (!credentialsJson) {
        console.error(
          "❌ Firebase Admin credentials not found in environment (checked individual vars and FIREBASE_ADMIN_CREDENTIALS)"
        );
        throw new Error("Missing Firebase Admin credentials");
      }
      try {
        credentials = JSON.parse(credentialsJson);
        // Ensure private key format is correct if using the single variable method too
        if (
          credentials.privateKey &&
          typeof credentials.privateKey === "string"
        ) {
          credentials.privateKey = credentials.privateKey.replace(/\\n/g, "\n");
        }
      } catch (e) {
        console.error("❌ Failed to parse FIREBASE_ADMIN_CREDENTIALS JSON:", e);
        throw new Error("Invalid format for FIREBASE_ADMIN_CREDENTIALS");
      }
    }

    // --- Validate the obtained credentials object ---
    const requiredFields = [
      "projectId",
      "clientEmail",
      "privateKey", // Core fields needed
    ];
    const missingFields = requiredFields.filter(
      (field) => !credentials[field as keyof admin.ServiceAccount]
    );

    if (missingFields.length > 0 || !credentials.privateKey) {
      console.error(
        "❌ Missing critical Firebase Admin credentials after checking env vars:",
        missingFields
      );
      throw new Error(
        `Missing critical Firebase Admin credentials: ${missingFields.join(
          ", "
        )}`
      );
    }

    // Initialize Firebase Admin with the credentials object
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(credentials),
      projectId: credentials.projectId, // Explicitly pass projectId
    });

    console.log("✅ Firebase Admin initialized successfully", {
      projectId: credentials.projectId,
      clientEmailDomain: credentials.clientEmail?.split("@")[1],
    });

    return adminApp;
  } catch (error) {
    console.error("❌ Firebase Admin initialization error:", error);
    throw error;
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
