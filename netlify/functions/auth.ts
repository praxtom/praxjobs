import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*', // Consider restricting this in production
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };

  // Handle preflight requests (CORS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204, // No Content
      headers,
    };
  }

  // Simple routing based on path
  // Note: For more complex routing, consider a framework or library
  if (event.path.endsWith('/login')) {
    // --- Handle POST requests to /login ---
    if (event.httpMethod === 'POST') {
      try {
        const body = JSON.parse(event.body || '{}');
        const { token } = body;

        if (!token) {
          return {
            statusCode: 400, // Bad Request
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'No token provided' }),
          };
        }

        // --- Placeholder for Token Validation ---
        // In a real application, you would validate the token here.
        // This might involve verifying it with Firebase Admin SDK, checking an external provider, etc.
        // Example: const decodedToken = await auth.verifyIdToken(token);
        // If validation fails, return a 401 or 403 status code.
        const isValidToken = true; // Replace with actual validation logic

        if (!isValidToken) {
           return {
            statusCode: 401, // Unauthorized
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Invalid or expired token' }),
          };
        }
        // --- End Placeholder ---


        // Token is assumed valid for this example
        return {
          statusCode: 200, // OK
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true, message: 'Login successful (token received)' }), // Added message
        };

      } catch (error) {
        // Removed console.error('Login error:', error);

        // Log errors to your monitoring service in production instead of console
        // e.g., logToSentry(error);

        return {
          statusCode: 500, // Internal Server Error
          headers: { ...headers, 'Content-Type': 'application/json' },
          // Avoid sending detailed error messages to the client in production
          body: JSON.stringify({ error: 'An internal server error occurred during login.' }),
        };
      }
    }

    // --- Handle GET requests to /login ---
    if (event.httpMethod === 'GET') {
      // Typically, a GET request to a /login endpoint might redirect or serve a page.
      // Returning JSON might be for API health checks or info.
      return {
        statusCode: 200, // OK
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Login endpoint is active. Use POST to log in.' }), // More informative message
      };
    }

    // --- Handle other methods to /login ---
    return {
        statusCode: 405, // Method Not Allowed
        headers,
        body: JSON.stringify({ error: `Method ${event.httpMethod} not allowed for /login`})
    }
  }

  // --- Handle unknown endpoints ---
  return {
    statusCode: 404, // Not Found
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: `Endpoint not found: ${event.path}` }), // More specific error
  };
};