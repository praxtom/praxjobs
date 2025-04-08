import type { App } from 'firebase-admin/app';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin
function initializeFirebaseAdmin(): App | null {
    if (typeof window !== 'undefined') return null;

    if (getApps().length > 0) {
        return getApps()[0];
    }

    const projectId = import.meta.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = import.meta.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = import.meta.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
        console.error('Incomplete Firebase Admin configuration');
        return null;
    }

    try {
        const normalizedPrivateKey = privateKey
            .replace(/^"/, '')
            .replace(/"$/, '')
            .replace(/\\n/g, '\n');

        const app = initializeApp({
            credential: cert({
                projectId,
                clientEmail,
                privateKey: normalizedPrivateKey
            }),
            projectId
        });

        // console.log('Firebase Admin initialized successfully'); // Removed for prod
        return app;
    } catch (error) {
        console.error('Firebase Admin initialization error:', error);
        return null;
    }
}

// Verify ID token
async function verifyIdToken(token: string): Promise<any> {
    const app = initializeFirebaseAdmin();
    if (!app) {
        throw new Error('Firebase Admin not initialized');
    }

    try {
        const auth = getAuth(app);
        const decodedToken = await auth.verifyIdToken(token);
        return decodedToken;
    } catch (error) {
        console.error('Token verification error:', error);
        throw error;
    }
}

// Get user by ID
async function getUserById(uid: string): Promise<any> {
    const app = initializeFirebaseAdmin();
    if (!app) {
        throw new Error('Firebase Admin not initialized');
    }

    try {
        const auth = getAuth(app);
        const user = await auth.getUser(uid);
        return user;
    } catch (error) {
        console.error('Get user error:', error);
        throw error;
    }
}

export { initializeFirebaseAdmin, verifyIdToken, getUserById };
