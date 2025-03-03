import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
    return new Response(JSON.stringify({ 
        message: 'Login route is available. Use POST method to authenticate.' 
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
};

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        // Parse the request body
        const body = await request.json();
        const { token } = body;

        // Always set the cookie if a token is provided
        if (token) {
            cookies.set('auth_token', token, {
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                httpOnly: true,
                expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            });

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }

        // If no token is provided, return an error
        return new Response(JSON.stringify({ error: 'No token provided' }), {
            status: 400,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Login API Error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });

        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
};
