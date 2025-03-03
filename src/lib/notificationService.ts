import { doc, setDoc, Timestamp, getFirestore } from 'firebase/firestore';
import { firebaseInstance } from './firebase';

// Safely get Firestore instance
function getDb() {
  if (!firebaseInstance) {
    console.warn('Firebase not initialized. Creating new Firestore instance.');
    return getFirestore();
  }
  return firebaseInstance.db;
}

// Notification channels
export type NotificationChannel = 'email' | 'sms' | 'inapp' | 'push';

// Notification types
export type NotificationType = 
  | 'subscription_upgrade'
  | 'subscription_downgrade'
  | 'payment_success'
  | 'payment_failed'
  | 'tier_limit_warning';

// Notification payload structure
export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  channels?: NotificationChannel[];
  priority?: 'low' | 'medium' | 'high';
}

// Email service (mock implementation)
class EmailService {
  async send(payload: {
    to: string, 
    subject: string, 
    body: string
  }): Promise<boolean> {
    try {
      // TODO: Implement actual email sending logic
      console.log('Email sent:', payload);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }
}

// SMS service (mock implementation)
class SMSService {
  async send(payload: {
    to: string, 
    message: string
  }): Promise<boolean> {
    try {
      // TODO: Implement actual SMS sending logic
      console.log('SMS sent:', payload);
      return true;
    } catch (error) {
      console.error('SMS sending failed:', error);
      return false;
    }
  }
}

// In-App Notification Service
class InAppNotificationService {
  async create(payload: NotificationPayload): Promise<boolean> {
    try {
      // Store notification in Firestore
      const db = getDb();
      const notificationRef = doc(
        db, 
        'userNotifications', 
        `${payload.userId}_${Date.now()}`
      );

      await setDoc(notificationRef, {
        ...payload,
        createdAt: Timestamp.now(),
        read: false
      });

      return true;
    } catch (error) {
      console.error('In-app notification creation failed:', error);
      return false;
    }
  }
}

// Centralized Notification Service
export class NotificationService {
  private emailService: EmailService;
  private smsService: SMSService;
  private inAppNotificationService: InAppNotificationService;

  constructor() {
    this.emailService = new EmailService();
    this.smsService = new SMSService();
    this.inAppNotificationService = new InAppNotificationService();
  }

  /**
   * Send notifications across multiple channels
   * @param payload Notification payload
   */
  async send(payload: NotificationPayload): Promise<{
    email?: boolean,
    sms?: boolean,
    inapp?: boolean
  }> {
    const results: {
      email?: boolean,
      sms?: boolean,
      inapp?: boolean
    } = {};

    // Default channels if not specified
    const channels = payload.channels || ['inapp', 'email'];

    // User contact retrieval (mock - replace with actual user service)
    const userContact = await this.getUserContact(payload.userId);

    // Send notifications based on channels
    if (channels.includes('email') && userContact.email) {
      results.email = await this.emailService.send({
        to: userContact.email,
        subject: this.getEmailSubject(payload.type),
        body: payload.message
      });
    }

    if (channels.includes('sms') && userContact.phone) {
      results.sms = await this.smsService.send({
        to: userContact.phone,
        message: payload.message
      });
    }

    if (channels.includes('inapp')) {
      results.inapp = await this.inAppNotificationService.create(payload);
    }

    return results;
  }

  /**
   * Generate email subject based on notification type
   */
  private getEmailSubject(type: NotificationType): string {
    const subjects = {
      'subscription_upgrade': 'Subscription Upgraded Successfully',
      'subscription_downgrade': 'Subscription Downgraded',
      'payment_success': 'Payment Received',
      'payment_failed': 'Payment Failed',
      'tier_limit_warning': 'Usage Limit Warning'
    };

    return subjects[type] || 'Notification from PraxJobs';
  }

  /**
   * Retrieve user contact information (mock method)
   * TODO: Replace with actual user service
   */
  private async getUserContact(userId: string): Promise<{
    email?: string,
    phone?: string
  }> {
    // Placeholder - replace with actual user service
    return {
      email: `${userId}@example.com`,
      phone: '+1234567890'
    };
  }

  /**
   * Convenience method for subscription upgrade notification
   */
  async notifySubscriptionUpgrade(
    userId: string, 
    tierName: string
  ) {
    await this.send({
      userId,
      type: 'subscription_upgrade',
      title: 'Subscription Upgraded',
      message: `Your subscription has been upgraded to ${tierName} tier. Enjoy enhanced features!`,
      metadata: { tierName },
      channels: ['email', 'inapp']
    });
  }

  /**
   * Convenience method for subscription downgrade notification
   */
  async notifySubscriptionDowngrade(
    userId: string, 
    tierName: string,
    reason?: string
  ) {
    await this.send({
      userId,
      type: 'subscription_downgrade',
      title: 'Subscription Downgraded',
      message: `Your subscription has been downgraded to ${tierName} tier. ${reason ? `Reason: ${reason}` : ''}`,
      metadata: { tierName, reason },
      channels: ['email', 'inapp']
    });
  }
}

// Singleton instance
export const notificationService = new NotificationService();
