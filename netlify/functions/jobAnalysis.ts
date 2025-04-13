import { Handler, HandlerEvent } from "@netlify/functions"; // Added HandlerEvent
import {
  initializeFirebaseAdmin,
  verifyFirebaseToken,
} from "../../src/lib/firebaseAdmin"; // Import Firebase Admin functions
import { PerformJobAnalysis } from "../../src/components/tools/tools_api/JobAnalysisAPI";

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

  // Reduce logging for production
  console.log(`Incoming ${event.httpMethod} request to jobAnalysis`);

  // Handle OPTIONS request for CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers, // Use defined headers
      body: "", // Empty body for OPTIONS response
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
      "Job analysis request authenticated for UID:",
      authenticatedUserId
    ); // Keep optional log
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
    // Optional: Add basic validation for expected fields in event.body here
    // const bodyData = JSON.parse(event.body);
    // if (!bodyData.jobDescription || !bodyData.resumeText) { // Example check
    //   return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing required fields in body" }) };
    // }

    // Create a Request object that performJobAnalysis expects
    // Note: Passing the raw event.body might be simpler if PerformJobAnalysis handles parsing
    const request = new Request("http://localhost", {
      // The URL here is arbitrary as we only use the body/headers
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: event.body, // Pass the original body
    });

    // Pass the authenticated user ID to the analysis function if needed
    // Modify PerformJobAnalysis signature or pass it via request properties if necessary
    const analysis = await PerformJobAnalysis({
      request /*, userId: authenticatedUserId */,
    }); // Pass userId if needed

    // Minimal logging for production
    console.log(`Job analysis successful for user ${authenticatedUserId}`);

    if (!analysis || typeof analysis !== "object") {
      console.error(
        "Invalid analysis result structure received from PerformJobAnalysis"
      );
      throw new Error("Internal error processing analysis result."); // More generic error to client
    }

    return {
      statusCode: 200,
      headers, // Use defined headers
      body: JSON.stringify(analysis),
    };
  } catch (error) {
    console.error(
      `API Error during job analysis for user ${authenticatedUserId}:`,
      error
    ); // Log error with user context
    return {
      statusCode: 500,
      headers, // Use defined headers
      body: JSON.stringify({
        // Provide a more generic error message to the client
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      }),
    };
  }
};

export { handler };
