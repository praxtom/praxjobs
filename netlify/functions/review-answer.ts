import { Handler } from '@netlify/functions';
import { reviewAnswer } from '../../src/components/tools/tools_api/InterviewPrepAPI';

const handler: Handler = async (event, context) => {
    console.log('Incoming request to review-answer:', event);

    // Handle OPTIONS request for CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: ''
        };
    }

    // Handle POST request
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({ message: 'Method not allowed' }),
        };
    }

    if (!event.body) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({ error: 'Request body is required' }),
        };
    }

    if (event.headers['content-type'] !== 'application/json') {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({ error: 'Content-Type must be application/json' }),
        };
    }

    try {
        // Create a mock request object from the event
        const mockRequest = {
            json: async () => JSON.parse(event.body || '{}')
        } as Request;

        // Pass the API key from the environment
        const apiKey = process.env.PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
        
        const result = await reviewAnswer({ 
            request: mockRequest,
            apiKey
        });

        return {
            statusCode: result.statusCode || 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: result.body || JSON.stringify({ message: 'Success' }),
        };
    } catch (error: any) {
        console.error('Error in review-answer handler:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({ error: error.message || 'An unknown error occurred' }),
        };
    }
};

export { handler };
