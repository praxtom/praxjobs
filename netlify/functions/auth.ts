import { Handler } from "@netlify/functions";
import {
  initializeFirebaseAdmin,
  verifyFirebaseToken,
} from "../../src/lib/firebaseAdmin"; // Import necessary functions

export const handler: Handler = async (event, context) => {
  // Initialize Firebase Admin SDK (ensure it's ready)
  // Note: verifyFirebaseToken also calls initializeFirebaseAdmin if needed,
  // but calling it here ensures it's done early.
  try {
    await initializeFirebaseAdmin();
  } catch (initError) {
    console.error("Firebase Admin Init Error in Auth Function:", initError);
    // Return a generic error to avoid leaking details
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server configuration error." }),
    };
  }

  // Define allowed origin
  const allowedOrigin = "https://praxjobs.com"; // Your production frontend domain

  // Enable CORS
  const headers = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization", // Added Authorization for token passing
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };

  // Handle preflight requests (CORS)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204, // No Content
      headers,
    };
  }

  // Simple routing based on path
  // Note: For more complex routing, consider a framework or library
  if (event.path.endsWith("/login")) {
    // --- Handle POST requests to /login ---
    if (event.httpMethod === "POST") {
      try {
        const body = JSON.parse(event.body || "{}");
        const { token } = body;

        if (!token) {
          return {
            statusCode: 400, // Bad Request
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ error: "No token provided" }),
          };
        }

        // --- Actual Token Validation ---
        try {
          // Verify the token using Firebase Admin SDK
          const decodedToken = await verifyFirebaseToken(token);
          // Optional: You could add checks based on decodedToken claims if needed
          console.log("Token verified for UID:", decodedToken.uid); // Log success for debugging (consider removing in prod)
        } catch (validationError) {
          console.error("Token validation error:", validationError); // Log the actual error server-side
          // Return 401 Unauthorized for invalid or expired tokens
          return {
            statusCode: 401, // Unauthorized
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Invalid or expired token" }),
          };
        }
        // --- End Token Validation ---

        // Token is valid if we reach here
        return {
          statusCode: 200, // OK
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            success: true,
            message: "Login successful (token received)",
          }), // Added message
        };
      } catch (error) {
        // Removed console.error('Login error:', error);

        // Log errors to your monitoring service in production instead of console
        // e.g., logToSentry(error);

        return {
          statusCode: 500, // Internal Server Error
          headers: { ...headers, "Content-Type": "application/json" },
          // Avoid sending detailed error messages to the client in production
          body: JSON.stringify({
            error: "An internal server error occurred during login.",
          }),
        };
      }
    }

    // --- Handle GET requests to /login ---
    if (event.httpMethod === "GET") {
      // Typically, a GET request to a /login endpoint might redirect or serve a page.
      // Returning JSON might be for API health checks or info.
      return {
        statusCode: 200, // OK
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Login endpoint is active. Use POST to log in.",
        }), // More informative message
      };
    }

    // --- Handle other methods to /login ---
    return {
      statusCode: 405, // Method Not Allowed
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        error: `Method ${event.httpMethod} not allowed for /login`,
      }),
    };
  }

  // --- Handle unknown endpoints ---
  return {
    statusCode: 404, // Not Found
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ error: `Endpoint not found: ${event.path}` }), // More specific error
  };
};
