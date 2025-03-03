import type { APIRoute } from 'astro';
import { SUBSCRIPTION_TIERS } from '../../lib/subscriptionConfig';

// Function to generate a unique reference ID
function generateUniqueReferenceId(prefix: string = 'pro_sub'): string {
    // Combine timestamp and random number
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 7);
    return `${prefix}_${timestamp}_${randomPart}`;
}

export const POST: APIRoute = async ({ request }) => {
    // Validate request
    if (request.headers.get('Content-Type') !== 'application/json') {
        return new Response(JSON.stringify({ error: 'Invalid content type' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // Parse request body
        const { userId } = await request.json();

        // Razorpay credentials
        const RAZORPAY_KEY_ID = import.meta.env.PUBLIC_RAZORPAY_KEY_ID;
        const RAZORPAY_KEY_SECRET = import.meta.env.PUBLIC_RAZORPAY_KEY_SECRET;
        const BASE_URL = import.meta.env.PUBLIC_BASE_URL || 'http://localhost:4321';

        // Validate credentials
        if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
            return new Response(JSON.stringify({ 
                error: 'Razorpay credentials are not configured' 
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Generate a unique reference ID
        const referenceId = generateUniqueReferenceId();

        // Get pro tier price dynamically
        const proTierPrice = SUBSCRIPTION_TIERS.pro.price;

        // Prepare Razorpay API request
        const paymentLinkOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                amount: proTierPrice, // Dynamically fetch price from subscription config
                currency: 'INR',
                accept_partial: false,
                first_min_partial_amount: 0,
                expire_by: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // Link expires in 24 hours
                description: 'PraxJobs Pro Subscription',
                customer: {
                    name: 'PraxJobs User',
                    contact: '',
                    email: ''
                },
                notify: {
                    sms: false,
                    email: false
                },
                reminder_enable: false,
                notes: {
                    userId: userId || 'unknown',
                    tier: 'pro' as const,
                    product: 'PraxJobs Pro',
                    timestamp: Date.now().toString()
                },
                callback_url: `${BASE_URL}/pricing?userId=${userId}&referenceId=${referenceId}&proUpgradeSuccess=true&tier=pro&timestamp=${Date.now()}`,
                callback_method: 'get',
                reference_id: referenceId
            })
        };

        // Make Razorpay API request
        const response = await fetch('https://api.razorpay.com/v1/payment_links', paymentLinkOptions);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Razorpay API Error:', errorText);
            return new Response(JSON.stringify({ 
                error: 'Failed to create payment link',
                details: errorText 
            }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Parse and return payment link
        const data = await response.json();

        return new Response(JSON.stringify({ 
            paymentLink: data.short_url,
            referenceId: referenceId
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Payment link generation server error:', error);
        return new Response(JSON.stringify({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
