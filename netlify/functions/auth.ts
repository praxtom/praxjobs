import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  // Handle login endpoint
  if (event.path.endsWith('/login')) {
    if (event.httpMethod === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { token } = body;

        if (!token) {
          return {
            statusCode: 400,
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'No token provided' })
          };
        }

        // Here you would typically validate the token and perform any necessary operations
        // For now, we'll just return success
        return {
          statusCode: 200,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true })
        };
      } catch (error) {
        console.error('Login error:', error);
        return {
          statusCode: 500,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Internal server error' })
        };
      }
    }

    // Handle GET request to login endpoint
    if (event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Login endpoint is available' })
      };
    }
  }

  // Handle unknown endpoints
  return {
    statusCode: 404,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Not found' })
  };
};
