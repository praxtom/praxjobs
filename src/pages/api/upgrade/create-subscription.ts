import type { APIRoute } from 'astro';
import { RazorpayService } from '../../../lib/razorpayService';
import { getAuth } from 'firebase-admin/auth';
import { initializeFirebaseAdmin } from '../../../lib/firebaseAdmin';

export const POST: APIRoute = async ({ request }) => {
    try {
        // Initialize Firebase Admin
        initializeFirebaseAdmin();

        // Get the authorization token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'No token provided' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const token = authHeader.split('Bearer ')[1];
        
        // Verify the token
        try {
            const decodedToken = await getAuth().verifyIdToken(token);
            const { userId, tier } = await request.json();

            // Validate input
            if (!userId || !tier) {
                return new Response(JSON.stringify({ error: 'Missing userId or tier' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Verify that the token belongs to the same user
            if (decodedToken.uid !== userId) {
                return new Response(JSON.stringify({ error: 'Token does not match userId' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Create subscription
            const razorpayService = new RazorpayService();
            const subscriptionResponse = await razorpayService.createSubscription(userId, tier);

            return new Response(JSON.stringify(subscriptionResponse), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (verifyError) {
            console.error('Token verification error:', verifyError);
            return new Response(JSON.stringify({ error: 'Invalid token' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        console.error('Subscription creation error:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to create subscription',
            details: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
