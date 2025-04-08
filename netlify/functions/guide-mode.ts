import { Handler } from "@netlify/functions";
import { SYSTEM_PROMPTS } from "../../src/lib/ai-copilot/config";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

export const handler: Handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*", // Adjust in production for security
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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

  try {
    const body = JSON.parse(event.body || "{}");
    const { message } = body;

    if (!message || typeof message !== "string") {
      return {
        statusCode: 400,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Message is required and must be a string",
        }),
      };
    }

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
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite", // Using the latest flash model
    });

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

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: SYSTEM_PROMPTS.careerDiscussion,
            },
          ],
        },
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
