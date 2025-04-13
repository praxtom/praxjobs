import { Handler } from "@netlify/functions";
import nodemailer from "nodemailer";

// Define expected structure of the request body
interface ContactRequestBody {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const handler: Handler = async (event) => {
  // Define allowed origin
  const allowedOrigin = "https://praxjobs.com"; // Your production frontend domain

  // Set default CORS headers
  const headers = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type", // No Authorization needed here typically
    "Access-Control-Allow-Methods": "POST, OPTIONS", // Only allow POST and OPTIONS
  };

  // Handle preflight CORS requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204, // No Content
      headers,
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405, // Method Not Allowed
      headers,
      body: JSON.stringify({ message: "Method not allowed. Use POST." }),
    };
  }

  try {
    // Check if event.body exists
    if (!event.body) {
      return {
        statusCode: 400, // Bad Request
        headers,
        body: JSON.stringify({ error: "Request body is required" }),
      };
    }

    // Parse request body safely
    let parsedBody: ContactRequestBody;
    try {
      parsedBody = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400, // Bad Request
        headers,
        body: JSON.stringify({ error: "Invalid JSON in request body" }),
      };
    }

    const { name, email, subject, message } = parsedBody;

    // Validate input fields
    if (!name || !email || !subject || !message) {
      // Be more specific about missing fields if needed for debugging,
      // but for production, a general message is often sufficient.
      return {
        statusCode: 400, // Bad Request
        headers,
        body: JSON.stringify({
          error: "Missing required fields: name, email, subject, and message",
        }),
      };
    }

    // Validate email format (basic check)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400, // Bad Request
        headers,
        body: JSON.stringify({ error: "Invalid email format" }),
      };
    }

    // Retrieve SendGrid API Key from environment variables
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    if (!sendgridApiKey) {
      // Log this server-side error (ideally to an error monitoring service)
      // Removed console.error('SENDGRID_API_KEY is not set in environment variables.');
      return {
        statusCode: 500, // Internal Server Error
        headers,
        body: JSON.stringify({ error: "Email service configuration error." }), // Generic message to client
      };
    }

    // Configure SMTP transporter using SendGrid
    const transporter = nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587, // Use 587 for TLS
      secure: false, // TLS requires secure: false for port 587
      auth: {
        user: "apikey", // SendGrid uses 'apikey' as the username
        pass: sendgridApiKey, // Your SendGrid API key
      },
    });

    // Define email options
    const mailOptions = {
      from: '"PraxJobs Contact Form" <prakhartomar95@gmail.com>', // Use a name and verified sender email
      to: "prax.flash@gmail.com", // Your receiving email address
      replyTo: email, // Set the sender's email as Reply-To
      subject: `New PraxJobs Query: ${subject}`,
      text: `You received a new contact request:\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`, // Plain text body
      // Optionally add an HTML version
      // html: `<p>You received a new contact request:</p><ul><li><strong>Name:</strong> ${name}</li><li><strong>Email:</strong> ${email}</li><li><strong>Subject:</strong> ${subject}</li></ul><p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br>')}</p>`
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Removed console.log('Message sent: %s', info.messageId);

    // Return success response
    return {
      statusCode: 200, // OK
      headers,
      body: JSON.stringify({
        message:
          "Contact request submitted successfully. We will get back to you soon!",
      }),
    };
  } catch (error) {
    // Removed console.error('Error submitting contact request:', error);

    // Log the detailed error to your monitoring service (e.g., Sentry)
    // LogToMonitoringService(error);

    // Return a generic internal server error message to the client
    return {
      statusCode: 500, // Internal Server Error
      headers,
      // Avoid exposing detailed error messages like error.message in production
      body: JSON.stringify({
        error: "An internal server error occurred while sending the message.",
      }),
    };
  }
};

export { handler };
