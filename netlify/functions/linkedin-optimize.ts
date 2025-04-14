import type { Handler, HandlerEvent } from "@netlify/functions"; // Added HandlerEvent
import { Groq } from "groq-sdk";
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

// Moved Groq client initialization inside processOptimization

export const handler: Handler = async (event) => {
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
      headers,
      body: "",
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: "Method not allowed" }),
    };
  }

  // --- Authentication removed: All requests allowed without token ---
  // --- Authentication fully removed ---

  try {
    // Validate body AFTER authentication
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Request body is required" }),
      };
    }
    // Validate Content-Type
    if (event.headers["content-type"] !== "application/json") {
      return {
        statusCode: 415, // Unsupported Media Type
        headers,
        body: JSON.stringify({
          error: "Content-Type must be application/json",
        }),
      };
    }

    const body = JSON.parse(event.body);

    // Validate required fields
    if (!body.linkedinContent || !body.resumeContent) {
      return {
        statusCode: 400,
        headers, // Add headers
        body: JSON.stringify({
          error: "LinkedIn content and resume content are required",
        }),
      };
    }

    // Process optimization with AI (pass userId if needed)
    const optimizedProfile = await processOptimization({
      linkedinContent: body.linkedinContent,
      resumeContent: body.resumeContent,
      jobTitle: body.jobTitle || "",
      industry: body.industry || "",
      careerGoals: body.careerGoals || "",
      // userId: authenticatedUserId // Pass userId if processOptimization needs it
    });

    return {
      statusCode: 200,
      headers, // Add headers
      body: JSON.stringify(optimizedProfile),
    };
  } catch (error: any) {
    console.error(`Error processing linkedin-optimize request:`, error); // Add user context
    return {
      statusCode: error.statusCode || 500, // Use status code from error if available
      headers, // Add headers
      body: JSON.stringify({
        error: error.message || "Failed to optimize profile",
      }),
    };
  }
};

