import { Handler } from "@netlify/functions";
import { SYSTEM_PROMPTS } from "../../src/lib/ai-copilot/config";
import type { CopilotMode } from "../../src/lib/ai-copilot/types"; // Import CopilotMode type
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { HandlerEvent } from "@netlify/functions"; // Added HandlerEvent
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

  // Handle preflight requests for CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405, // Method Not Allowed
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  // --- Main Logic ---
  try {
    // Initialize Firebase Admin *once* if needed for any path,
    // or move initialization inside the conditional block if only needed there.
    // For simplicity here, let's assume it might be needed elsewhere or init is idempotent.
    await initializeFirebaseAdmin();

    // Validate body first
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Request body is required" }),
      };
    }
    const body = JSON.parse(event.body);
    // Destructure 'mode' from the body, default to 'careerDiscussion'
    const { message, history, mode = "careerDiscussion" } = body;

    // --- Conditional Authentication ---
    // Only authenticate if the mode is NOT heroConcise
    if (mode !== "heroConcise") {
      let authenticatedUserId: string; // Define userId here for this scope
      try {
        await initializeFirebaseAdmin(); // Ensure initialized
        const token = extractToken(event);
        if (!token) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: "Missing authentication token" }),
          };
        }
        const decodedToken = await verifyFirebaseToken(token);
        authenticatedUserId = decodedToken.uid; // Assign userId
        console.log(
          `Guide Mode request authenticated for UID: ${authenticatedUserId} (Mode: ${mode})`
        );
      } catch (error: any) {
        console.error(`Authentication error (Mode: ${mode}):`, error);
        const statusCode = error.message?.includes(
          "Firebase Admin not initialized"
        )
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
    } else {
      console.log(`Skipping authentication for heroConcise mode.`); // Optional log
    }
    // --- End Conditional Authentication ---

    // Validate message presence AFTER potentially skipping auth
    if (!message || typeof message !== "string") {
      return {
        statusCode: 400,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Message is required and must be a string",
        }),
      };
    }

    const conversationHistory = Array.isArray(history) ? history : [];

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Gemini API Key is missing");
      return {
        statusCode: 503, // Service Unavailable
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Guide Mode service is not available - missing API key",
        }),
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Determine the model based on the mode
    const modelName =
      mode === "heroConcise"
        ? "gemini-1.5-flash" // Use specified model for heroConcise
        : "gemini-2.0-flash-lite"; // Default model

    const model = genAI.getGenerativeModel({ model: modelName });
    console.log(`Using model: ${modelName} for mode: ${mode}`); // Optional log

    // Basic safety settings - adjust as needed
    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];

    const generationConfig = {
      temperature: 0.9, // Adjust creativity/randomness
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048, // Adjust response length limit
    };

    // Determine the system prompt based on the mode - Moved outside the generateContent call
    const systemPromptKey =
      mode === "heroConcise" ? "heroConcise" : "careerDiscussion";
    const systemPromptText =
      SYSTEM_PROMPTS[systemPromptKey as CopilotMode] ||
      SYSTEM_PROMPTS.careerDiscussion; // Fallback

    const result = await model.generateContent({
      contents: [
        {
          role: "user", // Treat system prompt as initial user message for Gemini
          parts: [{ text: systemPromptText }],
        },
        ...conversationHistory, // Include past messages if provided
        {
          role: "user",
          parts: [{ text: message }],
        },
      ],
      generationConfig,
      safetySettings,
    });

    if (!result.response) {
      console.error("Gemini API did not return a response:", result);
      throw new Error("No response received from the AI model.");
    }

    const responseText = result.response.text();

    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, data: responseText }),
    };
  } catch (error: any) {
    console.error("Guide Mode Error:", error);
    // Check if it's a Gemini API error (e.g., blocked due to safety)
    if (error.message && error.message.includes("response was blocked")) {
      return {
        statusCode: 400, // Bad Request might be appropriate here
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Request blocked due to safety settings.",
          details: error.message,
        }),
      };
    }
    // General internal error
    return {
      statusCode: 500,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Internal server error",
        details: error.message || "An unknown error occurred",
      }),
    };
  }
};
