import type { APIRoute } from 'astro';
import { initializeCopilot } from '../../lib/ai-copilot';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { message, mode = 'careerGuidance' } = await request.json();

    if (!message) {
      return new Response(JSON.stringify({ 
        error: 'Message is required' 
      }), { status: 400 });
    }

    const copilot = initializeCopilot();
    
    if (!copilot) {
      console.error('Copilot initialization failed. Check API key configuration.');
      return new Response(JSON.stringify({ 
        error: 'AI Copilot is not configured. Please check your API key configuration.' 
      }), { status: 503 });
    }

    try {
      const response = await copilot.chat(message, mode);

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (chatError) {
      console.error('Chat API Error:', chatError);
      return new Response(JSON.stringify({ 
        error: 'Failed to communicate with AI service. Please try again later.',
        details: chatError instanceof Error ? chatError.message : 'Unknown error'
      }), { status: 500 });
    }
  } catch (error) {
    console.error('AI Copilot API Error:', error);
    return new Response(JSON.stringify({ 
      error: 'An unexpected error occurred',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
};
