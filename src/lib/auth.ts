import { 
    initializeApp, 
    getApps, 
    getApp, 
    type FirebaseApp 
} from 'firebase/app';
import { 
    getAuth, 
    signInWithPopup, 
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    GoogleAuthProvider, 
    signOut, 
    onAuthStateChanged, 
    type User,
    type AuthError,
    setPersistence,
    browserLocalPersistence,
    createUserWithEmailAndPassword
} from 'firebase/auth';
import { PersistentDocumentService } from './persistentDocumentService';
import { getFirestore, doc, getDoc, setDoc, Timestamp, increment } from 'firebase/firestore';
import { TierManagementService } from './tierManagement';

// Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
    authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.PUBLIC_FIREBASE_APP_ID
};

// Ensure Firebase is only initialized once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Custom type guard to check if error is an AuthError
function isAuthError(error: unknown): error is AuthError {
    return error instanceof Error && 
           'code' in error && 
           'message' in error;
}

// Get base URL for API endpoints
function getBaseUrl(): string {
    // For server-side rendering or environments without window
    if (typeof window === 'undefined') {
        return import.meta.env.PUBLIC_BASE_URL || 'http://localhost:8888';
    }

    // For client-side rendering
    // In production (e.g., on Netlify), we want to use the Netlify Functions endpoint
    if (import.meta.env.PROD) {
        return 'https://praxjobs.netlify.app/.netlify/functions';
    }

    // For development with Netlify CLI
    return 'http://localhost:8888/.netlify/functions';
}

