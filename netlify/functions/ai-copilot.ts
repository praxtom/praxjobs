import { Handler } from '@netlify/functions';
import { AICopilot } from '../../src/lib/ai-copilot/copilot';

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { message, mode = 'careerGuidance' } = body;
      
      if (!message) {
        return {
          statusCode: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Message is required' })
        };
      }

      const apiKey = process.env.PUBLIC_GROQ_API_KEY;
      if (!apiKey) {
        console.error('Groq API Key is missing');
        return {
          statusCode: 503,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'AI Copilot service is not available - missing API key' })
        };
      }

      const copilot = new AICopilot(apiKey);
      const response = await copilot.chat(message, mode);

      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, data: response })
      };
    } catch (error) {
      console.error('AI Copilot Error:', error);
      return {
        statusCode: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Internal server error' })
      };
    }
  }

  return {
    statusCode: 404,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Not found' })
  };
};
