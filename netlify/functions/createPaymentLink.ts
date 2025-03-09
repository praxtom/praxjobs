import { Handler } from '@netlify/functions'
import { SUBSCRIPTION_TIERS } from '../../src/lib/subscriptionConfig'

// Function to generate a unique reference ID
function generateUniqueReferenceId (prefix: string = 'pro_sub'): string {
  // Combine timestamp and random number
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 7)
  return `${prefix}_${timestamp}_${randomPart}`
}

const handler: Handler = async event => {
  // Validate request method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Validate content type
  const contentType =
    event.headers['content-type'] || event.headers['Content-Type']
  if (contentType !== 'application/json') {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid content type' })
    }
  }

  try {
    // Parse request body
    const { userId } = JSON.parse(event.body || '{}')

    // Razorpay credentials
    const RAZORPAY_KEY_ID = process.env.PUBLIC_RAZORPAY_KEY_ID
    const RAZORPAY_KEY_SECRET = process.env.PUBLIC_RAZORPAY_KEY_SECRET
    const BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:4321'

    // Validate credentials
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Razorpay credentials are not configured'
        })
      }
    }

    // Generate a unique reference ID
    const referenceId = generateUniqueReferenceId()

    // Get pro tier price dynamically
    const proTierPrice = SUBSCRIPTION_TIERS.pro.price

    // Prepare Razorpay API request
    const paymentLinkOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(
          `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`
        ).toString('base64')}`,
        Accept: 'application/json'
      },
      body: JSON.stringify({
        amount: proTierPrice,
        currency: 'INR',
        accept_partial: false,
        first_min_partial_amount: 0,
        expire_by: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // Link expires in 24 hours
        description: 'PraxJobs Pro Subscription',
        customer: {
          name: 'PraxJobs User',
          contact: '',
          email: ''
        },
        notify: {
          sms: false,
          email: false
        },
        reminder_enable: false,
        notes: {
          userId: userId || 'unknown',
          tier: 'pro' as const,
          product: 'PraxJobs Pro',
          timestamp: Date.now().toString()
        },
        options: {
          checkout: {
            name: 'PraxJobs' // Updated business name
          }
        },
        callback_url: `${BASE_URL}/pricing?userId=${userId}&referenceId=${referenceId}&proUpgradeSuccess=true&tier=pro&timestamp=${Date.now()}`,
        callback_method: 'get',
        reference_id: referenceId
      })
    }

    // Make Razorpay API request
    const response = await fetch(
      'https://api.razorpay.com/v1/payment_links',
      paymentLinkOptions
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Razorpay API Error:', errorText)
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: 'Failed to create payment link',
          details: errorText
        })
      }
    }

    // Parse and return payment link
    const data = await response.json()

    return {
      statusCode: 200,
      body: JSON.stringify({
        paymentLink: data.short_url,
        referenceId: referenceId
      })
    }
  } catch (error) {
    console.error('Payment link generation server error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}

export { handler }
