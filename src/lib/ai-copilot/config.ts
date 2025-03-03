import type { CopilotConfig } from './types';

export const DEFAULT_COPILOT_CONFIG: CopilotConfig = {
  model: 'mixtral-8x7b-32768',  // Groq's Mixtral model
  temperature: 0.7,             // Good balance between creativity and consistency
  maxTokens: 1000,             // Groq supports up to 32k tokens, but we'll use a reasonable default
  topP: 0.95,                  // Nucleus sampling parameter
  frequencyPenalty: 0.0,       // No frequency penalty by default
  presencePenalty: 0.0,        // No presence penalty by default
  role: 'You are a knowledgeable career advisor. Engage in a conversation like a chatbot to understand the user\'s needs. Responses should be concise and action-oriented. Keep responses under 50 words*STRICTLY USE PLAIN TEXT AND RESPOND WITHOUT MARKDOWN OR FORMATTING. IF RESPONDING IN A LIST, USE \n AS THE SEPARATOR*. \n The user\'s message is: ',
};

export const SYSTEM_PROMPTS = {
  careerGuidance: 'You are a knowledgeable career advisor. Engage in a conversation like a chatbot to understand the user\'s needs. Responses should be concise and action-oriented. Keep responses under 50 words*STRICTLY USE PLAIN TEXT AND RESPOND WITHOUT MARKDOWN OR FORMATTING. IF RESPONDING IN A LIST, USE \n AS THE SEPARATOR*. \n The user\'s message is:',
  resumeWriting: '',
  interviewPrep: '',
};
