import { Handler } from '@netlify/functions'
import { fetchInterviewQuestions } from '../../src/components/tools/tools_api/InterviewPrepAPI'

const handler: Handler = async (event, context) => {
  console.log('Incoming request to interview-questions:', event)

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    }
  }

  // Handle POST request
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ message: 'Method not allowed' })
    }
  }

  if (!event.body) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ error: 'Request body is required' })
    }
  }

  if (event.headers['content-type'] !== 'application/json') {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ error: 'Content-Type must be application/json' })
    }
  }

  try {
    // Create a mock request object from the event
    const mockRequest = {
      json: async () => JSON.parse(event.body || '{}')
    } as Request

    const result = await fetchInterviewQuestions({
      request: mockRequest
    })

    return {
      statusCode: result.statusCode || 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: result.body || JSON.stringify({ message: 'Success' })
    }
  } catch (error: any) {
    console.error('Error in interview-questions handler:', error)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        error: error.message || 'An unknown error occurred'
      })
    }
  }
}

export { handler }
