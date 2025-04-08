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

async function cleanResumeText(rawText: string): Promise<string> {
    if (!rawText) {
        return rawText;
    }

    try {
        if (rawText.trim().length === 0) {
            return rawText;
        }

        if (!groq) {
            return rawText;
        }

        let response;
        try {
            response = await groq.chat.completions.create({
                model: 'llama-3.2-3b-preview', 
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
                max_tokens: 4096,
                temperature: 0.1
            });
        } catch (aiCallError) {
            return rawText;
        }

        const content = response.choices?.[0]?.message?.content;
        return content && typeof content === 'string' 
            ? content.trim() 
            : rawText;

    } catch (error) {
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