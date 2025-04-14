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
    // --- Attempt 1: Standard GOOGLE_APPLICATION_CREDENTIALS ---
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log(
        "🔧 Initializing Firebase Admin using GOOGLE_APPLICATION_CREDENTIALS env var (path)..."
      );
      // Let the SDK handle loading from the path specified in the env var
      adminApp = admin.initializeApp();
      console.log(
        "✅ Firebase Admin initialized via GOOGLE_APPLICATION_CREDENTIALS."
      );
      return adminApp;
    }

    // --- Fallback Methods (if GOOGLE_APPLICATION_CREDENTIALS is not set) ---
    console.log(
      "⚠️ GOOGLE_APPLICATION_CREDENTIALS not set, attempting fallback methods..."
    );
    let credentials: admin.ServiceAccount | null = null;

    // --- Fallback Attempt 2: Build from individual environment variables ---
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (projectId && clientEmail && privateKeyRaw) {
      console.log(
        "🔧 Building Firebase Admin credentials from individual env vars (fallback)..."
      );
      credentials = {
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKeyRaw.replace(/\\n/g, "\n"),
      };
    } else {
      // --- Fallback Attempt 3: Use single FIREBASE_ADMIN_CREDENTIALS variable (JSON string) ---
      console.log(
        "🔧 Attempting to use FIREBASE_ADMIN_CREDENTIALS env var (JSON string fallback)..."
      );
      const credentialsJson = process.env.FIREBASE_ADMIN_CREDENTIALS;
      if (credentialsJson) {
        try {
          const parsedCreds = JSON.parse(credentialsJson);
          // Ensure private key format is correct
          if (
            parsedCreds.privateKey &&
            typeof parsedCreds.privateKey === "string"
          ) {
            parsedCreds.privateKey = parsedCreds.privateKey.replace(
              /\\n/g,
              "\n"
            );
          }
          credentials = parsedCreds;
        } catch (e) {
          console.error(
            "❌ Failed to parse FIREBASE_ADMIN_CREDENTIALS JSON (fallback):",
            e
          );
          // Don't throw yet, maybe individual vars were partially set
        }
      }
    }

    // --- Validate and Initialize using Fallback Credentials ---
    if (!credentials) {
      console.error(
        "❌ Firebase Admin credentials not found using any method (GOOGLE_APPLICATION_CREDENTIALS, individual vars, or FIREBASE_ADMIN_CREDENTIALS JSON)"
      );
      throw new Error(
        "Missing Firebase Admin credentials in environment variables"
      );
    }

    const requiredFields = ["projectId", "clientEmail", "privateKey"];
    const missingFields = requiredFields.filter(
      (field) => !credentials![field as keyof admin.ServiceAccount]
    );

    if (missingFields.length > 0 || !credentials.privateKey) {
      console.error(
        "❌ Missing critical Firebase Admin credentials from fallback methods:",
        missingFields
      );
      throw new Error(
        `Missing critical Firebase Admin credentials from fallback: ${missingFields.join(
          ", "
        )}`
      );
    }

    // Initialize Firebase Admin with the explicitly built credentials object
    console.log(
      "🔧 Initializing Firebase Admin using fallback credentials object..."
    );
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(credentials),
      projectId: credentials.projectId,
    });

    console.log(
      "✅ Firebase Admin initialized successfully using fallback method",
      {
        projectId: credentials.projectId,
        clientEmailDomain: credentials.clientEmail?.split("@")[1],
      }
    );

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
