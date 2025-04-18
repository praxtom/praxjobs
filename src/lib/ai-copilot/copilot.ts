import type {
  CopilotMessage,
  CopilotConversation,
  CopilotConfig,
  CopilotResponse,
  CopilotMode,
} from "./types";
import { DEFAULT_COPILOT_CONFIG, SYSTEM_PROMPTS } from "./config";

export class AICopilot {
  private apiKey: string;
  private config: CopilotConfig;
  private conversationHistory: CopilotMessage[] = [];

  constructor(apiKey?: string, config: Partial<CopilotConfig> = {}) {
    if (!apiKey) {
      throw new Error("Groq API Key is required");
    }

    this.apiKey = apiKey;
    this.config = { ...DEFAULT_COPILOT_CONFIG, ...config };
  }

  async chat(
    message: string,
    mode: CopilotMode = "careerGuidance"
  ): Promise<CopilotResponse> {
    try {
      // Assert mode is a valid key for SYSTEM_PROMPTS
      const systemPrompt =
        SYSTEM_PROMPTS[mode as keyof typeof SYSTEM_PROMPTS] +
        "The user's message is:";

      // Add user's message to conversation history
      this.conversationHistory.push({ role: "user", content: message });

      // Construct messages array with system prompt and conversation history
      const messages: CopilotMessage[] = [
        { role: "system", content: systemPrompt },
        ...this.conversationHistory,
      ];

      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.config.model,
            messages: messages,
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Groq API Error Response Text:", errorText); // Keep minimal server-side log
        throw new Error(
          `Groq API error: ${response.statusText} - ${response.status}`
        ); // Add status code
      }

      const data = await response.json();
      const assistantMessage = data.choices[0]?.message?.content || "";

      if (!assistantMessage) {
        throw new Error("No message content received from Groq API");
      }

      // Add assistant's response to conversation history
      this.conversationHistory.push({
        role: "assistant",
        content: assistantMessage,
      });

      // Keep only the last N messages to prevent context window from growing too large
      const maxHistoryLength = 10; // Adjust this number based on your needs
      if (this.conversationHistory.length > maxHistoryLength * 2) {
        // *2 because each exchange has 2 messages
        this.conversationHistory = this.conversationHistory.slice(
          -maxHistoryLength * 2
        );
      }

      // Implement feedback mechanism
      if (message.toLowerCase().includes("feedback")) {
        return {
          message:
            "Thank you for your feedback! Please share your thoughts on how I can improve.",
          suggestedActions: [],
          confidence: 1.0,
        };
      } else if (message.toLowerCase().includes("suggestion")) {
        return {
          message:
            "Thank you for your suggestion! We will take it into consideration.",
          suggestedActions: [],
          confidence: 1.0,
        };
      }

      // Format and validate response
      let formattedMessage = assistantMessage.trim();

      return {
        message: formattedMessage,
        confidence: data.choices[0]?.finish_reason === "stop" ? 0.9 : 0.5,
        suggestedActions: this.extractSuggestedActions(formattedMessage),
      };
    } catch (error) {
      console.error("Detailed Groq AI Error:", error);
      throw error;
    }
  }

  private extractSuggestedActions(message: string): string[] {
    // Implement action extraction logic
    return [];
  }

  createConversation(): CopilotConversation {
    return {
      id: crypto.randomUUID(),
      messages: [],
      createdAt: new Date(),
      lastUpdated: new Date(),
    };
  }

  resetConversation() {
    this.conversationHistory = [];
    return true;
  }
}

// Singleton instance
let copilotInstance: AICopilot | null = null;

// Update the initialization function
export function initializeCopilot() {
  if (copilotInstance) {
    return copilotInstance;
  }

  // Use correct environment variable name
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error(
      "Groq API Key is missing. Please set GROQ_API_KEY in your environment variables."
    );
    return null;
  }

  try {
    copilotInstance = new AICopilot(apiKey);
    return copilotInstance;
  } catch (error) {
    console.error("Failed to initialize Copilot:", error);
    return null;
  }
}
