import { TierManagementService } from './tierManagement';
import { RazorpayService } from './razorpayService';
import { notificationService } from './notificationService';
import { SUBSCRIPTION_TIERS } from './subscriptionConfig';
import type { SubscriptionTier } from './subscriptionConfig';

export class SubscriptionLifecycleManager {
  private razorpayService: RazorpayService;

  constructor() {
    this.razorpayService = new RazorpayService();
  }

  /**
   * Initiate subscription upgrade
   * @param userId User's unique identifier
   * @param tier Target subscription tier
   * @returns Subscription details
   */
  async initiateUpgrade(userId: string, tier: SubscriptionTier) {
    try {
      // Validate user
      const userProfile = await TierManagementService.getUserTierProfile(userId);
      
      if (userProfile.currentTier === tier) {
        throw new Error('User is already on this tier');
      }

      // Create Razorpay subscription
      const subscriptionDetails = await this.razorpayService.createSubscription(userId, tier);

      // Send upgrade notification
      await notificationService.notifySubscriptionUpgrade(
        userId, 
        SUBSCRIPTION_TIERS[tier].name
      );

      // Log upgrade attempt
      console.log(`Upgrade initiated for user ${userId} to ${SUBSCRIPTION_TIERS[tier].name} tier`);

      return subscriptionDetails;
    } catch (error) {
      console.error('Subscription upgrade failed:', error);
      throw error;
    }
  }

  /**
   * Handle subscription downgrade
   * @param userId User's unique identifier
   * @param reason Optional reason for downgrade
   */
  async initiateDowngrade(userId: string, reason?: string) {
    try {
      const userProfile = await TierManagementService.getUserTierProfile(userId);
      
      // Cancel existing Razorpay subscription if exists
      if (userProfile.razorpaySubscriptionId) {
        await this.razorpayService.cancelSubscription(userProfile.razorpaySubscriptionId);
      }

      // Downgrade to free tier
      await TierManagementService.downgradeUserTier(userId);

      // Send downgrade notification
      await notificationService.notifySubscriptionDowngrade(
        userId, 
        SUBSCRIPTION_TIERS[userProfile.currentTier].name, 
        reason
      );

      // Log downgrade
      console.log(`Downgrade processed for user ${userId}. Reason: ${reason || 'Not specified'}`);
    } catch (error) {
      console.error('Subscription downgrade failed:', error);
      throw error;
    }
  }
}

// Singleton instance for easy access
export const subscriptionLifecycle = new SubscriptionLifecycleManager();
