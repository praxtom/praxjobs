import type { APIRoute } from 'astro';
import crypto from 'crypto';
import { RazorpayService } from '../../lib/razorpayService';

export const POST: APIRoute = async ({ request }) => {
    try {
        // Validate webhook signature
        const RAZORPAY_WEBHOOK_SECRET = import.meta.env.PUBLIC_RAZORPAY_WEBHOOK_SECRET;
        
        if (!RAZORPAY_WEBHOOK_SECRET) {
            console.error('Razorpay webhook secret is not configured');
            return new Response(JSON.stringify({ error: 'Webhook configuration error' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get raw body and signature
        const payload = await request.json();
        const signature = request.headers.get('x-razorpay-signature');

        // Verify webhook signature
        const generatedSignature = crypto
            .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
            .update(JSON.stringify(payload))
            .digest('hex');

        if (signature !== generatedSignature) {
            console.warn('Invalid webhook signature');
            return new Response(JSON.stringify({ error: 'Invalid signature' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log('📦 Webhook Payload:', {
            event: payload.event,
            subscriptionId: payload.payload.subscription?.id,
            userId: payload.payload.subscription?.notes?.userId,
            tier: payload.payload.subscription?.notes?.tier,
            status: payload.payload.subscription?.status,
            fullPayload: JSON.stringify(payload, null, 2)
        });

        // Validate critical information
        if (!payload.payload.subscription?.notes?.userId) {
            console.error('❌ CRITICAL: No user ID found in webhook payload', {
                payload: JSON.stringify(payload, null, 2)
            });
            return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Process webhook
        const razorpayService = new RazorpayService();
        await razorpayService.handleSubscriptionWebhook(payload);

        console.log('✅ Webhook processed successfully');

        return new Response(JSON.stringify({ status: 'success' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Webhook processing error:', error);
        return new Response(JSON.stringify({ 
            error: 'Webhook processing failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
