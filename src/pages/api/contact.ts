import type { APIRoute } from 'astro';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { initializeFirebase } from '../../lib/firebase';

export const prerender = false;

export const GET: APIRoute = async () => {
    return new Response(JSON.stringify({ 
        message: 'Contact route is available. Use POST method to submit contact form.' 
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};

export const POST: APIRoute = async ({ request }) => {
    try {
        // Initialize Firebase
        const firebaseConfig = await initializeFirebase();
        const app = firebaseConfig?.app;
        
        if (!app) {
            throw new Error('Failed to initialize Firebase app');
        }
        
        const db = getFirestore(app);

        // Parse request body
        const { name, email, subject, message } = await request.json();

        // Validate input
        if (!name || !email || !subject || !message) {
            return new Response(JSON.stringify({ 
                error: 'Name, email, subject, and message are required' 
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Save contact request to Firestore
        const contactRequestsRef = collection(db, 'contact_requests');
        await addDoc(contactRequestsRef, {
            name,
            email,
            subject,
            message,
            timestamp: new Date().toISOString(),
            status: 'new'
        });

        return new Response(JSON.stringify({ 
            message: 'Contact request submitted successfully' 
        }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Contact request error:', error);

        return new Response(JSON.stringify({ 
            error: 'Failed to submit contact request' 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
