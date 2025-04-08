import { authService } from './auth';

// Robust environment variable reading
const BASE_URL = import.meta.env.PUBLIC_BASE_URL || 'http://localhost:4321';

// Note: The base64Encode function is not used in the provided snippet,
// but kept here in case it's used elsewhere in the original file.
function base64Encode(str: string): string {
  if (typeof btoa === 'function') {
    return btoa(str);
  }

  // Fallback for Node.js or other environments
  // Ensure Buffer is available or handle appropriately for browser-only context
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str).toString('base64');
  } else {
    // Basic fallback or throw an error if Buffer isn't expected/available
    // This simple fallback might not cover all Unicode scenarios correctly
    let encoded = "";
    for (let i = 0; i < str.length; i++) {
        encoded += String.fromCharCode(str.charCodeAt(i));
    }
    try {
        return window.btoa(encoded); // Try window.btoa again if Buffer fallback used in browser context
    } catch (e) {
        // Handle cases where btoa might still fail or isn't available
        // console.warn("Base64 encoding fallback might be incomplete."); // Optional warning
        return encoded; // Or throw error
    }
  }
}

export async function generateProSubscriptionPaymentLink(
  userId?: string
): Promise<string> {
  try {
    // Prepare request to server-side API
    const response = await fetch('/.netlify/functions/createPaymentLink', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        tier: 'pro',
        callbackUrl: `${BASE_URL}/pricing?proUpgradeSuccess=true&userId=${userId}&tier=pro`,
      }),
    });

    // Check if the response is ok
    if (!response.ok) {
      let errorData = { error: 'Failed to generate payment link' };
      try {
           // Try to parse error response, but don't fail if it's not JSON
           errorData = await response.json();
      } catch (parseError) {
        // Ignore parsing error, use default message
      }
      // console.error('Payment link generation error:', errorData); // REMOVED
      throw new Error(errorData.error || 'Failed to generate payment link');
    }

    // Parse the response
    const data = await response.json();

    // Validate payment link
    if (!data.paymentLink) {
      throw new Error('No payment link received from server');
    }

    return data.paymentLink;
  } catch (error) {
    // console.error('Payment link generation client error:', error); // REMOVED
    // Re-throw the error to be handled by the caller
    throw error;
  }
}

export async function initializeProSubscription(): Promise<void> {
  try {
    // Get current user (if logged in)
    const user = await authService.getCurrentUser();

    // Generate payment link
    const paymentLink = await generateProSubscriptionPaymentLink(user?.uid);

    // Redirect to payment link
    window.location.href = paymentLink;
  } catch (error) {
    // console.error('Pro subscription initialization error:', error); // REMOVED
    // Re-throw the error so the UI can potentially display a message
    throw error;
  }
}