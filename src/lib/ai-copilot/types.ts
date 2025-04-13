export interface CopilotMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CopilotConversation {
  id: string;
  messages: CopilotMessage[];
  createdAt: Date;
  lastUpdated: Date;
}

export interface CopilotConfig {
  model: "llama3-8b-8192" | "llama2-70b-4096" | "gemma-7b-it"; // Updated to include Groq models
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  role: string; // Adding role property to define the copilot's role
}

export interface CopilotResponse {
  message: string;
  suggestedActions: string[];
  confidence: number;
}

export type CopilotMode =
  | "careerGuidance"
  | "resumeWriting"
  | "interviewPrep"
  | "careerDiscussion"
  | "heroConcise"; // Added the new mode