async function processOptimization(params: {
  linkedinContent: string;
  resumeContent: string;
  jobTitle?: string;
  industry?: string;
  careerGoals?: string;
  // userId?: string; // Add if needed
}) {
  try {
    // Initialize Groq client here, where it's needed
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    // Create a prompt for the AI model
    const prompt = `
You are a professional LinkedIn profile optimizer with expertise in personal branding and career development, similar to Resume Worded.
Given the following LinkedIn profile content and resume information, please provide a comprehensive optimization analysis with detailed scoring and actionable recommendations:

LinkedIn Profile Content:
${params.linkedinContent}

Resume Content:
${params.resumeContent}
${params.jobTitle ? `\nDesired Job Title: ${params.jobTitle}` : ""}
${params.industry ? `\nIndustry: ${params.industry}` : ""}
${params.careerGoals ? `\nCareer Goals: ${params.careerGoals}` : ""}

Please provide the following in your analysis:

1. OVERALL PROFILE SCORE: Provide an overall score (0-100) for the LinkedIn profile based on industry best practices and recruiter preferences.

2. SECTION-BY-SECTION SCORING: Score each section of the profile on a scale of 0-100 and provide specific recommendations:
   - Profile Photo & Background Image (visual branding)
   - Headline (keyword optimization and impact)
   - About/Summary (storytelling, keywords, and value proposition)
   - Experience (accomplishments, metrics, keywords)
   - Education (relevance and completeness)
   - Skills & Endorsements (relevance to target roles)
   - Recommendations (quality and quantity)
   - Accomplishments (projects, publications, certifications)
   - Activity (engagement and content sharing)

3. PROFILE COMPLETENESS: Analyze the LinkedIn profile for completeness. Check for essential sections and provide a completeness score (0-100%) with detailed breakdown of missing and incomplete sections.

4. KEYWORD OPTIMIZATION: Identify keyword gaps between the resume and LinkedIn profile. Extract 15-20 relevant industry and skill keywords that should be incorporated throughout the profile, with specific placement recommendations.

5. ATS OPTIMIZATION: Analyze how well the profile would perform in Applicant Tracking Systems. Provide specific recommendations to improve visibility to recruiters.

6. HEADLINE MAKEOVER: Provide 3-5 alternative headline options that are attention-grabbing, keyword-optimized, and aligned with industry standards. Include explanation of why each works well.

7. SUMMARY REWRITE: Create a compelling, keyword-rich LinkedIn summary (500-600 characters) that highlights key achievements, skills, and career aspirations. Include a before/after comparison highlighting improvements.

8. EXPERIENCE ENHANCEMENT: For each job listed, provide specific recommendations to improve impact statements, incorporate relevant keywords, and highlight quantifiable achievements.

9. SKILLS PRIORITIZATION: Suggest 10-12 key skills the user should prioritize for endorsements based on their career trajectory and target roles, organized by importance.

10. CONTENT & ENGAGEMENT STRATEGY: Suggest 5-7 types of content the user should post or engage with to increase their visibility in their industry, with specific examples for each type.

11. NETWORK BUILDING RECOMMENDATIONS: Provide strategic recommendations for expanding their professional network to increase profile visibility and job opportunities.

12. COMPETITIVE ANALYSIS: Compare the profile to industry standards and provide insights on how to stand out from peers in the same field.

Please format your response as JSON with the following structure:
{
  "overallScore": 75,
  "sectionScores": [
    {"section": "Profile Photo & Background", "score": 70, "recommendations": ["Add a professional background image related to your industry", "Ensure your profile photo shows your face clearly with professional attire"]},
    {"section": "Headline", "score": 65, "recommendations": ["Include key industry terms", "Highlight your specialization"]},
    {"section": "About/Summary", "score": 60, "recommendations": ["Add more quantifiable achievements", "Incorporate more industry keywords"]},
    {"section": "Experience", "score": 75, "recommendations": ["Add metrics to demonstrate impact", "Use more action verbs"]},
    {"section": "Education", "score": 90, "recommendations": ["Add relevant coursework", "Mention academic achievements"]},
    {"section": "Skills & Endorsements", "score": 80, "recommendations": ["Reorder skills to prioritize most relevant ones", "Remove outdated skills"]},
    {"section": "Recommendations", "score": 50, "recommendations": ["Request recommendations from supervisors", "Provide specific recommendation requests"]},
    {"section": "Accomplishments", "score": 60, "recommendations": ["Add relevant projects", "Include certifications"]},
    {"section": "Activity", "score": 40, "recommendations": ["Increase posting frequency", "Engage with industry content"]}
  ],
  "profileCompleteness": {
    "score": 75,
    "missingSections": ["Background Image", "Recommendations"],
    "incompleteSection": ["Summary is too short", "Skills section needs more industry-specific keywords"]
  },
  "keywordOptimization": {
    "missingKeywords": ["keyword1", "keyword2", "keyword3"],
    "keywordSuggestions": [
      {"keyword": "Project Management", "placement": "Add to headline and experience section"},
      {"keyword": "Data Analysis", "placement": "Add to skills and summary"}
    ]
  },
  "atsOptimization": {
    "score": 65,
    "recommendations": ["Include more industry-standard job titles", "Add more technical skills in the skills section"]
  },
  "optimizedSummary": "The optimized LinkedIn summary text",
  "headlineSuggestions": [
    {"headline": "Option 1", "explanation": "This headline works because..."},
    {"headline": "Option 2", "explanation": "This headline is effective because..."},
    {"headline": "Option 3", "explanation": "This headline stands out because..."}
  ],
  "experienceEnhancements": [
    {"company": "Company Name", "recommendations": ["Add metrics to first bullet point", "Incorporate leadership keywords"]}
  ],
  "skillEndorsements": [
    {"category": "Technical Skills", "skills": ["skill1", "skill2"]},
    {"category": "Soft Skills", "skills": ["skill3", "skill4"]},
    {"category": "Industry Knowledge", "skills": ["skill5", "skill6"]}
  ],
  "contentStrategy": [
    {"contentType": "Industry Insights", "description": "Share analysis of trends in your industry", "example": "Example post: 'Just read the latest report on [industry trend]. Here are my three key takeaways for professionals in our field...'"},
    {"contentType": "Project Showcases", "description": "Highlight successful projects with measurable outcomes", "example": "Example post: 'Excited to share that our team just completed [project] resulting in [specific metric improvement]...'"},
    {"contentType": "Thought Leadership", "description": "Share your unique perspective on industry challenges", "example": "Example post: 'Many professionals struggle with [common challenge]. Here's my approach to solving this...'"}
  ],
  "networkingRecommendations": [
    "Connect with alumni from your university who work in target companies",
    "Join and actively participate in 2-3 industry-specific LinkedIn groups",
    "Follow and engage with thought leaders in your target industry"
  ],
  "competitiveAnalysis": {
    "industryStandards": "Most professionals in your field highlight [specific skills/experiences]",
    "differentiators": ["Emphasize your unique experience with [specific technology/methodology]", "Highlight your cross-functional expertise"]
  }
}
`;

    // Call the Groq API with the llama-3.1-8b-instant model
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-specdec",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    // Parse the response
    const responseContent = completion.choices[0]?.message?.content || "{}";
    const optimizationResult = JSON.parse(responseContent);

    return {
      overallScore: optimizationResult.overallScore || 0,
      sectionScores: optimizationResult.sectionScores || [],
      profileCompleteness: optimizationResult.profileCompleteness || {
        score: 0,
        missingSections: [],
        incompleteSection: [],
      },
      keywordOptimization: optimizationResult.keywordOptimization || {
        missingKeywords: [],
        keywordSuggestions: [],
      },
      atsOptimization: optimizationResult.atsOptimization || {
        score: 0,
        recommendations: [],
      },
      optimizedSummary:
        optimizationResult.optimizedSummary || "No optimized summary generated",
      headlineSuggestions: optimizationResult.headlineSuggestions || [],
      experienceEnhancements: optimizationResult.experienceEnhancements || [],
      skillEndorsements: optimizationResult.skillEndorsements || [],
      contentStrategy: optimizationResult.contentStrategy || [],
      networkingRecommendations:
        optimizationResult.networkingRecommendations || [],
      competitiveAnalysis: optimizationResult.competitiveAnalysis || {
        industryStandards: "",
        differentiators: [],
      },
    };
  } catch (error) {
    // console.error('Error in AI processing:', error) // Removed for prod
    throw new Error("Failed to process optimization with AI");
  }
}
