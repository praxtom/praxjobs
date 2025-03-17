import { Handler } from '@netlify/functions'
import { PdfReader } from 'pdfreader'
import Groq from 'groq-sdk'
import mammoth from 'mammoth'

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY // Ensure this is set in your Netlify environment variables
})

// Function to parse PDF files
async function parsePDF (buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new PdfReader()
    let text = ''

    reader.parseBuffer(buffer, (err, item) => {
      if (err) {
        reject(new Error('Failed to parse PDF'))
      } else if (!item) {
        resolve(text) // Parsing complete
      } else if (item.text) {
        text += item.text + ' ' // Append text
      }
    })
  })
}

// Function to parse Word files
async function parseWord (buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    return result.value // Extracted text from the Word file
  } catch (error) {
    console.error('Error parsing Word file:', error)
    throw new Error('Failed to parse Word file')
  }
}

// Function to clean resume text using Groq
async function cleanResumeText (rawText: string): Promise<string> {
  // Validate input text before processing
  if (!rawText) {
    console.error('ERROR: No text provided to cleanResumeText')
    return rawText
  }

  try {
    // Explicit logging of input text
    console.error('DEBUG: Attempting to clean text')
    console.error('DEBUG: Raw Text Length:', rawText.length)
    console.error('DEBUG: First 500 characters:', rawText.slice(0, 500))

    // Explicit check for text transmission
    if (rawText.trim().length === 0) {
      console.error('ERROR: Empty text provided')
      return rawText
    }

    // Explicit error handling for Groq initialization
    if (!groq) {
      console.error('ERROR: Groq client not initialized')
      return rawText
    }

    // Explicit logging of AI call parameters
    console.error('DEBUG: Preparing AI call with model: llama-3.1-8b-instant')

    // Attempt AI call with explicit error handling
    let response
    try {
      response = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant', // Updated to smallest Llama model
        messages: [
          {
            role: 'system',
            content: `You are a professional resume text cleaner. 
- Preserve ALL original content
- Remove extra whitespaces
- Ensure consistent formatting
- Correct minor typographical errors
- Maintain original document structure
- Return ONLY the cleaned text
- Do NOT add or remove any information`
          },
          {
            role: 'user',
            content: rawText
          }
        ],
        // Add max_tokens to ensure full text processing
        max_tokens: 4096,
        // Lower temperature for more conservative changes
        temperature: 0.1
      })
    } catch (aiCallError) {
      console.error('CRITICAL ERROR: Failed to call AI', aiCallError)
      // Log detailed error information
      if (aiCallError instanceof Error) {
        console.error('Error Name:', aiCallError.name)
        console.error('Error Message:', aiCallError.message)
        console.error('Error Stack:', aiCallError.stack)
      }
      return rawText
    }

    // Explicit logging of AI response
    console.error('DEBUG: AI Response received')
    console.error(
      'DEBUG: Response Choices:',
      response.choices ? response.choices.length : 'No choices'
    )

    // Safely extract content
    const content = response.choices?.[0]?.message?.content

    // Detailed content logging
    console.error(
      'DEBUG: Extracted Content Length:',
      content ? content.length : 'N/A'
    )
    console.error(
      'DEBUG: First 500 characters of extracted content:',
      content ? content.slice(0, 500) : 'No content extracted'
    )

    // Return processed text
    return content && typeof content === 'string' ? content.trim() : rawText
  } catch (error) {
    // Comprehensive error logging
    console.error('FATAL ERROR in cleanResumeText:', error)

    // If it's an error with a response, log that too
    if (error instanceof Error && 'response' in error) {
      console.error('Detailed error response:', (error as any).response)
    }

    // Always return original text on any error
    return rawText
  }
}

// Main handler
const handler: Handler = async event => {
  try {
    // Parse the request body
    const { fileBase64, fileName, fileType } = JSON.parse(event.body || '{}')

    // Decode the base64 file into a buffer
    const fileBuffer = Buffer.from(fileBase64, 'base64')

    let extractedText: string

    // Handle PDF files
    if (fileType === 'application/pdf') {
      extractedText = await parsePDF(fileBuffer)
    }
    // Handle Word files
    else if (
      fileType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileType === 'application/msword'
    ) {
      extractedText = await parseWord(fileBuffer)
    }
    // Unsupported file types
    else {
      throw new Error(
        'Unsupported file type. Only PDF and Word files are supported.'
      )
    }

    // Clean the extracted text using Groq
    const cleanedText = await cleanResumeText(extractedText)

    // Return the cleaned text
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: { text: cleanedText }
      })
    }
  } catch (error) {
    console.error('Error processing file:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}

export { handler }
