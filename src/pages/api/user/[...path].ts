import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
    const path = params.path;

    // Handle different user-related API routes dynamically
    switch (path) {
        case 'profile':
            return new Response(JSON.stringify({ message: 'User profile endpoint' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        case 'settings':
            return new Response(JSON.stringify({ message: 'User settings endpoint' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        default:
            return new Response(JSON.stringify({ error: 'Not Found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
    }
};