import { Handler, HandlerEvent } from "@netlify/functions"; // Added HandlerEvent for typing
import {
  initializeFirebaseAdmin,
  verifyFirebaseToken,
} from "../../src/lib/firebaseAdmin"; // Import necessary functions

export const handler: Handler = async (event, context) => {
  // Define allowed origin early
  const allowedOrigin = "https://praxjobs.com"; // Your production frontend domain

  // Define CORS headers early
  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization", // Added Authorization for token passing
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };

  console.log("[Auth Function Debug] Handler invoked for path:", event.path); // Log invocation

  // Initialize Firebase Admin SDK (ensure it's ready)
  try {
    console.log("[Auth Function Debug] Initializing Firebase Admin..."); // Log init attempt
    await initializeFirebaseAdmin();
    console.log(
      "[Auth Function Debug] Firebase Admin initialized successfully."
    ); // Log init success
  } catch (initError) {
    console.error(
      "[Auth Function Debug] Firebase Admin Init Error:",
      initError
    ); // Log init error
    // Return a generic error to avoid leaking details
    // CRITICAL: Return CORS headers even on initialization failure!
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }, // Add CORS headers here
      body: JSON.stringify({ error: "Internal server configuration error." }),
    };
  }

  // Handle preflight requests (CORS)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204, // No Content
      headers: corsHeaders, // Use the defined CORS headers
    };
  }

  // Simple routing based on path
  // Note: For more complex routing, consider a framework or library
  if (event.path.endsWith("/login")) {
    // --- Handle POST requests to /login ---
    if (event.httpMethod === "POST") {
      try {
        const body = JSON.parse(event.body || "{}");
        console.log("[Auth Function Debug] Handling /login POST request."); // Log POST handling
        // Try to extract token from Authorization header first (like upload-resume)
        let token: string | undefined = undefined;
        const authHeader = event.headers.authorization;
        console.log(
          "[Auth Function Debug] Authorization Header:",
          authHeader ? authHeader.substring(0, 15) + "..." : "Not present"
        ); // Log header (truncated)
        if (authHeader && authHeader.startsWith("Bearer ")) {
          token = authHeader.substring(7);
          console.log(
            "[Auth Function Debug] Token extracted from Header:",
            token ? token.substring(0, 20) + "..." : "null"
          ); // Log token from header
        } else {
          // Fallback: try to get token from body for backward compatibility
          const { token: bodyToken } = body;
          token = bodyToken;
          console.log(
            "[Auth Function Debug] Token extracted from Body:",
            token ? token.substring(0, 20) + "..." : "null"
          ); // Log token from body
        }

        if (!token) {
          console.log(
            "[Auth Function Debug] No token found in header or body."
          ); // Log missing token
          return {
            statusCode: 400, // Bad Request
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ error: "No token provided" }),
          };
        }

        // --- Actual Token Validation ---
        try {
          console.log("[Auth Function Debug] Attempting token verification..."); // Log verification attempt
          // Verify the token using Firebase Admin SDK
          const decodedToken = await verifyFirebaseToken(token);
          // Optional: You could add checks based on decodedToken claims if needed
          console.log(
            "[Auth Function Debug] Token verified successfully for UID:",
            decodedToken.uid
          ); // Log success
        } catch (validationError) {
          console.error(
            "[Auth Function Debug] Token validation error:",
            validationError
          ); // Log the actual error
          // Return 401 Unauthorized for invalid or expired tokens
          return {
            statusCode: 401, // Unauthorized
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Invalid or expired token" }),
          };
        }
        // --- End Token Validation ---

        // Token is valid if we reach here
        return {
          statusCode: 200, // OK
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Login endpoint is active. Use POST to log in.",
        }), // More informative message
      };
    }

    // --- Handle other methods to /login ---
    return {
      statusCode: 405, // Method Not Allowed
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        error: `Method ${event.httpMethod} not allowed for /login`,
      }),
    };
  }

  // --- Handle unknown endpoints ---
  return {
    statusCode: 404, // Not Found
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ error: `Endpoint not found: ${event.path}` }), // More specific error
  };
};
