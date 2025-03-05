import { authService } from './auth'

// Robust environment variable reading
const BASE_URL = import.meta.env.PUBLIC_BASE_URL || 'http://localhost:4321'

// Robust base64 encoding for credentials
function base64Encode (str: string): string {
  if (typeof btoa === 'function') {
    return btoa(str)
  }

  // Fallback for Node.js or other environments
  return Buffer.from(str).toString('base64')
}

export async function generateProSubscriptionPaymentLink (
  userId?: string
): Promise<string> {
  try {
    // Prepare request to server-side API
    const response = await fetch('/.netlify/functions/createPaymentLink', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        tier: 'pro',
        callbackUrl: `${BASE_URL}/pricing?proUpgradeSuccess=true&userId=${userId}&tier=pro`
      })
    })

    // Check if the response is ok
    if (!response.ok) {
      const errorData = await response.json()
      console.error('Payment link generation error:', errorData)
      throw new Error(errorData.error || 'Failed to generate payment link')
    }

    // Parse the response
    const data = await response.json()

    // Validate payment link
    if (!data.paymentLink) {
      throw new Error('No payment link received from server')
    }

    return data.paymentLink
  } catch (error) {
    console.error('Payment link generation client error:', error)
    throw error
  }
}

export async function initializeProSubscription (): Promise<void> {
  try {
    // Get current user (if logged in)
    const user = await authService.getCurrentUser()

    // Generate payment link
    const paymentLink = await generateProSubscriptionPaymentLink(user?.uid)

    // Redirect to payment link
    window.location.href = paymentLink
  } catch (error) {
    console.error('Pro subscription initialization error:', error)
    throw error
  }
}
