import type { APIRoute } from 'astro';
import { getAuth } from 'firebase-admin/auth';
import { initializeFirebaseAdmin } from '../../../lib/firebaseAdmin';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
    try {
        // Initialize admin Firebase
        const adminApp = initializeFirebaseAdmin();
        if (!adminApp) {
            console.error('Firebase Admin initialization failed');
            return new Response(JSON.stringify({ error: 'Firebase Admin not initialized' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get the token from the request headers
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.split('Bearer ')[1];

        if (!token) {
            // Fallback to cookie-based authentication
            const sessionCookie = cookies.get('session')?.value;
            
            if (!sessionCookie) {
                return new Response(JSON.stringify({ error: 'No authentication token found' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            try {
                // Verify session cookie
                const decodedToken = await getAuth().verifySessionCookie(sessionCookie, true);
                
                return new Response(JSON.stringify({
                    uid: decodedToken.uid,
                    email: decodedToken.email
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (cookieError) {
                return new Response(JSON.stringify({ error: 'Invalid session' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        try {
            // Verify ID token
            const decodedToken = await getAuth().verifyIdToken(token);
            
            return new Response(JSON.stringify({
                uid: decodedToken.uid,
                email: decodedToken.email
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (tokenError) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

    } catch (error) {
        console.error('Error in /api/user/current:', error);
        
        return new Response(JSON.stringify({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
