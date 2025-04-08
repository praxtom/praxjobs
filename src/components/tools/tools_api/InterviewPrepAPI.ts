import { Groq } from "groq-sdk";

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export const fetchInterviewQuestions = async ({
  request,
}: {
  request: Request;
}) => {
  try {
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      throw new Error("Invalid request format: Unable to parse request body");
    }

    const {
      companyName = "Unknown Company",
      jobRole = "Unknown Role",
      resume = "",
    } = requestData;

    if (!companyName || typeof companyName !== "string") {
      throw new Error("Company name is required and must be a string");
    }

    if (!jobRole || typeof jobRole !== "string") {
      throw new Error("Job role is required and must be a string");
    }

    const groq = new Groq({
      apiKey: process.env.PUBLIC_GROQ_API_KEY,
    });

    const requestPayload = {
      messages: [
        {
          role: "system" as const,
          content:
            `You are an expert interview coach with deep knowledge of industry-specific interview questions.
            CRITICAL INSTRUCTIONS:
            1. Output ONLY a valid JSON object
            2. NO explanatory text or reasoning
            3. NO markdown
            4. Keep analysis concise
            5. Use web search to find accurate, up-to-date information about the company, industry standards, and typical interview questions
            6. Focus on providing specific, actionable interview questions
            7. Provide 10 questions for each category
            8. Match this structure exactly:` +
            JSON.stringify({
              companySpecific: [
                {
                  question: "",
                  context: "",
                },
              ],
              roleSpecific: [
                {
                  question: "",
                  context: "",
                },
              ],
              behavioral: [
                {
                  question: "",
                  context: "",
                },
              ],
              technical: [
                {
                  question: "",
                  context: "",
                },
              ],
            }),
        },
        {
          role: "user" as const,
          content: `I have an upcoming interview at ${companyName} for the role of ${jobRole}. 
            Please research and provide me with likely interview questions in the four categories: 
            company-specific, role-specific, behavioral, and technical.
            
            Here is my resume for context:
            ${resume}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 4000,
      model: "qwen-2.5-32b",
    };

    const response = await groq.chat.completions.create(requestPayload);

    if (!response) {
      throw new Error("API request failed");
    }

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("API response content is empty");
    }

    // Parse the JSON response
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (parseError) {
      // console.error('Error parsing API response:', parseError) // Keep minimal for prod
      // console.debug('API response content:', content) // Removed for prod
      throw new Error("Failed to parse API response");
    }

    return {
      statusCode: 200,
      body: JSON.stringify(parsedContent),
    };
  } catch (error: any) {
    console.error("Error in fetchInterviewQuestions:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "An unknown error occurred",
      }),
    };
  }
};

export const reviewAnswer = async ({
  request,
  apiKey,
}: {
  request: Request;
  apiKey?: string;
}) => {
  try {
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      throw new Error("Invalid request format: Unable to parse request body");
    }

    const { question = "", answer = "", resume = "" } = requestData;

    if (!question || typeof question !== "string") {
      throw new Error("Question is required and must be a string");
    }

    if (!answer || typeof answer !== "string") {
      throw new Error("Answer is required and must be a string");
    }

    const groq = new Groq({
      apiKey: process.env.PUBLIC_GROQ_API_KEY,
    });

    const requestPayload = {
      messages: [
        {
          role: "system" as const,
          content:
            `You are an expert interview coach with deep knowledge of effective interview techniques.
            Your task is to review the candidate's answer to an interview question and provide constructive feedback and the approach to answer the question.
            CRITICAL INSTRUCTIONS:
            1. Output ONLY a valid JSON object
            2. NO explanatory text or reasoning
            3. NO markdown
            4. Use sentence case. Start each sentence with a capital letter for each sentence.
            5. Focus on providing specific, actionable feedback
            6. Match this structure exactly:` +
            JSON.stringify({
              strengths: [],
              weaknesses: [],
              improvements: [],
              alternativeApproach: "",
              overallRating: 0, // 1-10 scale
              suggestedAnswer: "",
              keyTakeaway: "",
            }),
        },
        {
          role: "user" as const,
          content: `I was asked this interview question: "${question}"
        
        My answer was: "${answer}"
        
        Here is my resume for context:
        ${resume}
        
        Please provide feedback on my answer.`,
        },
      ],
      temperature: 0.5,
      max_tokens: 4000,
      model: "llama-3.3-70b-specdec",
    };

    const response = await groq.chat.completions.create(requestPayload);

    if (!response) {
      throw new Error("API request failed");
    }

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("API response content is empty");
    }

    // Parse the JSON response
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (parseError) {
      // console.error('Error parsing API response:', parseError) // Keep minimal for prod
      // console.debug('API response content:', content) // Removed for prod
      throw new Error("Failed to parse API response");
    }

    return {
      statusCode: 200,
      body: JSON.stringify(parsedContent),
    };
  } catch (error: any) {
    console.error("Error in reviewAnswer:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "An unknown error occurred",
      }),
    };
  }
};
