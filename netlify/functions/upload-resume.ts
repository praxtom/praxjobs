import { Handler, HandlerEvent } from "@netlify/functions"; // Added HandlerEvent
import { PdfReader } from "pdfreader";
import Groq from "groq-sdk";
import mammoth from "mammoth";
import {
  initializeFirebaseAdmin,
  verifyFirebaseToken,
} from "../../src/lib/firebaseAdmin"; // Import Firebase Admin functions

// Initialize Groq client
console.log("GROQ_API_KEY at runtime:", process.env.GROQ_API_KEY);
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY, // Ensure this is set in your Netlify environment variables
});

// Function to parse PDF files
async function parsePDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new PdfReader();
    let text = "";

    reader.parseBuffer(buffer, (err, item) => {
      if (err) {
        reject(new Error("Failed to parse PDF"));
      } else if (!item) {
        resolve(text); // Parsing complete
      } else if (item.text) {
        text += item.text + " "; // Append text
      }
    });
  });
}

// Function to parse Word files
async function parseWord(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value; // Extracted text from the Word file
  } catch (error) {
    console.error("Error parsing Word file:", error);
    throw new Error("Failed to parse Word file");
  }
}

// Function to clean resume text using Groq
async function cleanResumeText(
  rawText: string,
  customInstructions?: string
): Promise<string> {
  // Validate input text before processing
  if (!rawText || rawText.trim().length === 0) {
    return rawText;
  }

  if (!groq) {
    console.error("Groq client not initialized during cleaning attempt."); // Keep this error
    return rawText; // Return original text if Groq isn't ready
  }

  // Compose the system prompt, appending custom instructions if provided
  let systemPrompt = `You are a professional resume text cleaner.
- Preserve ALL original content
- Remove extra whitespaces
- Ensure consistent formatting
- Correct minor typographical errors
- Maintain original document structure
- Return ONLY the cleaned text
- Do NOT add or remove any information`;

  if (customInstructions && customInstructions.trim().length > 0) {
    systemPrompt += `\n\nAdditional user instructions:\n${customInstructions.trim()}`;
  }

  try {
    // Attempt AI call with explicit error handling
    let response;
    try {
      response = await groq.chat.completions.create({
        model: "gemma2-9b-it", // Updated to smallest Llama model
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: rawText,
          },
        ],
        // Add max_tokens to ensure full text processing
        max_tokens: 4096,
        // Lower temperature for more conservative changes
        temperature: 0.1,
      });
    } catch (aiCallError) {
      console.error("CRITICAL ERROR: Failed to call AI", aiCallError); // Keep critical error
      return rawText; // Return original text on AI call failure
    }

    // Safely extract content
    const content = response.choices?.[0]?.message?.content;

    // Return processed text
    return content && typeof content === "string" ? content.trim() : rawText;
  } catch (error) {
    // Comprehensive error logging
    console.error("FATAL ERROR in cleanResumeText:", error); // Keep fatal error

    // Always return original text on any error
    return rawText;
  }
}

// Helper to extract token from Authorization header
const extractToken = (event: HandlerEvent): string | null => {
  const authHeader = event.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7); // Remove "Bearer " prefix
  }
  return null;
};

// Main handler
const handler: Handler = async (event) => {
  // Define allowed origin
  const allowedOrigin = "https://praxjobs.com"; // Your production frontend domain

  // Set default CORS headers
  const headers = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization", // Added Authorization
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle CORS preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
    };
  }

  // Only allow POST requests (already implicitly handled by logic below, but good practice)
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed. Use POST." }),
    };
  }

  // --- Authentication ---
  let authenticatedUserId: string;
  try {
    // Initialize Firebase Admin
    await initializeFirebaseAdmin();

    // Extract token from header
    const token = extractToken(event);
    if (!token) {
      return {
        statusCode: 401, // Unauthorized
        headers,
        body: JSON.stringify({ error: "Missing authentication token" }),
      };
    }

    // Allow mock token in Netlify dev environment
    if (process.env.NETLIFY_DEV === "true" && token === "mockIdToken") {
      authenticatedUserId = "mockUserId123";
      console.log(
        "Dev mode: accepted mockIdToken for UID:",
        authenticatedUserId
      );
    } else {
      // Verify the token (production or real tokens)
      const decodedToken = await verifyFirebaseToken(token);
      authenticatedUserId = decodedToken.uid; // Use the verified UID
      console.log(
        "File upload request authenticated for UID:",
        authenticatedUserId
      ); // Optional logging
    }
  } catch (error: any) {
    console.error("Authentication error:", error);
    // Determine if it's an init error or token validation error
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

  try {
    // Parse the request body
    const { fileBase64, fileName, fileType, customInstructions } = JSON.parse(
      event.body || "{}"
    );

    // --- File Size Check ---
    const MAX_FILE_SIZE_MB = 10;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
    // Estimate buffer size from base64 length (approx 3/4)
    const estimatedBufferSize = fileBase64.length * 0.75;

    if (estimatedBufferSize > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File size exceeds limit of ${MAX_FILE_SIZE_MB}MB.`);
    }
    // --- End File Size Check ---

    // Decode the base64 file into a buffer
    const fileBuffer = Buffer.from(fileBase64, "base64");

    let extractedText: string;

    // Handle PDF files
    if (fileType === "application/pdf") {
      extractedText = await parsePDF(fileBuffer);
    }
    // Handle Word files
    else if (
      fileType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileType === "application/msword"
    ) {
      extractedText = await parseWord(fileBuffer);
    }
    // Unsupported file types
    else {
      throw new Error(
        "Unsupported file type. Only PDF and Word files are supported."
      );
    }

    // Clean the extracted text using Groq
    const cleanedText = await cleanResumeText(
      extractedText,
      customInstructions
    );

    // Return the cleaned text
    return {
      statusCode: 200,
      headers, // Add headers to success response
      body: JSON.stringify({
        success: true,
        data: { text: cleanedText },
      }),
    };
  } catch (error) {
    console.error("Error processing file:", error);
    // Determine status code based on error type if possible, default to 500
    const statusCode =
      error instanceof Error && error.message.includes("Unsupported file type")
        ? 415
        : 500;
    const isSizeError =
      error instanceof Error &&
      error.message.includes("File size exceeds limit");
    const clientErrorMessage = isSizeError
      ? error.message
      : statusCode === 415
      ? error.message
      : "An internal server error occurred while processing the file.";

    return {
      statusCode: isSizeError ? 413 : statusCode, // 413 Payload Too Large
      headers, // Add headers to error response
      body: JSON.stringify({
        success: false,
        error: clientErrorMessage,
      }),
    };
  }
};

export { handler };
