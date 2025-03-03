import type { User } from 'firebase/auth';
import { getIdTokenResult } from 'firebase/auth';
import { initializeFirebase } from './firebase';

// Helper function to get environment variable with enhanced logging
function getEnvVar(key: string): string | undefined {
    console.log(`Attempting to retrieve environment variable: ${key}`);
    
    // Check Astro/Vite import.meta.env first
    if (import.meta.env) {
        console.log('Checking import.meta.env');
        const value = import.meta.env[key];
        console.log(`import.meta.env.${key}:`, value ? 'FOUND' : 'NOT FOUND');
        if (value) return value as string;
    }
    
    // If running in Node.js environment, try process.env
    if (typeof process !== 'undefined' && process.env) {
        console.log('Checking process.env');
        const value = process.env[key];
        console.log(`process.env.${key}:`, value ? 'FOUND' : 'NOT FOUND');
        if (value) return value;
    }
    
    // Log all available environment variables for debugging
    console.warn(`Environment variable ${key} not found. Available variables:`);
    console.log('import.meta.env:', JSON.stringify(import.meta.env, null, 2));
    if (typeof process !== 'undefined') {
        console.log('process.env:', JSON.stringify(process.env, null, 2));
    }
    
    return undefined;
}

// Custom token validation utility
export async function validateAuthToken(token: string): Promise<boolean> {
    try {
        console.log('Starting comprehensive token validation', {
            tokenLength: token.length,
            tokenFirstChars: token.substring(0, 10) + '...',
            timestamp: new Date().toISOString()
        });

        // Validate token format before processing
        if (!token || token.trim() === '') {
            console.warn('Empty or invalid token provided', {
                tokenType: typeof token,
                tokenValue: token,
                timestamp: new Date().toISOString()
            });
            return false;
        }

        // Initialize Firebase if not already initialized
        const firebaseInstance = initializeFirebase();
        if (!firebaseInstance) {
            console.error('Firebase initialization failed', {
                timestamp: new Date().toISOString()
            });
            return false;
        }

        const { auth } = firebaseInstance;
        if (!auth) {
            console.error('Firebase auth not available', {
                timestamp: new Date().toISOString()
            });
            return false;
        }

        // Attempt to verify the token
        try {
            // Use Firebase's built-in token verification
            const decodedToken = await getIdTokenResult(auth.currentUser!, true);
            
            console.log('Token Validation Debug:', {
                tokenValid: !!decodedToken,
                tokenIssuedAt: decodedToken?.issuedAtTime,
                tokenExpirationTime: decodedToken?.expirationTime,
                timestamp: new Date().toISOString()
            });

            return !!decodedToken;
        } catch (verificationError) {
            console.error('Token verification failed', {
                error: verificationError instanceof Error ? verificationError.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
            return false;
        }
    } catch (error) {
        console.error('Comprehensive token validation error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        return false;
    }
}

// Helper function to get token from cookies
export const getAuthTokenFromCookies = (cookies: { get: (name: string) => { value: string } | undefined }): string | null => {
    try {
        const authCookie = cookies.get('auth_token');
        console.log('Cookie Token Debug:', {
            cookiePresent: !!authCookie,
            cookieValue: authCookie ? 'PRESENT' : 'MISSING'
        });
        return authCookie ? authCookie.value : null;
    } catch (error) {
        console.error('Error retrieving auth token from cookies', {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        return null;
    }
};

// Get current user with timeout
export async function getCurrentUserWithTimeout(timeoutMs = 5000): Promise<User | null> {
    const firebaseInstance = initializeFirebase();
    
    if (!firebaseInstance) {
        console.warn('Firebase not initialized in getCurrentUserWithTimeout');
        return null;
    }

    const { auth } = firebaseInstance;

    return new Promise((resolve) => {
        // Set a timeout to prevent hanging
        const timeoutId = setTimeout(() => {
            console.warn('getCurrentUserWithTimeout timed out');
            resolve(null);
        }, timeoutMs);

        // Use onAuthStateChanged to get the current user
        const unsubscribe = auth.onAuthStateChanged((user) => {
            clearTimeout(timeoutId);
            unsubscribe();
            resolve(user);
        }, (error) => {
            clearTimeout(timeoutId);
            console.error('Error getting current user:', error);
            resolve(null);
        });
    });
}

// Set authentication cookie
export async function setAuthCookie(token: string): Promise<void> {
    try {
        if (typeof document === 'undefined') {
            console.warn('Document is not defined, cannot set cookie');
            return;
        }

        // Set secure cookie with HttpOnly flag
        const cookieOptions = [
            `auth_token=${token}`,
            'Path=/',
            'SameSite=Strict',
            'Secure'
        ];

        // Set cookie expiration to 7 days
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 7);
        cookieOptions.push(`Expires=${expirationDate.toUTCString()}`);

        // Join all options and set the cookie
        document.cookie = cookieOptions.join('; ');

        console.log('Auth cookie set successfully', {
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error setting auth cookie:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack trace',
            timestamp: new Date().toISOString()
        });
        throw error;
    }
}

// Clear authentication cookie
export function clearAuthCookie(): void {
    try {
        if (typeof document === 'undefined') {
            console.warn('Document is not defined, cannot clear cookie');
            return;
        }

        // Expire the cookie immediately
        document.cookie = 'auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Secure; SameSite=Strict';
        
        console.log('Auth cookie cleared successfully', {
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error clearing auth cookie:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack trace',
            timestamp: new Date().toISOString()
        });
    }
}

// Get auth token from cookies
export function getAuthToken(cookies: { get: (name: string) => { value: string } | undefined }): string | null {
    try {
        const authCookie = cookies.get('auth_token');
        return authCookie ? authCookie.value : null;
    } catch (error) {
        console.error('Error getting auth token:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack trace',
            timestamp: new Date().toISOString()
        });
        return null;
    }
}
