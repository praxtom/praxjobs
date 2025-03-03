import Razorpay from 'razorpay';
import { createHmac } from 'crypto';  
import { SUBSCRIPTION_TIERS } from './subscriptionConfig';
import type { SubscriptionTier } from './subscriptionConfig';
import { TierManagementService } from './tierManagement';
import { paymentConfirmationService } from './paymentConfirmation';
import type { PaymentResponse } from '../types/payment';

// Enhanced logging utility
function debugLog(message: string, ...args: any[]) {
    console.log(`[RazorpayService] ${message}`, ...args);
}

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

    console.log('Razorpay Key Configuration:', {
      keyId: keyId ? 'Present' : 'Missing',
      keySecretLength: keySecret ? keySecret.length : 0
    });

    // Validate Razorpay configuration
    if (!keyId || !keySecret) {
      debugLog('❌ Missing Razorpay configuration');
      throw new Error('Razorpay key_id or key_secret is missing. Check your environment variables.');
    }

    try {
      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret
      });
      debugLog('✅ Razorpay service initialized successfully');
    } catch (error) {
      console.error('Razorpay Initialization Detailed Error:', {
        errorName: error instanceof Error ? error.name : 'Unknown Error',
        errorMessage: error instanceof Error ? error.message : 'No error message',
        errorStack: error instanceof Error ? error.stack : 'No stack trace'
      });
      throw new Error(`Failed to initialize Razorpay service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createSubscriptionPlan(tier: SubscriptionTier) {
    const tierConfig = SUBSCRIPTION_TIERS[tier];

    try {
      console.log('Creating Subscription Plan:', {
        tier,
        tierConfig: JSON.stringify(tierConfig)
      });
      
      const plan = await this.razorpay.plans.create({
        period: 'monthly',
        interval: 1,
        item: {
          name: `${tierConfig.name} Tier`,
          amount: tierConfig.price * 100, // Convert to paise
          currency: 'INR',
          description: `Monthly subscription for ${tierConfig.name} tier`
        }
      });

      debugLog('Subscription plan created successfully', { planId: plan.id });
      return plan;
    } catch (error) {
      console.error('Subscription Plan Creation Error:', {
        errorName: error instanceof Error ? error.name : 'Unknown Error',
        errorMessage: error instanceof Error ? error.message : 'No error message',
        errorDetails: JSON.stringify(error)
      });
      throw new Error(`Failed to create subscription plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createSubscription(userId: string, tier: SubscriptionTier) {
    try {
      debugLog(`Creating subscription for user ${userId} in ${tier} tier`);

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
          tier: tier
        }
      });

      debugLog('Subscription created successfully', { 
        subscriptionId: subscription.id, 
        shortUrl: subscription.short_url 
      });

      // Update user's tier in Firebase
      await TierManagementService.upgradeUserTier(
        userId, 
        tier, 
        subscription.id
      );

      return {
        subscriptionId: subscription.id,
        shortUrl: subscription.short_url
      };
    } catch (error) {
      debugLog('❌ Error creating Razorpay subscription', error);
      throw new Error(`Subscription creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      debugLog(`Cancelling subscription: ${subscriptionId}`);
      
      // Cancel the subscription
      await this.razorpay.subscriptions.cancel(subscriptionId);
      
      debugLog(`Subscription ${subscriptionId} cancelled successfully`);
    } catch (error) {
      debugLog(`❌ Error cancelling subscription ${subscriptionId}`, error);
      throw new Error(`Subscription cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async handleSubscriptionWebhook(payload: RazorpayWebhookPayload): Promise<void> {
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
          console.log(`Unhandled webhook event: ${event}`);
      }
    } catch (error) {
      console.error('Error processing subscription webhook:', error);
      // Consider adding more robust error handling or logging
    }
  }

  private async onSubscriptionActivated(payload: RazorpayWebhookPayload): Promise<void> {
    console.log('\ud83d\udce6 Processing Subscription Activation:', {
      subscriptionId: payload.payload.subscription.id,
      notes: payload.payload.subscription.notes,
      status: payload.payload.subscription.status
    });

    const userId = payload.payload.subscription.notes?.userId;
    const tier = payload.payload.subscription.notes?.tier;
    
    // Extensive logging for debugging
    console.log('\ud83d\udd0e Extracted User Details:', {
      userId,
      tier,
      notesPresent: !!payload.payload.subscription.notes,
      noteKeys: payload.payload.subscription.notes ? Object.keys(payload.payload.subscription.notes) : 'No notes'
    });

    if (!userId || !tier) {
      console.error('\u274c Subscription Activation Failed: Missing Critical Data', {
        userId,
        tier,
        fullPayload: JSON.stringify(payload, null, 2)
      });
      throw new Error('Incomplete subscription activation payload');
    }

    try {
      console.log('\ud83d\udd04 Attempting to Upgrade User Tier:', {
        userId,
        tier,
        subscriptionId: payload.payload.subscription.id
      });

      const upgradedProfile = await TierManagementService.upgradeUserTier(
        userId, 
        tier,
        payload.payload.subscription.id
      );

      console.log('\u2705 Subscription Activated Successfully:', {
        userId,
        tier,
        subscriptionId: payload.payload.subscription.id,
        upgradedProfileTier: upgradedProfile.currentTier
      });
    } catch (error) {
      console.error('\u274c Tier Upgrade Error:', {
        userId,
        tier,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : 'No stack trace'
      });
      throw error;
    }
  }

  private async onSubscriptionCharged(payload: RazorpayWebhookPayload): Promise<void> {
    // Extend subscription or perform additional actions
    console.log('Subscription charged:', payload);
    
    const userId = payload.payload.subscription.notes?.userId;
    if (!userId) {
      console.warn('Incomplete subscription charge payload', payload);
    }
  }

  private async onSubscriptionCancelled(payload: RazorpayWebhookPayload): Promise<void> {
    const userId = payload.payload.subscription.notes?.userId;
    
    if (!userId) {
      console.warn('Incomplete subscription cancellation payload', payload);
      return;
    }

    // Revert to free tier or handle cancellation
    await TierManagementService.downgradeUserTier(userId);
  }

  verifyPaymentSignature(
    paymentDetails: { 
      razorpay_payment_id: string, 
      razorpay_payment_link_id?: string,
      razorpay_payment_link_reference_id?: string,
      razorpay_payment_link_status?: string
    }, 
    razorpaySignature: string
  ): boolean {
    console.log('🔐 Verifying Payment Signature:', {
      paymentId: paymentDetails.razorpay_payment_id,
      paymentLinkId: paymentDetails.razorpay_payment_link_id,
      referenceId: paymentDetails.razorpay_payment_link_reference_id,
      status: paymentDetails.razorpay_payment_link_status
    });

    try {
      const keySecret = import.meta.env.PUBLIC_RAZORPAY_KEY_SECRET;
      if (!keySecret) {
        console.error('❌ Razorpay key secret is not configured');
        return false;
      }

      // Prepare the payload for signature verification as per latest Razorpay docs
      const payload = [
        paymentDetails.razorpay_payment_id,
        paymentDetails.razorpay_payment_link_id || '',
        paymentDetails.razorpay_payment_link_reference_id || '',
        paymentDetails.razorpay_payment_link_status || ''
      ].join('|');

      // Generate signature
      const generatedSignature = createHmac('sha256', keySecret)
        .update(payload)
        .digest('hex');

      // Compare signatures
      const signatureMatch = generatedSignature === razorpaySignature;

      console.log('🔍 Signature Verification Result:', {
        signatureMatch,
        generatedSignature,
        receivedSignature: razorpaySignature
      });

      return signatureMatch;
    } catch (error) {
      console.error('❌ Signature Verification Error:', error);
      return false;
    }
  }

  /**
   * Handle payment confirmation
   * @param paymentResponse Payment response from Razorpay
   * @returns Confirmation result
   */
  async confirmPayment(paymentResponse: PaymentResponse) {
    // Verify payment signature here if needed
    return await paymentConfirmationService.handlePaymentConfirmation(paymentResponse);
  }

  async createPaymentLink(
    userId: string, 
    tier: SubscriptionTier
  ): Promise<{ paymentLink: string }> {
    try {
      debugLog(`Creating payment link for user ${userId} in ${tier} tier`);

      // Validate user ID
      if (!userId) {
        throw new Error('User ID is required');
      }

      const tierConfig = SUBSCRIPTION_TIERS[tier];

      // Construct the redirect URL with full, absolute URL
      const baseUrl = import.meta.env.PUBLIC_BASE_URL || 'https://yourresume.com';
      const redirectUrl = new URL('/pricing', baseUrl);
      redirectUrl.searchParams.set('userId', userId);
      redirectUrl.searchParams.set('tier', tier);
      redirectUrl.searchParams.set('proUpgradeSuccess', 'true');

      const paymentLinkOptions = {
        amount: tierConfig.price * 100, // Convert to paise
        currency: 'INR',
        accept_partial: false,
        first_min_partial_amount: 0,
        description: `Upgrade to ${tierConfig.name} Tier`,
        customer: {
          name: 'User', // Consider passing actual customer name if available
          email: 'user@example.com', // Consider passing actual customer email
        },
        notify: {
          sms: false,
          email: false
        },
        reminder_enable: false,
        callback_url: redirectUrl.toString(), // Use full, absolute URL
        callback_method: 'get'
      };

      const paymentLink = await this.razorpay.paymentLink.create(paymentLinkOptions);

      debugLog('Payment link created successfully', { 
        paymentLinkId: paymentLink.id, 
        shortUrl: paymentLink.short_url 
      });

      return {
        paymentLink: paymentLink.short_url
      };
    } catch (error) {
      debugLog('❌ Error creating payment link', error);
      throw new Error(`Payment link creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const razorpayService = new RazorpayService();
