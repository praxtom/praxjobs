import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import fetch from "node-fetch"; // Use node-fetch for backend requests
import { Readable } from "stream"; // Import Readable for streaming

// Helper to check if the request body is valid
interface RequestBody {
  jobDescription: string;
  resumeContent: string;
  templatePromptModifier: string;
  templateId: string;
  customInstructions: string;
}

function isValidRequestBody(body: any): body is RequestBody {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof body.jobDescription === "string" &&
    typeof body.resumeContent === "string" &&
    typeof body.templatePromptModifier === "string" &&
    typeof body.templateId === "string" &&
    typeof body.customInstructions === "string" // Can be empty
  );
}

const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
      headers: { Allow: "POST" },
    };
  }

  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
  if (!DEEPSEEK_API_KEY) {
    console.error("DEEPSEEK_API_KEY environment variable is not set.");
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal Server Error: API key not configured.",
      }),
    };
  }

  let requestBody: RequestBody;
  try {
    requestBody = JSON.parse(event.body || "{}");
    if (!isValidRequestBody(requestBody)) {
      throw new Error("Invalid request body structure.");
    }
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: `Bad Request: ${
          error instanceof Error ? error.message : "Invalid JSON"
        }`,
      }),
    };
  }

  const {
    jobDescription,
    resumeContent,
    templatePromptModifier,
    templateId,
    customInstructions,
  } = requestBody;

  // Construct the prompt for DeepSeek API
  const messages = [
    {
      role: "system",
      content: `Generate a professional cover letter based on the following job description and resume. Follow these guidelines:

1. Format:
   - Use plain text without markup or special formatting strictly
   - Standard sections: Greeting, Opening Paragraph, Body Paragraphs, Closing Paragraph
   - Use standard business letter formatting
   - Avoid tables, columns, or complex layouts
   - Do NOT include any explanatory text at the end of the cover letter
   - Return ONLY the cover letter text without any additional commentary

2. Content:
   - Address the letter to the hiring manager (or "Dear Hiring Manager" if name unknown)
   - Tailor the content to match specific job requirements
   - Highlight relevant skills and experiences from the resume
   - Use keywords from the job description
   - Demonstrate enthusiasm and fit for the role
   - Dont lie at all and stick to truth from the resume

3. Style:
   - Maintain professional and engaging language
   - Be specific and results-oriented
   - Show how your skills solve the employer's needs
   - Keep the tone conversational yet professional
   - Limit to one page

4. Template Specifications:
   ${templatePromptModifier}

Additional Context:
- Template Style: ${templateId}
- Custom Instructions: ${customInstructions || "None"}`,
    },
    {
      role: "user",
      content: `Job Description:\n${jobDescription}\n\nResume:\n${resumeContent}`,
    },
  ];

  try {
    const response = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: messages,
          stream: true,
          max_tokens: 3000,
          temperature: 0.5,
          top_p: 1,
        }),
      }
    );

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      console.error(
        `DeepSeek API Error: ${response.status} ${response.statusText}`,
        errorText
      );
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: `Failed to get response from AI service: ${errorText}`,
        }),
      };
    }

    // Stream the response back to the client
    // Netlify Functions expects the body to be a string or Buffer for streaming.
    // We need to adapt the Node stream from node-fetch to what Netlify expects.
    // For simplicity here, we'll buffer slightly, but a true stream pass-through is complex.
    // A common pattern is to return the Readable stream directly if the environment supports it.
    // Netlify Functions v2 might handle Node.js Readable streams better.
    // Let's return the stream directly and see if Netlify handles it.
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/event-stream", // Indicate streaming response
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
      // Directly pass the Readable stream from node-fetch response.body
      // Note: This requires Netlify's environment to correctly handle Node.js streams.
      // If this causes issues, an alternative is buffering or using Web Streams API if available.
      body: response.body as unknown as string, // Cast needed as types might mismatch
      isBase64Encoded: false, // Ensure this is false for streaming text
    };
  } catch (error) {
    console.error("Error calling DeepSeek API:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: `Internal Server Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      }),
    };
  }
};

export { handler };