// Centralized API request function
async function apiRequest(endpoint: string, method: 'POST' | 'GET', body?: any) {
    try {
        const url = `${getBaseUrl()}/auth/${endpoint}`;
        console.log('API Request', {
            url,
            method,
            body: body ? JSON.stringify(body) : 'No body',
            timestamp: new Date().toISOString()
        });

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Request Failed', {
                status: response.status,
                statusText: response.statusText,
                errorText,
                timestamp: new Date().toISOString()
            });
            throw new Error(`API request failed: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Request Error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack trace',
            timestamp: new Date().toISOString()
        });
        throw error;
    }
}

class AuthService {
    private app: FirebaseApp;
    private auth: ReturnType<typeof getAuth>;
    private initialized: boolean = false;
    private googleProvider: GoogleAuthProvider;
    private loginCallbacks: (() => void)[] = [];

    static EMAIL_HISTORY_COLLECTION = 'userEmailHistory';

    constructor() {
        this.app = app;
        this.auth = auth;
        this.googleProvider = new GoogleAuthProvider();
        this.initialize();
    }

    private initPromise: Promise<void> | null = null;

    private initialize() {
        if (!this.initPromise) {
            this.initPromise = new Promise((resolve) => {
                try {
                    // Setup auth state listener
                    onAuthStateChanged(this.auth, (user) => {
                        this.initialized = true;
                        console.log('[AuthService] Auth state changed:', user ? user.uid : 'No user');
                        this.loginCallbacks.forEach(callback => callback());
                        resolve();
                    }, (error) => {
                        console.error('[AuthService] Auth state change error:', error);
                        this.initialized = false;
                        resolve(); // Resolve anyway to prevent hanging
                    });
                } catch (error) {
                    console.error('[AuthService] Initialization error:', error);
                    resolve(); // Resolve anyway to prevent hanging
                }
            });
        }
        return this.initPromise;
    }

    async getCurrentUser(): Promise<User | null> {
        try {
            // Wait for initialization
            await this.initPromise;
            
            // Get user from auth
            const user = this.auth.currentUser;
            
            if (!user && !this.initialized) {
                console.warn('[AuthService] Auth not fully initialized');
            }
            
            return user;
        } catch (error) {
            console.error('[AuthService] Error getting current user:', error);
            return null;
        }
    }

    public async signInWithGoogle(): Promise<User | null> {
        try {
            console.log('Starting Google Sign-In process', {
                timestamp: new Date().toISOString(),
                windowDefined: typeof window !== 'undefined',
                baseUrl: getBaseUrl()
            });

            // Ensure browser persistence is set
            await setPersistence(this.auth, browserLocalPersistence);

            const result = await signInWithPopup(this.auth, this.googleProvider);
            
            // Additional validation
            if (!result.user) {
                console.error('No user returned from Google sign-in', {
                    result: JSON.stringify(result),
                    timestamp: new Date().toISOString()
                });
                throw new Error('No user returned from Google sign-in');
            }

            // Get and set the auth token via API
            const token = await result.user.getIdToken();
            await apiRequest('login', 'POST', { token });

            // Initialize user data in Firestore
            const db = getFirestore();
            const userRef = doc(db, 'users', result.user.uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                console.log('Creating new user document in Firestore', {
                    uid: result.user.uid,
                    timestamp: new Date().toISOString()
                });

                const timestamp = Timestamp.now();
                // Create basic user document without subscription info
                await setDoc(userRef, {
                    email: result.user.email,
                    displayName: result.user.displayName,
                    photoURL: result.user.photoURL,
                    createdAt: timestamp,
                    lastLoginAt: timestamp
                });

                // Initialize user subscription
                await TierManagementService.initUserTierProfile(result.user.uid);
            }

            // Log successful login
            console.log('Google sign-in successful', {
                uid: result.user.uid,
                email: result.user.email,
                displayName: result.user.displayName,
                timestamp: new Date().toISOString()
            });

            return result.user;
        } catch (error) {
            // User-friendly error messages
            let userFriendlyMessage = 'An unexpected error occurred during Google Sign-In. Please try again.';

            if (isAuthError(error)) {
                switch (error.code) {
                    case 'auth/popup-closed-by-user':
                        userFriendlyMessage = 'Google Sign-In was cancelled. Please try again.';
                        break;
                    case 'auth/popup-blocked':
                        userFriendlyMessage = 'Popup blocked. Please allow popups for this site.';
                        break;
                    case 'auth/network-request-failed':
                        userFriendlyMessage = 'Network error. Please check your internet connection.';
                        break;
                    case 'auth/cancelled-popup-request':
                        userFriendlyMessage = 'Sign-in request was interrupted. Please try again.';
                        break;
                }
            }

            // Comprehensive error logging
            console.error('Google Sign-In Error', {
                errorType: error instanceof Error ? error.name : 'Unknown Error',
                message: error instanceof Error ? error.message : 'No error message',
                stack: error instanceof Error ? error.stack : 'No stack trace',
                userFriendlyMessage,
                timestamp: new Date().toISOString()
            });

            // Throw with user-friendly message
            const authError = new Error(userFriendlyMessage);
            authError.name = 'GoogleSignInError';
            throw authError;
        }
    }

    public async signUpWithEmailAndPassword(email: string, password: string): Promise<User | null> {
        try {
            // Check email reuse eligibility before signup
            const isEligible = await this.checkEmailReuseEligibility(email);
            if (!isEligible) {
                throw new Error('This email cannot be reused. Please contact support.');
            }

            // Set persistence before sign up
            await setPersistence(this.auth, browserLocalPersistence);
            
            // Use Firebase's createUserWithEmailAndPassword method
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;

            // Record email history and create user document
            const db = this.getFirestoreInstance();
            const timestamp = Timestamp.now();
            
            // Create basic user document without subscription info
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, {
                email: user.email,
                displayName: user.displayName || user.email,
                photoURL: user.photoURL || '',
                createdAt: timestamp,
                lastLoginAt: timestamp
            });
            
            // Record email history
            const emailHistoryRef = doc(db, AuthService.EMAIL_HISTORY_COLLECTION, email);
            await setDoc(emailHistoryRef, {
                email,
                createdAt: timestamp,
                deletedAt: null,
                signupCount: increment(1)
            }, { merge: true });

            // Get and set the auth token via API
            const token = await user.getIdToken();
            await apiRequest('login', 'POST', { token });

            // Initialize user subscription
            await TierManagementService.initUserTierProfile(user.uid);

            // Log successful signup
            console.log('Email sign-up successful', {
                uid: user.uid,
                email: user.email,
                timestamp: new Date().toISOString()
            });

            return user;
        } catch (error) {
            console.error('Signup error:', error);
            throw error;
        }
    }

    public async signInWithEmailAndPassword(email: string, password: string): Promise<User | null> {
        try {
            // Set persistence before sign in
            await setPersistence(this.auth, browserLocalPersistence);
            
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;

            // Get and set the auth token via API
            const token = await user.getIdToken();
            await apiRequest('login', 'POST', { token });

            // Log successful login
            console.log('Email sign-in successful', {
                uid: user.uid,
                email: user.email,
                timestamp: new Date().toISOString()
            });

            return user;
        } catch (error) {
            // User-friendly error messages
            let userFriendlyMessage = 'An unexpected error occurred. Please try again.';

            if (isAuthError(error)) {
                switch (error.code) {
                    case 'auth/invalid-credential':
                        userFriendlyMessage = 'Invalid email or password. Please check and try again.';
                        break;
                    case 'auth/user-not-found':
                        userFriendlyMessage = 'No account found with this email. Please sign up.';
                        break;
                    case 'auth/wrong-password':
                        userFriendlyMessage = 'Incorrect password. Please try again.';
                        break;
                    case 'auth/too-many-requests':
                        userFriendlyMessage = 'Too many login attempts. Please try again later.';
                        break;
                    case 'auth/network-request-failed':
                        userFriendlyMessage = 'Network error. Please check your internet connection.';
                        break;
                }
            }

            // Comprehensive error logging
            console.error('Email Sign-In Error', {
                errorType: error instanceof Error ? error.name : 'Unknown Error',
                message: error instanceof Error ? error.message : 'No error message',
                stack: error instanceof Error ? error.stack : 'No stack trace',
                userFriendlyMessage,
                timestamp: new Date().toISOString()
            });

            // Throw with user-friendly message
            const authError = new Error(userFriendlyMessage);
            authError.name = 'AuthenticationError';
            throw authError;
        }
    }

    public async resetPassword(email: string): Promise<void> {
        try {
            // Use Firebase's sendPasswordResetEmail method
            await sendPasswordResetEmail(this.auth, email);

            // Log successful password reset request
            console.log('Password reset email sent', {
                email,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            // Comprehensive error logging
            console.error('Password Reset Error', {
                errorType: error instanceof Error ? error.name : 'Unknown Error',
                message: error instanceof Error ? error.message : 'No error message',
                stack: error instanceof Error ? error.stack : 'No stack trace',
                timestamp: new Date().toISOString()
            });

            // Rethrow the error for the caller to handle
            throw error;
        }
    }

    public async signOut(): Promise<void> {
        try {
            await signOut(this.auth);
            
            // Clear auth cookie via API
            await apiRequest('logout', 'POST');

            // Log successful sign out
            console.log('User signed out successfully', {
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Sign out error:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    public async deleteAccount(): Promise<void> {
        try {
            const user = await this.getCurrentUser();
            if (!user) {
                throw new Error('No user is currently signed in');
            }

            // Validate user authentication
            const currentUser = this.auth.currentUser;
            if (!currentUser) {
                throw new Error('User authentication failed');
            }

            // Record email in history before deletion
            const db = this.getFirestoreInstance();
            const emailHistoryRef = doc(db, AuthService.EMAIL_HISTORY_COLLECTION, user.email!);
            
            try {
                await setDoc(emailHistoryRef, {
                    email: user.email,
                    deletedAt: Timestamp.now(),
                    userId: user.uid
                }, { merge: true });
            } catch (historyError) {
                console.error('Error recording email history:', historyError);
                // Non-critical error, continue with account deletion
            }

            // Delete user data from Firestore
            await PersistentDocumentService.deleteUserData(user.uid);

            // Delete Firebase Authentication user
            await user.delete();

            // Sign out to clear any remaining session
            await this.signOut();
        } catch (error) {
            console.error('Account deletion error:', error);
            
            // Provide more detailed error information
            if (error instanceof Error) {
                const detailedError = {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                };
                console.error('Detailed Account Deletion Error:', detailedError);
            }

            throw error;
        }
    }

    private async checkEmailReuseEligibility(email: string): Promise<boolean> {
        try {
            const db = this.getFirestoreInstance();
            const emailHistoryRef = doc(db, AuthService.EMAIL_HISTORY_COLLECTION, email);
            const emailHistoryDoc = await getDoc(emailHistoryRef);

            if (emailHistoryDoc.exists()) {
                const emailHistory = emailHistoryDoc.data();
                
                // Check if the email has been used in a deleted account within the last 30 days
                if (emailHistory.deletedAt) {
                    const deletedAt = emailHistory.deletedAt.toDate();
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                    if (deletedAt > thirtyDaysAgo) {
                        return false;  // Email cannot be reused within 30 days
                    }
                }
            }

            return true;  // Email is eligible for use
        } catch (error) {
            console.error('Error checking email reuse eligibility:', error);
            return false;
        }
    }

    private getFirestoreInstance() {
        return getFirestore(this.app);
    }

    public addLoginCallback(callback: () => void) {
        this.loginCallbacks.push(callback);
    }
}

const authService = new AuthService();

async function onUserLogin() {
    try {
        await PersistentDocumentService.syncDocuments();
    } catch (error) {
        console.error('Error syncing documents on login:', error);
    }
}

authService.addLoginCallback(onUserLogin);

export { 
    getAuth, 
    signInWithPopup, 
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    GoogleAuthProvider, 
    signOut, 
    onAuthStateChanged, 
    type User,
    type AuthError,
    setPersistence,
    browserLocalPersistence,
    createUserWithEmailAndPassword
} from 'firebase/auth';

export { authService, type AuthService };
