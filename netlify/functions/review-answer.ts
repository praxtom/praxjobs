import { Handler, HandlerEvent } from "@netlify/functions"; // Added HandlerEvent
import { reviewAnswer } from "../../src/components/tools/tools_api/InterviewPrepAPI";

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

  // --- Authentication removed: All requests allowed without token ---
  // Authentication log removed
  // --- Authentication fully removed ---

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
    console.error(`Error in review-answer handler:`, error); // Add user context
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
