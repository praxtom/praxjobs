export const performJobAnalysis = async ({ request }: { request: Request }) => {
  try {
    let requestData
    try {
      requestData = await request.json()
    } catch (parseError) {
      throw new Error('Invalid request format: Unable to parse request body')
    }

    const {
      companyName = 'Unknown Company',
      jobPosition = 'Unknown Position',
      jobDescription
    } = requestData

    if (!jobDescription || typeof jobDescription !== 'string') {
      throw new Error('Job description is required and must be a string')
    }

    const apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions'

    try {
      const requestPayload = {
        model: 'qwen-2.5-32b',
        messages: [
          {
            role: 'system',
            content:
              `You are an expert career advisor and job market analyst. 
                        CRITICAL INSTRUCTIONS:\n
                        1. Output ONLY a valid JSON object\n
                        2. NO explanatory text or reasoning\n
                        3. NO markdown\n
                        4. Keep analysis concise\n
                        5. Use web search to find accurate, up-to-date information about the company, industry standards, and market data\n
                        6. Focus on providing specific, actionable insights.\n
                        7. Use the indian currency symbol (₹) for currency values.\n
                        8. Match this structure exactly:\n` +
              JSON.stringify(
                {
                  jobRoleSummary: {
                    title: '',
                    seniorityLevel: '',
                    keyResponsibilities: [],
                    mainExpectations: [],
                    reportingStructure: '',
                    teamSize: '',
                    workMode: ''
                  },
                  skillsAndQualifications: {
                    hardSkills: [],
                    softSkills: [],
                    requiredCertifications: [],
                    educationLevel: '',
                    experienceRequired: '',
                    preferredSkills: []
                  },
                  compensationDetails: {
                    baseSalaryRange: '',
                    totalCompensationRange: '',
                    equityDetails: {
                      type: '',
                      vestingSchedule: '',
                      approximateValue: ''
                    },
                    benefits: {
                      healthcare: [],
                      retirement: [],
                      additionalPerks: []
                    },
                    bonusStructure: {
                      type: '',
                      frequency: '',
                      amount: ''
                    },
                    industryComparison: ''
                  },
                  companyInsights: {
                    name: '',
                    size: '',
                    industry: '',
                    fundingDetails: {
                      stage: '',
                      totalRaised: '',
                      lastRound: '',
                      keyInvestors: []
                    },
                    growth: {
                      metrics: [],
                      revenueRange: '',
                      userGrowth: ''
                    },
                    culture: {
                      values: [],
                      workLifeBalance: '',
                      learningOpportunities: '',
                      diversityInitiatives: []
                    },
                    employeeStats: {
                      ratings: {
                        overall: 0,
                        workLifeBalance: 0,
                        careerGrowth: 0,
                        compensation: 0,
                        culture: 0
                      },
                      averageTenure: '',
                      turnoverRate: '',
                      promotionRate: ''
                    },
                    competitors: []
                  },
                  careerGrowth: {
                    promotionPath: [],
                    learningBudget: '',
                    mentorshipPrograms: [],
                    skillDevelopmentOpportunities: [] // Explicitly define as an array
                  },
                  jobMarketTrends: {
                    currentDemand: '',
                    growthProjection: '',
                    industryTrends: [],
                    salaryTrends: '',
                    skillsInDemand: [],
                    competitorSalaries: []
                  },
                  workCulture: {
                    workSchedule: '',
                    remotePolicy: '',
                    workEnvironment: [],
                    teamDynamics: '',
                    managementStyle: '',
                    redFlags: [],
                    positiveIndicators: []
                  },
                  applicationTips: {
                    resumeAdvice: [],
                    coverLetterTips: [],
                    interviewPrep: {
                      commonQuestions: [],
                      technicalAssessment: '',
                      processSteps: []
                    },
                    negotiationTips: []
                  }
                },
                null,
                2
              )
          },
          {
            role: 'user',
            content: `Perform a comprehensive analysis for the following job:\n
                        Company: ${companyName}\n
                        Position: ${jobPosition}\n
                        Job Description:${jobDescription}\n
                        Additional Context:\n
                        - Thoroughly research the company's background\n
                        - Analyze industry standards and market trends\n
                        - Provide insights specific to this role and company\n
                        - Use multiple reputable sources for information\n
                        - Use web search tool to get a broader understanding of the industry\n
                        - For array fields like skillDevelopmentOpportunities, provide multiple specific items as an array.\n
                        - Ensure each array field contains multiple relevant, distinct entries.`
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      }

      const apiKey = process.env.PUBLIC_GROQ_API_KEY

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      })

      const data = await response.json()
      console.log('API Response:', data) // Log the entire response

      const content = data?.choices?.[0]?.message?.content
      if (!content) {
        throw new Error('No content received from the API')
      }

      // Simplified content cleaning
      const cleanedContent = content
        .trim()
        .replace(/^[^\{]*/, '')
        .replace(/[^\}]*$/, '')

      try {
        const responseData = JSON.parse(cleanedContent)
        console.log(
          'API Response Structure:',
          JSON.stringify(responseData, null, 2)
        )
        console.log('API Response:', JSON.stringify(responseData, null, 2))
        return responseData
      } catch (parseError) {
        throw new Error('Failed to parse job analysis response')
      }
    } catch (error) {
      // Consolidated error handling
      if (error instanceof Error) {
        console.error('Job Analysis Error:', error.message)
      }
      throw error
    }
  } catch (error) {
    throw error
  }
}
