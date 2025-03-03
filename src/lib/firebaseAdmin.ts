import admin from 'firebase-admin';

// Check if running in a server-side environment
if (typeof window !== 'undefined') {
    console.warn(
        '⚠️ firebase-admin should only be used in server-side environments. ' +
        'For client-side Firebase interactions, use the Firebase JS SDK.'
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
        console.log('🔄 Firebase Admin already initialized, returning existing app');
        return adminApp;
    }

    try {
        // Use environment variable for credentials
        const credentialsJson = process.env.FIREBASE_ADMIN_CREDENTIALS;
        const privateKeyEnv = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
        
        if (!credentialsJson) {
            console.error('❌ Firebase Admin credentials not found in environment');
            throw new Error('Missing Firebase Admin credentials');
        }

        const credentials = JSON.parse(credentialsJson);

        // Restore private key if missing
        if (privateKeyEnv && !credentials.private_key) {
            credentials.private_key = privateKeyEnv.replace(/\\n/g, '\n');
        }

        // Validate critical credentials
        const requiredFields = [
            'type', 'project_id', 
            'client_email', 'client_id'
        ];
        
        const missingFields = requiredFields.filter(field => 
            !credentials[field as keyof typeof credentials]
        );

        if (missingFields.length > 0) {
            console.error('❌ Missing critical Firebase Admin credentials:', missingFields);
            throw new Error(`Missing critical Firebase Admin credentials: ${missingFields.join(', ')}`);
        }

        // Initialize Firebase Admin with parsed credentials
        adminApp = admin.initializeApp({
            credential: admin.credential.cert(credentials as admin.ServiceAccount),
            projectId: credentials.project_id
        });

        console.log('✅ Firebase Admin initialized successfully', {
            projectId: credentials.project_id,
            clientEmailDomain: credentials.client_email?.split('@')[1]
        });

        return adminApp;
    } catch (error) {
        console.error('❌ Firebase Admin initialization error:', error);
        throw error;
    }
}

/**
 * Verify a Firebase ID token
 * @param token The ID token to verify
 * @returns The decoded token
 */
export async function verifyFirebaseToken(token: string): Promise<admin.auth.DecodedIdToken> {
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
        throw new Error('Firebase Admin not initialized');
    }
    return admin.auth(adminApp!);
}

// Export Firebase Admin modules for convenience
export const { auth, firestore, storage } = admin;
