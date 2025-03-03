import type { APIRoute } from 'astro';
import * as textract from 'textract';
import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: import.meta.env.GROQ_API_KEY ?? ''
});

const SUPPORTED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/rtf',
    'application/rtf'
];

// Get file extension based on MIME type
function getFileExtension(fileType: string): string {
    const extensionMap: { [key: string]: string } = {
        'application/pdf': '.pdf',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'text/plain': '.txt',
        'text/rtf': '.rtf',
        'application/rtf': '.rtf'
    };
    return extensionMap[fileType] || '.txt';
}

// Async text extraction function
async function extractTextFromBuffer(fileBuffer: Buffer, fileType: string): Promise<string> {
    return new Promise((resolve, reject) => {
        textract.fromBufferWithMime(fileType, fileBuffer, (error, text) => {
            if (error) {
                reject(new Error(`Text extraction failed: ${error.message}`));
            } else {
                resolve(text || '');
            }
        });
    });
}

// Type guard to check if a chunk is a string or has content
function isStringChunk(chunk: any): chunk is string {
    return typeof chunk === 'string';
}

function extractChunkContent(chunk: any): string {
    // If chunk is a string, return it directly
    if (isStringChunk(chunk)) {
        return chunk;
    }

    // If chunk is an object, try to extract content
    if (typeof chunk === 'object' && chunk !== null) {
        // Check for different possible content properties
        if ('content' in chunk && typeof chunk.content === 'string') {
            return chunk.content;
        }
        
        // Log unexpected chunk type for debugging
        console.warn('Unexpected chunk type:', chunk);
    }

    // Return empty string if no content could be extracted
    return '';
}

// Clean and format resume text using Llama 3.1-8b-instant
async function cleanResumeText(rawText: string): Promise<string> {
    // Validate input text before processing
    if (!rawText) {
        console.error('ERROR: No text provided to cleanResumeText');
        return rawText;
    }

    try {
        // Explicit logging of input text
        console.error('DEBUG: Attempting to clean text');
        console.error('DEBUG: Raw Text Length:', rawText.length);
        console.error('DEBUG: First 500 characters:', rawText.slice(0, 500));

        // Explicit check for text transmission
        if (rawText.trim().length === 0) {
            console.error('ERROR: Empty text provided');
            return rawText;
        }

        // Explicit error handling for Groq initialization
        if (!groq) {
            console.error('ERROR: Groq client not initialized');
            return rawText;
        }

        // Explicit logging of AI call parameters
        console.error('DEBUG: Preparing AI call with model: llama-3.1-8b-instant');

        // Attempt AI call with explicit error handling
        let response;
        try {
            response = await groq.chat.completions.create({
                model: 'llama-3.1-8b-instant', // Updated to smallest Llama model
                messages: [
                    {
                        role: "system", 
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
                        role: "user", 
                        content: rawText
                    }
                ],
                // Add max_tokens to ensure full text processing
                max_tokens: 4096,
                // Lower temperature for more conservative changes
                temperature: 0.1
            });
        } catch (aiCallError) {
            console.error('CRITICAL ERROR: Failed to call AI', aiCallError);
            // Log detailed error information
            if (aiCallError instanceof Error) {
                console.error('Error Name:', aiCallError.name);
                console.error('Error Message:', aiCallError.message);
                console.error('Error Stack:', aiCallError.stack);
            }
            return rawText;
        }

        // Explicit logging of AI response
        console.error('DEBUG: AI Response received');
        console.error('DEBUG: Response Choices:', response.choices ? response.choices.length : 'No choices');

        // Safely extract content
        const content = response.choices?.[0]?.message?.content;

        // Detailed content logging
        console.error('DEBUG: Extracted Content Length:', content ? content.length : 'N/A');
        console.error('DEBUG: First 500 characters of extracted content:', 
            content ? content.slice(0, 500) : 'No content extracted');

        // Return processed text
        return content && typeof content === 'string' 
            ? content.trim() 
            : rawText;

    } catch (error) {
        // Comprehensive error logging
        console.error('FATAL ERROR in cleanResumeText:', error);
        
        // If it's an error with a response, log that too
        if (error instanceof Error && 'response' in error) {
            console.error('Detailed error response:', (error as any).response);
        }

        // Always return original text on any error
        return rawText;
    }
}

export const POST: APIRoute = async ({ request }) => {
    // Validate request content type
    if (request.headers.get('Content-Type') !== 'application/json') {
        return new Response(JSON.stringify({ 
            error: 'Invalid content type' 
        }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    try {
        const { fileBase64, fileName, fileType } = await request.json();
        
        // Validate input fields
        if (!fileBase64 || !fileName || !fileType) {
            return new Response(JSON.stringify({
                error: 'Missing required fields: fileBase64, fileName, or fileType'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate file type
        if (!SUPPORTED_MIME_TYPES.includes(fileType)) {
            return new Response(JSON.stringify({
                error: 'Unsupported file type',
                supportedTypes: SUPPORTED_MIME_TYPES
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Convert base64 to file buffer
        const fileBuffer = Buffer.from(fileBase64, 'base64');

        // Extract text directly from buffer
        const extractedText = await extractTextFromBuffer(fileBuffer, fileType);

        // Validate extracted text
        if (!extractedText || extractedText.trim().length === 0) {
            return new Response(JSON.stringify({ 
                success: false,
                error: 'No text could be extracted from the document',
                details: 'The document appears to be empty or unreadable'
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        // Clean resume text using Llama 3.1-8b-instant
        const cleanedText = await cleanResumeText(extractedText);

        return new Response(JSON.stringify({ 
            success: true, 
            data: {
                text: cleanedText
            }
        }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' } 
        });

    } catch (error) {
        console.error('Resume upload error:', error);
        
        const errorMessage = error instanceof Error 
            ? error.message 
            : 'An unexpected error occurred while processing the resume';

        return new Response(JSON.stringify({ 
            success: false,
            error: 'Failed to upload resume',
            details: errorMessage
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' } 
        });
    }
};