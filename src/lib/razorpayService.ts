import Razorpay from 'razorpay';
import { createHmac } from 'crypto';
import { SUBSCRIPTION_TIERS } from './subscriptionConfig';
import type { SubscriptionTier } from './subscriptionConfig';
import { TierManagementService } from './tierManagement';
import { paymentConfirmationService } from './paymentConfirmation';
import type { PaymentResponse } from '../types/payment';

// Define types for Razorpay webhook payload
interface RazorpayWebhookPayload {
  event: string;
  payload: {
    subscription: {
      id: string;
      entity: 'subscription';
      plan_id: string;
      customer_id: string;
      status: 'active' | 'pending' | 'cancelled' | 'completed';
      current_start: number;
      current_end: number;
      notes?: {
        userId?: string;
        tier?: SubscriptionTier;
      };
    };
    customer?: {
      id: string;
      name: string;
      email: string;
    };
  };
  created_at: number;
}

export class RazorpayService {
  private razorpay: Razorpay;

  constructor() {
    const keyId = import.meta.env.PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = import.meta.env.PUBLIC_RAZORPAY_KEY_SECRET;

    // Validate Razorpay configuration
    if (!keyId || !keySecret) {
      // Removed debugLog('❌ Missing Razorpay configuration')
      throw new Error(
        'Razorpay key_id or key_secret is missing. Check your environment variables.'
      );
    }

    try {
      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
      // Removed debugLog('✅ Razorpay service initialized successfully')
    } catch (error) {
      // Removed console.error('Razorpay Initialization Detailed Error:', ...)
      throw new Error(
        `Failed to initialize Razorpay service: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  async createSubscriptionPlan(tier: SubscriptionTier) {
    const tierConfig = SUBSCRIPTION_TIERS[tier];

    try {
      // Removed console.log('Creating Subscription Plan:', ...)

      const plan = await this.razorpay.plans.create({
        period: 'monthly',
        interval: 1,
        item: {
          name: `PraxJobs ${tierConfig.name} Membership`,
          amount: tierConfig.price * 100, // Convert to paise
          currency: 'INR',
          description: `Monthly subscription for ${tierConfig.name} tier`,
        },
      });

      // Removed debugLog('Subscription plan created successfully', ...)
      return plan;
    } catch (error) {
      // Removed console.error('Subscription Plan Creation Error:', ...)
      throw new Error(
        `Failed to create subscription plan: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  async createSubscription(userId: string, tier: SubscriptionTier) {
    try {
      // Removed debugLog(`Creating subscription for user ${userId} in ${tier} tier`)

      // Validate user ID
      if (!userId) {
        throw new Error('User ID is required');
      }

      const plan = await this.createSubscriptionPlan(tier);

      const subscription = await this.razorpay.subscriptions.create({
        plan_id: plan.id,
        customer_notify: 1,
        total_count: 12, // 1 year of monthly subscriptions
        start_at: Math.floor(Date.now() / 1000), // Current timestamp
        notes: {
          userId: userId,
          tier: tier,
        },
      });

      // Removed debugLog('Subscription created successfully', ...)

      // Update user's tier in Firebase
      await TierManagementService.upgradeUserTier(userId, tier, subscription.id);

      return {
        subscriptionId: subscription.id,
        shortUrl: subscription.short_url,
      };
    } catch (error) {
      // Removed debugLog('❌ Error creating Razorpay subscription', error)
      throw new Error(
        `Subscription creation failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      // Removed debugLog(`Cancelling subscription: ${subscriptionId}`)

      // Cancel the subscription
      await this.razorpay.subscriptions.cancel(subscriptionId);

      // Removed debugLog(`Subscription ${subscriptionId} cancelled successfully`)
    } catch (error) {
      // Removed debugLog(`❌ Error cancelling subscription ${subscriptionId}`, error)
      throw new Error(
        `Subscription cancellation failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  async handleSubscriptionWebhook(
    payload: RazorpayWebhookPayload
  ): Promise<void> {
    try {
      const { event } = payload;

      switch (event) {
        case 'subscription.activated':
          await this.onSubscriptionActivated(payload);
          break;

        case 'subscription.charged':
          await this.onSubscriptionCharged(payload);
          break;

        case 'subscription.cancelled':
          await this.onSubscriptionCancelled(payload);
          break;

        default:
          // Removed console.log(`Unhandled webhook event: ${event}`)
          // Optionally, you might want specific handling or logging for unhandled events
          // even in production, perhaps to an error tracking service.
          break;
      }
    } catch (error) {
      // Removed console.error('Error processing subscription webhook:', error)
      // Re-throw the error or log to a dedicated error monitoring service
      throw error;
    }
  }

  private async onSubscriptionActivated(
    payload: RazorpayWebhookPayload
  ): Promise<void> {
    // Removed console.log('\ud83d\udce6 Processing Subscription Activation:', ...)

    const userId = payload.payload.subscription.notes?.userId;
    const tier = payload.payload.subscription.notes?.tier;

    // Removed console.log('\ud83d\udd0e Extracted User Details:', ...)

    if (!userId || !tier) {
      // Removed console.error('\u274c Subscription Activation Failed: Missing Critical Data', ...)
      throw new Error('Incomplete subscription activation payload');
    }

    try {
      // Removed console.log('\ud83d\udd04 Attempting to Upgrade User Tier:', ...)

      await TierManagementService.upgradeUserTier(
        userId,
        tier,
        payload.payload.subscription.id
      );

      // Removed console.log('\u2705 Subscription Activated Successfully:', ...)
    } catch (error) {
      // Removed console.error('\u274c Tier Upgrade Error:', ...)
      throw error; // Re-throw the error for upstream handling
    }
  }

  private async onSubscriptionCharged(
    payload: RazorpayWebhookPayload
  ): Promise<void> {
    // Extend subscription or perform additional actions
    // Removed console.log('Subscription charged:', payload)

    const userId = payload.payload.subscription.notes?.userId;
    if (!userId) {
      // Removed console.warn('Incomplete subscription charge payload', payload)
      // Optionally add specific handling or logging to an error service
    }
    // Add logic for charged event if needed
  }

  private async onSubscriptionCancelled(
    payload: RazorpayWebhookPayload
  ): Promise<void> {
    const userId = payload.payload.subscription.notes?.userId;

    if (!userId) {
      // Removed console.warn('Incomplete subscription cancellation payload', payload)
      return; // Exit if no user ID found
    }

    // Revert to free tier or handle cancellation
    await TierManagementService.downgradeUserTier(userId);
  }

  verifyPaymentSignature(
    paymentDetails: {
      razorpay_payment_id: string;
      razorpay_payment_link_id?: string;
      razorpay_payment_link_reference_id?: string;
      razorpay_payment_link_status?: string;
    },
    razorpaySignature: string
  ): boolean {
    // Removed console.log('🔐 Verifying Payment Signature:', ...)

    try {
      const keySecret = import.meta.env.PUBLIC_RAZORPAY_KEY_SECRET;
      if (!keySecret) {
        // Removed console.error('❌ Razorpay key secret is not configured')
        return false; // Cannot verify without secret
      }

      // Prepare the payload for signature verification as per latest Razorpay docs
      const payload = [
        paymentDetails.razorpay_payment_id,
        paymentDetails.razorpay_payment_link_id || '',
        paymentDetails.razorpay_payment_link_reference_id || '',
        paymentDetails.razorpay_payment_link_status || '',
      ].join('|');

      // Generate signature
      const generatedSignature = createHmac('sha256', keySecret)
        .update(payload)
        .digest('hex');

      // Compare signatures
      const signatureMatch = generatedSignature === razorpaySignature;

      // Removed console.log('🔍 Signature Verification Result:', ...)

      return signatureMatch;
    } catch (error) {
      // Removed console.error('❌ Signature Verification Error:', error)
      return false; // Verification failed due to an error
    }
  }

  /**
   * Handle payment confirmation
   * @param paymentResponse Payment response from Razorpay
   * @returns Confirmation result
   */
  async confirmPayment(paymentResponse: PaymentResponse) {
    // Verification might be done before calling this, or could be added here.
    return await paymentConfirmationService.handlePaymentConfirmation(
      paymentResponse
    );
  }

  async createPaymentLink(
    userId: string,
    tier: SubscriptionTier
  ): Promise<{ paymentLink: string }> {
    try {
      // Removed debugLog(`Creating payment link for user ${userId} in ${tier} tier`)

      // Validate user ID
      if (!userId) {
        throw new Error('User ID is required');
      }

      const tierConfig = SUBSCRIPTION_TIERS[tier];

      // Construct the redirect URL with full, absolute URL
      const baseUrl =
        import.meta.env.PUBLIC_BASE_URL || 'https://yourresume.com'; // Ensure this fallback is correct for production
      const redirectUrl = new URL('/pricing', baseUrl);
      redirectUrl.searchParams.set('userId', userId);
      redirectUrl.searchParams.set('tier', tier);
      redirectUrl.searchParams.set('proUpgradeSuccess', 'true');

      const paymentLinkOptions = {
        amount: tierConfig.price * 100, // Convert to paise
        currency: 'INR',
        description: `Upgrade to ${tierConfig.name} Tier`,
        customer: {
          name: 'User', // Consider fetching actual user name/email if available and needed
          email: 'user@example.com', // Consider fetching actual user name/email
        },
        notify: {
          sms: false, // Set according to your needs
          email: true, // Set according to your needs
        },
        reminder_enable: true,
        callback_url: redirectUrl.toString(), // Use full, absolute URL
        options: {
          checkout: {
            name: 'PraxJobs', // Updated business name
          },
        },
      };

      const paymentLink = await this.razorpay.paymentLink.create(
        paymentLinkOptions
      );

      // Removed debugLog('Payment link created successfully', ...)

      return {
        paymentLink: paymentLink.short_url,
      };
    } catch (error) {
      // Removed debugLog('❌ Error creating payment link', error)
      throw new Error(
        `Payment link creation failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
}

export const razorpayService = new RazorpayService();