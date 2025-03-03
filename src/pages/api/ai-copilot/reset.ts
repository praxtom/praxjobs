import type { APIRoute } from 'astro';
import { initializeCopilot } from '../../../lib/ai-copilot';

export const POST: APIRoute = async () => {
  try {
    const copilot = initializeCopilot();
    
    if (!copilot) {
      return new Response(JSON.stringify({ 
        error: 'AI Copilot is not configured. Please check your API key configuration.' 
      }), { status: 503 });
    }

    // Reset the conversation
    const resetResult = copilot.resetConversation();

    return new Response(JSON.stringify({ 
      success: resetResult,
      message: 'Chat history reset successfully' 
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Chat Reset Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to reset chat history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
};
