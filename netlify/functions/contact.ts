import { Handler } from '@netlify/functions';
import nodemailer from 'nodemailer';

const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method not allowed' }),
        };
    }

    try {
        // Check if event.body is null or undefined
        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Request body is required' }),
            };
        }

        // Parse request body
        const { name, email, subject, message } = JSON.parse(event.body);

        // Validate input
        if (!name || !email || !subject || !message) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Name, email, subject, and message are required' }),
            };
        }

        // Configure SMTP transporter
        const transporter = nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: 'apikey', // Use 'apikey' as the username
                pass: process.env.SENDGRID_API_KEY, // Your SendGrid API key
            },
        });

        // Send email
        const info = await transporter.sendMail({
            from: 'prakhartomar95@gmail.com', // Verified sender email
            to: 'prax.flash@gmail.com', // Your email address to receive the contact requests
            subject: `New PraxJobs Query: ${subject}`,
            text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`, // Plain text body
        });

        console.log('Message sent: %s', info.messageId);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Contact request submitted successfully' }),
        };
    } catch (error) {
        console.error('Error submitting contact request:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'Internal server error' }), // Include the error message
        };
    }
};

export { handler };