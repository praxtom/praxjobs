import { NotificationService } from './notificationService';
import { TierManagementService } from './tierManagement';
import { PersistentDocumentService } from './persistentDocumentService';
import type { PaymentResponse } from '../types/payment';
import { authService } from './auth';  // Import to get current user

export class PaymentConfirmationService {
  private notificationService: NotificationService;


  constructor() {
    this.notificationService = new NotificationService();

  }

  /**
   * Handle payment confirmation and update user's tier
   * @param paymentDetails Payment response details
   * @returns Payment status and confirmation details
   */
  async handlePaymentConfirmation(paymentDetails: PaymentResponse): Promise<{
    success: boolean;
    message: string;
    tier?: 'free' | 'pro';
  }> {
    try {
      // Get current user ID
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      if (paymentDetails.status === 'success') {
        // Update user's subscription tier
        const userProfile = await TierManagementService.getUserTierProfile(currentUser.uid);
        await TierManagementService.initUserTierProfile(currentUser.uid);

        // Send success notification
        await this.notificationService.send({
          userId: currentUser.uid,
          type: 'payment_success',
          title: 'Payment Successful',
          message: `Payment of ₹${paymentDetails.amount} successful. Tier upgraded to ${paymentDetails.tier}.`,
          channels: ['email', 'inapp'],
          priority: 'high',
          metadata: {
            orderId: paymentDetails.orderId,
            amount: paymentDetails.amount,
            tier: paymentDetails.tier
          }
        });

        return {
          success: true,
          message: 'Payment successful. Tier upgraded.',
          tier: paymentDetails.tier
        };
      } else {
        // Send failure notification
        await this.notificationService.send({
          userId: currentUser.uid,
          type: 'payment_failed',
          title: 'Payment Failed',
          message: `Payment for order ${paymentDetails.orderId} failed.`,
          channels: ['email', 'inapp'],
          priority: 'high',
          metadata: {
            orderId: paymentDetails.orderId,
            amount: paymentDetails.amount
          }
        });

        return {
          success: false,
          message: 'Payment failed. Please try again.'
        };
      }
    } catch (error) {
      console.error('Payment confirmation error:', error);
      
      // Get current user ID or use a fallback
      const currentUser = await authService.getCurrentUser();
      const userId = currentUser?.uid || 'unknown';

      await this.notificationService.send({
        userId,
        type: 'tier_limit_warning',
        title: 'Payment Processing Error',
        message: 'An unexpected error occurred during payment processing.',
        channels: ['email', 'inapp'],
        priority: 'high'
      });

      return {
        success: false,
        message: 'An unexpected error occurred. Please contact support.'
      };
    }
  }
}

export const paymentConfirmationService = new PaymentConfirmationService();
