import { Handler, HandlerEvent } from "@netlify/functions"; // Combined imports
import { AICopilot } from "../../src/lib/ai-copilot/copilot";
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

export const handler: Handler = async (event) => {
  // Define allowed origin and standard headers
  const allowedOrigin = "https://praxjobs.com";
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization", // Added Authorization
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
    };
  }

  if (event.httpMethod === "POST") {
    // --- Authentication removed: All requests allowed without token ---

    try {
      // Validate body AFTER authentication
      if (!event.body) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Request body is required" }),
        };
      }
      const body = JSON.parse(event.body);
      const { message, mode = "careerGuidance" } = body;

      if (!message) {
        return {
          statusCode: 400,
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Message is required" }),
        };
      }

      // RENAMED Environment Variable
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        console.error("Groq API Key is missing"); // Keep server-side log
        return {
          statusCode: 503, // Service Unavailable
          headers, // Use defined headers
          body: JSON.stringify({
            error: "AI Copilot service is temporarily unavailable.",
          }), // Generic client message
        };
      }

      const copilot = new AICopilot(apiKey);
      const response = await copilot.chat(message, mode);

      return {
        statusCode: 200,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ success: true, data: response }),
      };
    } catch (error) {
      console.error("AI Copilot Error:", error);
      return {
        statusCode: 500,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  }

  return {
    statusCode: 404,
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ error: "Not found" }),
  };
};
