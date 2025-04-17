import { Handler, HandlerEvent } from "@netlify/functions"; // Added HandlerEvent
import { SUBSCRIPTION_TIERS } from "../../src/lib/subscriptionConfig"; // Adjust path if needed

// Function to generate a unique reference ID
function generateUniqueReferenceId(prefix: string = "pro_sub"): string {
  // Combine timestamp and random number
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 7);
  return `${prefix}_${timestamp}_${randomPart}`;
}

// Helper to extract token from Authorization header
const extractToken = (event: HandlerEvent): string | null => {
  const authHeader = event.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7); // Remove "Bearer " prefix
  }
  return null;
};

const handler: Handler = async (event) => {
  // Define allowed origin
  const allowedOrigin = "https://praxjobs.com"; // Your production frontend domain

  // Set default CORS headers
  const headers = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization", // Added Authorization
    "Access-Control-Allow-Methods": "POST, OPTIONS", // Allow only POST and OPTIONS
    "Content-Type": "application/json", // Ensure response content type is set
  };

  // Handle CORS preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204, // No Content
      headers,
    };
  }

  // Validate request method
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405, // Method Not Allowed
      headers,
      body: JSON.stringify({ error: "Method not allowed. Use POST." }),
    };
  }

  // Validate content type (optional but good practice)
  const contentType =
    event.headers["content-type"] || event.headers["Content-Type"];
  if (contentType !== "application/json") {
    return {
      statusCode: 415, // Unsupported Media Type
      headers,
      body: JSON.stringify({
        error: "Invalid content type. Expected application/json.",
      }),
    };
  }

  // --- Authentication removed: All requests allowed without token ---
  // --- End Authentication ---

  try {
    // Razorpay credentials from environment variables (RENAMED: Remove PUBLIC_ prefix)
    const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
    // BASE_URL also likely shouldn't be prefixed PUBLIC_ if it's configured server-side
    const BASE_URL = process.env.BASE_URL || "http://localhost:4321"; // Ensure this is correct for prod

    // Validate credentials presence
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      // Log this server-side configuration error to a monitoring service
      // Removed console.error(...)
      return {
        statusCode: 500, // Internal Server Error
        headers,
        body: JSON.stringify({
          error: "Payment service configuration error.", // Generic message to client
        }),
      };
    }

    // Generate a unique reference ID for this payment attempt
    const referenceId = generateUniqueReferenceId();

    // Get pro tier price dynamically
    const proTierPrice = SUBSCRIPTION_TIERS.pro.price;
    const proTierAmountInPaise = proTierPrice * 100; // Convert price to paise for Razorpay

    // Prepare Razorpay API request options
    const paymentLinkOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`
        ).toString("base64")}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        amount: proTierAmountInPaise, // Use amount in paise
        currency: "INR",
        accept_partial: false,
        // first_min_partial_amount: 0, // Not needed if accept_partial is false
        expire_by: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // Link expires in 24 hours
        description: "PraxJobs Pro Subscription",
        customer: {
          // Fetch actual customer details if available and required by Razorpay/compliance
          // name: 'PraxJobs User',
          // contact: '',
          // email: ''
        },
        notify: {
          sms: false, // Configure as needed
          email: false, // Configure as needed
        },
        reminder_enable: false, // Configure as needed
        notes: {
          // userId removed: authentication not required
          tier: "pro" as const,
          product: "PraxJobs Pro",
          timestamp: new Date().toISOString(), // Use ISO string for timestamp
        },
        options: {
          checkout: {
            name: "PraxJobs", // Business name displayed on checkout
          },
        },
        // Ensure BASE_URL is correctly set in environment for production
        callback_url: `${BASE_URL}/pricing?referenceId=${referenceId}&proUpgradeSuccess=true&tier=pro&timestamp=${Date.now()}`, // userId removed: authentication not required
        callback_method: "get",
        reference_id: referenceId, // Pass the generated unique reference ID
      }),
    };

    // Make Razorpay API request
    const response = await fetch(
      "https://api.razorpay.com/v1/payment_links",
      paymentLinkOptions
    );

    // Handle non-successful Razorpay API responses
    if (!response.ok) {
      let errorDetails = `Razorpay API responded with status ${response.status}`;
      try {
        // Try to parse error response from Razorpay for more details
        const errorData = await response.json();
        errorDetails =
          errorData?.error?.description || JSON.stringify(errorData);
      } catch (e) {
        // Fallback if response is not JSON
        errorDetails = await response.text();
      }

      // Log the detailed error to your monitoring service
      // Removed console.error('Razorpay API Error:', errorDetails)

      return {
        statusCode: 502, // Bad Gateway (error from upstream service)
        headers,
        body: JSON.stringify({
          error:
            "Failed to create payment link due to an issue with the payment provider.",
          // Avoid sending detailed provider errors ('details') to the client in production
        }),
      };
    }

    // Parse successful response and return payment link
    const data = await response.json();

    // Check if short_url exists in the response
    if (!data || !data.short_url) {
      // Log this unexpected response to monitoring service
      // Removed console.error(...)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Payment provider did not return a valid payment link.",
        }),
      };
    }

    return {
      statusCode: 200, // OK
      headers,
      body: JSON.stringify({
        paymentLink: data.short_url,
        referenceId: referenceId, // Return the reference ID for client-side tracking if needed
      }),
    };
  } catch (error) {
    // Removed console.error('Payment link generation server error:', error);

    // Log the error to your monitoring service
    // LogToMonitoringService(error);

    return {
      statusCode: 500, // Internal Server Error
      headers,
      body: JSON.stringify({
        error:
          "An internal server error occurred while generating the payment link.",
        // Avoid sending detailed error info ('details') in production
      }),
    };
  }
};

export { handler };
