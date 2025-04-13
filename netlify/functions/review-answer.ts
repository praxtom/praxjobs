import { Handler, HandlerEvent } from "@netlify/functions"; // Added HandlerEvent
import { reviewAnswer } from "../../src/components/tools/tools_api/InterviewPrepAPI";
import {
  initializeFirebaseAdmin,
  verifyFirebaseToken,
} from "../../src/lib/firebaseAdmin"; // Import Firebase Admin functions

// Helper to extract token from Authorization header
const extractToken = (event: HandlerEvent): string | null => {
  const authHeader = event.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7); // Remove "Bearer " prefix
  }
  return null;
};

const handler: Handler = async (event, context) => {
  // Define allowed origin and standard headers
  const allowedOrigin = "https://praxjobs.com";
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization", // Added Authorization
  };

  // Handle OPTIONS request for CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers, // Use defined headers
      body: "",
    };
  }

  // Handle POST request
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers, // Use defined headers
      body: JSON.stringify({ message: "Method not allowed" }),
    };
  }

  // --- Authentication ---
  let authenticatedUserId: string;
  try {
    await initializeFirebaseAdmin();
    const token = extractToken(event);
    if (!token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Missing authentication token" }),
      };
    }
    const decodedToken = await verifyFirebaseToken(token);
    authenticatedUserId = decodedToken.uid;
    console.log(
      "Review answer request authenticated for UID:",
      authenticatedUserId
    ); // Optional log
  } catch (error: any) {
    console.error("Authentication error:", error);
    const statusCode = error.message?.includes("Firebase Admin not initialized")
      ? 500
      : 401;
    const errorMessage =
      statusCode === 401
        ? "Invalid or expired token"
        : "Authentication service error";
    return {
      statusCode,
      headers,
      body: JSON.stringify({ error: errorMessage }),
    };
  }
  // --- End Authentication ---

  // Validate body and content type AFTER authentication
  if (!event.body) {
    return {
      statusCode: 400,
      headers, // Use defined headers
      body: JSON.stringify({ error: "Request body is required" }),
    };
  }

  if (event.headers["content-type"] !== "application/json") {
    return {
      statusCode: 415, // Use 415 Unsupported Media Type
      headers, // Use defined headers
      body: JSON.stringify({ error: "Content-Type must be application/json" }),
    };
  }

  try {
    // Create a mock request object from the event body
    const mockRequest = {
      json: async () => JSON.parse(event.body!), // Use non-null assertion
    } as Request;

    // Call reviewAnswer (it uses GROQ_API_KEY internally from env vars)
    // No need to pass the unused OpenAI key anymore
    const result = await reviewAnswer({
      request: mockRequest /*, userId: authenticatedUserId */, // Pass userId if needed by reviewAnswer
    });

    // Assuming result contains { statusCode, body }
    return {
      statusCode: result.statusCode || 200,
      headers, // Use defined headers
      body: result.body || JSON.stringify({ message: "Success" }),
    };
  } catch (error: any) {
    console.error(
      `Error in review-answer handler for user ${authenticatedUserId}:`,
      error
    ); // Add user context
    return {
      statusCode: error.statusCode || 500,
      headers, // Use defined headers
      body: JSON.stringify({
        error: error.message || "An unknown error occurred reviewing answer",
      }),
    };
  }
};

export { handler };
