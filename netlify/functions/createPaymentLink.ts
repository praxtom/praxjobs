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
  const allowedOrigin = "https://praxjobs.com";

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
      statusCode: 204,
      headers,
    };
  }

  // Validate request method
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
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

  try {
    const RAZORPAY_KEY_ID = process.env.PUBLIC_RAZORPAY_KEY_ID;
    const RAZORPAY_KEY_SECRET = process.env.PUBLIC_RAZORPAY_KEY_SECRET;
    const BASE_URL = process.env.BASE_URL || "http://localhost:8888";

    // Validate credentials presence
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Payment service configuration error.",
        }),
      };
    }

    // Generate a unique reference ID for this payment attempt
    const referenceId = generateUniqueReferenceId();

    // Get pro tier price
    const proTierPrice = SUBSCRIPTION_TIERS.pro.price;
    const proTierAmountInPaise = proTierPrice;

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
        expire_by: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // Link expires in 24 hours
        description: "PraxJobs Pro Subscription",
        notify: {
          sms: false, // Configure as needed
          email: false, // Configure as needed
        },
        reminder_enable: false, // Configure as needed
        notes: {
          tier: "pro" as const,
          product: "PraxJobs Pro",
          timestamp: new Date().toISOString(), // Use ISO string for timestamp
        },
        options: {
          checkout: {
            name: "PraxJobs", // Business name displayed on checkout
          },
        },
        callback_url: `${BASE_URL}/pricing?referenceId=${referenceId}&proUpgradeSuccess=true&tier=pro&timestamp=${Date.now()}`,
        callback_method: "get",
        reference_id: referenceId,
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

      return {
        statusCode: 502, // Bad Gateway (error from upstream service)
        headers,
        body: JSON.stringify({
          error:
            "Failed to create payment link due to an issue with the payment provider.",
        }),
      };
    }

    // Parse successful response and return payment link
    const data = await response.json();

    // Check if short_url exists in the response
    if (!data || !data.short_url) {
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
    return {
      statusCode: 500, // Internal Server Error
      headers,
      body: JSON.stringify({
        error:
          "An internal server error occurred while generating the payment link.",
      }),
    };
  }
};

export { handler };
