export const fetchInterviewQuestions = async ({ 
    request, 
    apiKey 
}: { 
    request: Request; 
    apiKey?: string;
}) => {
    try {
        let requestData;
        try {
            requestData = await request.json();
        } catch (parseError) {
            throw new Error('Invalid request format: Unable to parse request body');
        }

        const { 
            companyName = 'Unknown Company', 
            jobRole = 'Unknown Role', 
            resume = '' 
        } = requestData;

        if (!companyName || typeof companyName !== 'string') {
            throw new Error('Company name is required and must be a string');
        }

        if (!jobRole || typeof jobRole !== 'string') {
            throw new Error('Job role is required and must be a string');
        }

        const apiEndpoint = 'https://api.openai.com/v1/chat/completions';

        try {
            const requestPayload = {
                model: "gpt-4o-mini", 
                messages: [
                    {
                        role: "system",
                        content: `You are an expert interview coach with deep knowledge of industry-specific interview questions.
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
                                        context: ""
                                    }
                                ],
                                roleSpecific: [
                                    {
                                        question: "",
                                        context: ""
                                    }
                                ],
                                behavioral: [
                                    {
                                        question: "",
                                        context: ""
                                    }
                                ],
                                technical: [
                                    {
                                        question: "",
                                        context: ""
                                    }
                                ]
                            })
                    },
                    {
                        role: "user",
                        content: `I have an upcoming interview at ${companyName} for the role of ${jobRole}. 
                        Please research and provide me with likely interview questions in the four categories: 
                        company-specific, role-specific, behavioral, and technical.
                        
                        Here is my resume for context:
                        ${resume}`
                    }
                ],
                temperature: 0.5,
                max_tokens: 4000,
                stream: false
            };

            // Use the provided API key or fallback to environment variables
            const openaiApiKey = apiKey || import.meta.env.PUBLIC_OPENAI_API_KEY || process.env.PUBLIC_OPENAI_API_KEY;
            if (!openaiApiKey) {
                throw new Error('API key is not configured');
            }

            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiApiKey}`
                },
                body: JSON.stringify(requestPayload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error:', errorData);
                throw new Error(`API request failed with status ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;
            
            // Parse the JSON response
            let parsedContent;
            try {
                parsedContent = JSON.parse(content);
            } catch (parseError) {
                console.error('Error parsing API response:', parseError);
                throw new Error('Failed to parse API response');
            }

            return {
                statusCode: 200,
                body: JSON.stringify(parsedContent)
            };

        } catch (apiError: any) {
            console.error('API Error:', apiError);
            throw new Error(`API request failed: ${apiError.message}`);
        }
    } catch (error: any) {
        console.error('Error in fetchInterviewQuestions:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'An unknown error occurred' })
        };
    }
};

export const reviewAnswer = async ({ 
    request,
    apiKey
}: { 
    request: Request;
    apiKey?: string;
}) => {
    try {
        let requestData;
        try {
            requestData = await request.json();
        } catch (parseError) {
            throw new Error('Invalid request format: Unable to parse request body');
        }

        const { 
            question = '', 
            answer = '', 
            resume = '' 
        } = requestData;

        if (!question || typeof question !== 'string') {
            throw new Error('Question is required and must be a string');
        }

        if (!answer || typeof answer !== 'string') {
            throw new Error('Answer is required and must be a string');
        }

        const apiEndpoint = 'https://api.openai.com/v1/chat/completions';

        try {
            const requestPayload = {
                model: "gpt-4o-mini", 
                messages: [
                    {
                        role: "system",
                        content: `You are an expert interview coach with deep knowledge of effective interview techniques.
                        Your task is to review the candidate's answer to an interview question and provide constructive feedback.
                        CRITICAL INSTRUCTIONS:
                        1. Output ONLY a valid JSON object
                        2. NO explanatory text or reasoning
                        3. NO markdown
                        4. Keep analysis concise
                        5. Focus on providing specific, actionable feedback
                        6. Match this structure exactly:` +
                            JSON.stringify({
                                strengths: [],
                                weaknesses: [],
                                improvements: [],
                                alternativeApproach: "",
                                overallRating: 0, // 1-10 scale
                                keyTakeaway: ""
                            })
                    },
                    {
                        role: "user",
                        content: `I was asked this interview question: "${question}"
                        
                        My answer was: "${answer}"
                        
                        Here is my resume for context:
                        ${resume}
                        
                        Please review my answer and provide feedback on how I can improve it.`
                    }
                ],
                temperature: 0.5,
                max_tokens: 4000,
                stream: false
            };

            // Use the provided API key or fallback to environment variables
            const openaiApiKey = apiKey || import.meta.env.PUBLIC_OPENAI_API_KEY || process.env.PUBLIC_OPENAI_API_KEY;
            if (!openaiApiKey) {
                throw new Error('API key is not configured');
            }

            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiApiKey}`
                },
                body: JSON.stringify(requestPayload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error:', errorData);
                throw new Error(`API request failed with status ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;
            
            // Parse the JSON response
            let parsedContent;
            try {
                parsedContent = JSON.parse(content);
            } catch (parseError) {
                console.error('Error parsing API response:', parseError);
                throw new Error('Failed to parse API response');
            }

            return {
                statusCode: 200,
                body: JSON.stringify(parsedContent)
            };

        } catch (apiError: any) {
            console.error('API Error:', apiError);
            throw new Error(`API request failed: ${apiError.message}`);
        }
    } catch (error: any) {
        console.error('Error in reviewAnswer:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'An unknown error occurred' })
        };
    }
};
