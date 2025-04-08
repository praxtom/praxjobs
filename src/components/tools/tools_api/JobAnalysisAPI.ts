export const PerformJobAnalysis = async ({ request }: { request: Request }) => {
  try {
    let requestData;
    try {
      requestData = await request.json();
    } catch (parseError) {
      throw new Error("Invalid request format: Unable to parse request body");
    }

    const {
      companyName = "Unknown Company",
      jobPosition = "Unknown Position",
      jobDescription,
    } = requestData;

    if (!jobDescription || typeof jobDescription !== "string") {
      throw new Error("Job description is required and must be a string");
    }

    const apiEndpoint =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    const apiKey = "AIzaSyB_JQtxtws-Xaupjk-9yh5EfXLeO18gU9s";

    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set in the environment variables."
      );
    }

    try {
      const systemPrompt = `You are an expert career advisor and job market analyst.
                        CRITICAL INSTRUCTIONS:
                        1. Output ONLY a valid JSON object
                        2. NO explanatory text or reasoning
                        3. NO markdown
                        4. Keep analysis concise
                        5. Use web search to find accurate, up-to-date information about the company, industry standards, and market data
                        6. Focus on providing specific, actionable insights.
                        7. Use the indian currency symbol (₹) for currency values.
                        8. Match this structure exactly:
${JSON.stringify(
  {
    jobRoleSummary: {
      title: "",
      seniorityLevel: "",
      keyResponsibilities: [],
      mainExpectations: [],
      reportingStructure: "",
      teamSize: "",
      workMode: "",
    },
    skillsAndQualifications: {
      hardSkills: [],
      softSkills: [],
      requiredCertifications: [],
      educationLevel: "",
      experienceRequired: "",
      preferredSkills: [],
    },
    compensationDetails: {
      baseSalaryRange: "",
      totalCompensationRange: "",
      equityDetails: {
        type: "",
        vestingSchedule: "",
        approximateValue: "",
      },
      benefits: {
        healthcare: [],
        retirement: [],
        additionalPerks: [],
      },
      bonusStructure: {
        type: "",
        frequency: "",
        amount: "",
      },
      industryComparison: "",
    },
    companyInsights: {
      name: "",
      size: "",
      industry: "",
      fundingDetails: {
        stage: "",
        totalRaised: "",
        lastRound: "",
        keyInvestors: [],
      },
      growth: {
        metrics: [],
        revenueRange: "",
        userGrowth: "",
      },
      culture: {
        values: [],
        workLifeBalance: "",
        learningOpportunities: "",
        diversityInitiatives: [],
      },
      employeeStats: {
        ratings: {
          overall: 0,
          workLifeBalance: 0,
          careerGrowth: 0,
          compensation: 0,
          culture: 0,
        },
        averageTenure: "",
        turnoverRate: "",
        promotionRate: "",
      },
      competitors: [],
    },
    careerGrowth: {
      promotionPath: [],
      learningBudget: "",
      mentorshipPrograms: [],
      skillDevelopmentOpportunities: [], // Explicitly define as an array
    },
    jobMarketTrends: {
      currentDemand: "",
      growthProjection: "",
      industryTrends: [],
      salaryTrends: "",
      skillsInDemand: [],
      competitorSalaries: [],
    },
    workCulture: {
      workSchedule: "",
      remotePolicy: "",
      workEnvironment: [],
      teamDynamics: "",
      managementStyle: "",
      redFlags: [],
      positiveIndicators: [],
    },
    applicationTips: {
      resumeAdvice: [],
      coverLetterTips: [],
      interviewPrep: {
        commonQuestions: [],
        technicalAssessment: "",
        processSteps: [],
      },
      negotiationTips: [],
    },
  },
  null,
  2
)}`;

      const userPrompt = `Perform a comprehensive analysis for the following job:
                        Company: ${companyName}
                        Position: ${jobPosition}
                        Job Description:${jobDescription}
                        Additional Context:
                        - Thoroughly research the company's background
                        - Analyze industry standards and market trends
                        - Provide insights specific to this role and company
                        - Use multiple reputable sources for information
                        - Use web search tool to get a broader understanding of the industry
                        - For array fields like skillDevelopmentOpportunities, provide multiple specific items as an array.
                        - Ensure each array field contains multiple relevant, distinct entries.`;

      const requestPayload = {
        contents: [
          {
            role: "user",
            parts: [{ text: systemPrompt + "\n\n" + userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192, // Increased token limit
        },
      };

      const response = await fetch(`${apiEndpoint}?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      const data = await response.json();

      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        console.error("Gemini API Response:", JSON.stringify(data, null, 2));
        throw new Error("No content received from the Gemini API");
      }

      // Simplified content cleaning
      const cleanedContent = content
        .trim()
        .replace(/^[^\{]*/, "")
        .replace(/[^\}]*$/, "");

      try {
        const responseData = JSON.parse(cleanedContent);
        return responseData;
      } catch (parseError) {
        console.error("Failed to parse Gemini API response:", parseError);
        console.error("Raw Gemini Response:", cleanedContent);
        throw new Error("Failed to parse job analysis response from Gemini");
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error("Gemini Job Analysis Error:", error.message);
      }
      throw error;
    }
  } catch (error) {
    throw error;
  }
};
