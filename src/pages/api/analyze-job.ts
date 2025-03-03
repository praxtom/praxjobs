import type { APIRoute } from 'astro';
import { performJobAnalysis } from '../../components/tools/tools_api/JobAnalysisAPI-gpt';

export const POST: APIRoute = async ({ request }) => {
    if (request.headers.get('Content-Type') !== 'application/json') {
        return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
            status: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
    }

    try {
        const analysis = await performJobAnalysis({ request });
        
        if (!analysis || typeof analysis !== 'object') {
            throw new Error('Invalid analysis result received');
        }
        
        return new Response(JSON.stringify(analysis), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
    } catch (error) {
        console.error('API Error:', error);
        return new Response(
            JSON.stringify({ 
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }), 
            { 
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            }
        );
    }
};

// Add OPTIONS handler for CORS preflight
export const OPTIONS: APIRoute = async () => {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
};