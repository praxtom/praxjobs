import { Handler } from "@netlify/functions";

import { PerformJobAnalysis } from "../../src/components/tools/tools_api/JobAnalysisAPI";

const handler: Handler = async (event, context) => {
  console.log(
    "Incoming request:",
    JSON.stringify(
      {
        method: event.httpMethod,
        headers: event.headers,
        body: event.body ? JSON.parse(event.body) : null,
      },
      null,
      2
    )
  ); // Detailed logging of incoming request

  // Handle OPTIONS request for CORS
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  // Handle POST request
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ message: "Method not allowed" }),
    };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ error: "Request body is required" }),
    };
  }

  if (event.headers["content-type"] !== "application/json") {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({ error: "Content-Type must be application/json" }),
    };
  }

  try {
    // Create a Request object that performJobAnalysis expects
    const request = new Request("http://localhost", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: event.body,
    });

    const analysis = await PerformJobAnalysis({ request });
    console.log("Analysis result:", JSON.stringify(analysis, null, 2)); // Detailed logging of analysis result

    if (!analysis || typeof analysis !== "object") {
      throw new Error("Invalid analysis result received");
    }

    const response = {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify(analysis),
    };
    console.log("Outgoing response:", JSON.stringify(response, null, 2)); // Detailed logging of outgoing response
    return response;
  } catch (error) {
    console.error("API Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },

      body: JSON.stringify({
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      }),
    };
  }
};

export { handler };
