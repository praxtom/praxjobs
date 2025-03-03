import { doc, getDoc, updateDoc, setDoc, Timestamp, getFirestore, Firestore, collection, getDocs, increment } from 'firebase/firestore';
import { firebaseInstance } from './firebase';
import type { 
  SubscriptionTier, 
  Feature, 
  FeatureUsageLimit 
} from './subscriptionConfig';
import { SUBSCRIPTION_TIERS } from './subscriptionConfig';
import { addMonths, isAfter } from '../utils/dateUtils';

// Safely get Firestore instance
export interface FeatureUsageEntry {
  usageCount: number;
  maxAllowedUsage: FeatureUsageLimit;
  lastResetTimestamp?: Timestamp;
}

export interface UserSubscription {
  userId: string;
  currentTier: SubscriptionTier;
  featureUsage: {
    resumeGeneration: FeatureUsageEntry;
    coverLetterGeneration: FeatureUsageEntry;
    jobAnalysis: FeatureUsageEntry;
    jobTrackers: FeatureUsageEntry;
    jobApplications: FeatureUsageEntry;
    interviewPrep: FeatureUsageEntry;
  };
  subscriptionStartDate: Timestamp;
  subscriptionEndDate?: Timestamp;
  paymentStatus: 'active' | 'expired' | 'pending';
  razorpaySubscriptionId?: string;
  updatedBy?: string;
}

// Feature usage limits for different tiers
const FEATURE_LIMITS = {
    free: {
        resumeGeneration: 5,
        coverLetterGeneration: 5,
        jobAnalysis: 5,
        jobTrackers: 5,
        jobApplications: 5,
        interviewPrep: 5
    },
    pro: {
        resumeGeneration: Infinity,
        coverLetterGeneration: Infinity,
        jobAnalysis: Infinity,
        jobTrackers: Infinity,
        jobApplications: Infinity,
        interviewPrep: Infinity
    }
};

// Normalized feature key type
export type FeatureKey = keyof UserSubscription['featureUsage'] | 'coverLetter' | 'interviewPrep';

export class TierManagementService {
  private static db: Firestore;

  private static initDb(): void {
    if (!this.db) {
      this.db = firebaseInstance?.db || getFirestore();
    }
  }

  private static getFirestoreInstance(): Firestore {
    this.initDb();
    return this.db;
  }

  static async initUserTierProfile(userId: string): Promise<UserSubscription> {
    const initialTier: SubscriptionTier = 'free';
    const tierConfig = SUBSCRIPTION_TIERS[initialTier];

    const initialProfile: UserSubscription = {
      userId,
      currentTier: initialTier,
      featureUsage: {
        resumeGeneration: {
          usageCount: 0,
          maxAllowedUsage: tierConfig.featureUsageLimits.resumeGeneration,
          lastResetTimestamp: Timestamp.now()
        },
        coverLetterGeneration: {
          usageCount: 0,
          maxAllowedUsage: tierConfig.featureUsageLimits.coverLetterGeneration,
          lastResetTimestamp: Timestamp.now()
        },
        jobAnalysis: {
          usageCount: 0,
          maxAllowedUsage: tierConfig.featureUsageLimits.jobAnalysis,
          lastResetTimestamp: Timestamp.now()
        },
        jobTrackers: {
          usageCount: 0,
          maxAllowedUsage: tierConfig.featureUsageLimits.jobTrackers,
          lastResetTimestamp: Timestamp.now()
        },
        jobApplications: {
          usageCount: 0,
          maxAllowedUsage: tierConfig.featureUsageLimits.jobApplications,
          lastResetTimestamp: Timestamp.now()
        },
        interviewPrep: {
          usageCount: 0,
          maxAllowedUsage: tierConfig.featureUsageLimits.interviewPrep,
          lastResetTimestamp: Timestamp.now()
        }
      },
      subscriptionStartDate: Timestamp.now(),
      paymentStatus: 'active',
      updatedBy: 'webhook'
    };

    const db = this.getFirestoreInstance();
    await setDoc(doc(db, 'userSubscriptions', userId), initialProfile);
    return initialProfile;
  }

  static async getUserTierProfile(userId: string): Promise<UserSubscription> {
    try {
      const db = this.getFirestoreInstance();
      const docRef = doc(db, 'userSubscriptions', userId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return this.initUserTierProfile(userId);
      }

      // Check and reset feature usage before returning the profile
      return await this.checkAndResetFeatureUsageIfNeeded(userId);
    } catch (error) {
      console.error('Error getting user tier profile:', error);
      throw error;
    }
  }

  static async trackFeatureUsage(userId: string, feature: Feature): Promise<boolean> {
    try {
      const db = this.getFirestoreInstance();
      
      // Get subscription document
      const userSubscriptionRef = doc(db, 'userSubscriptions', userId);
      const userSubscriptionSnap = await getDoc(userSubscriptionRef);
      
      if (!userSubscriptionSnap.exists()) {
        // Initialize subscription if it doesn't exist
        await this.initUserTierProfile(userId);
        return true;
      }

      const subscriptionData = userSubscriptionSnap.data();
      
      // Get current usage from subscription document
      const currentUsage = subscriptionData.featureUsage[feature].usageCount;
      const currentTier = subscriptionData.currentTier as SubscriptionTier;
      const featureLimit = SUBSCRIPTION_TIERS[currentTier].featureUsageLimits[feature];

      console.log('Feature Usage Check:', {
        userId,
        feature,
        currentTier: subscriptionData.currentTier,
        currentUsage,
        limit: featureLimit
      });

      // Explicit check for feature limit
      if (currentUsage >= featureLimit) {
        console.warn(`Feature limit exceeded for ${feature} in ${subscriptionData.currentTier} tier`);
        throw new Error(`You have reached the maximum number of ${feature} generations for your ${subscriptionData.currentTier} tier. Upgrade to continue.`);
      }

      const timestamp = Timestamp.now();

      // Update subscription document for feature tracking
      await updateDoc(userSubscriptionRef, {
        [`featureUsage.${feature}.usageCount`]: increment(1),
        [`featureUsage.${feature}.lastUpdateTimestamp`]: timestamp,
        updatedBy: 'webhook'
      });

      console.log(`Feature usage updated for ${feature}. New count: ${currentUsage + 1}/${featureLimit}`);
      return true;
    } catch (error) {
      console.error('Feature usage tracking error:', error);
      throw error; // Re-throw to allow caller to handle
    }
  }

  static async getUserTierStatus(userId: string): Promise<{
    currentTier: SubscriptionTier;
    featureUsage: {
      resumeGeneration: { usageCount: number; limit: FeatureUsageLimit };
      coverLetterGeneration: { usageCount: number; limit: FeatureUsageLimit };
      jobAnalysis: { usageCount: number; limit: FeatureUsageLimit };
      jobTrackers: { usageCount: number; limit: FeatureUsageLimit };
      jobApplications: { usageCount: number; limit: FeatureUsageLimit };
      interviewPrep: { usageCount: number; limit: FeatureUsageLimit };
    }
  }> {
    const tierProfile = await this.getUserTierProfile(userId);
    
    return {
      currentTier: tierProfile.currentTier,
      featureUsage: {
        resumeGeneration: {
          usageCount: tierProfile.featureUsage.resumeGeneration.usageCount,
          limit: SUBSCRIPTION_TIERS[tierProfile.currentTier].featureUsageLimits.resumeGeneration
        },
        coverLetterGeneration: {
          usageCount: tierProfile.featureUsage.coverLetterGeneration.usageCount,
          limit: SUBSCRIPTION_TIERS[tierProfile.currentTier].featureUsageLimits.coverLetterGeneration
        },
        jobAnalysis: {
          usageCount: tierProfile.featureUsage.jobAnalysis.usageCount,
          limit: SUBSCRIPTION_TIERS[tierProfile.currentTier].featureUsageLimits.jobAnalysis
        },
        jobTrackers: {
          usageCount: tierProfile.featureUsage.jobTrackers.usageCount,
          limit: SUBSCRIPTION_TIERS[tierProfile.currentTier].featureUsageLimits.jobTrackers
        },
        jobApplications: {
          usageCount: tierProfile.featureUsage.jobApplications.usageCount,
          limit: SUBSCRIPTION_TIERS[tierProfile.currentTier].featureUsageLimits.jobApplications
        },
        interviewPrep: {
          usageCount: tierProfile.featureUsage.interviewPrep.usageCount,
          limit: SUBSCRIPTION_TIERS[tierProfile.currentTier].featureUsageLimits.interviewPrep
        }
      }
    };
  }

  static async trackJobTracker(userId: string): Promise<boolean> {
    try {
      const tierProfile = await this.checkAndResetFeatureUsageIfNeeded(userId);
      const jobTrackersUsage = tierProfile.featureUsage.jobTrackers;

      // Check if user has reached the maximum number of job trackers
      if (jobTrackersUsage.usageCount >= jobTrackersUsage.maxAllowedUsage) {
        throw new Error('You have reached the maximum number of job trackers. Delete an existing tracker to add a new one.');
      }

      // Increment job trackers usage
      jobTrackersUsage.usageCount += 1;

      // Update Firestore document
      const db = this.getFirestoreInstance();
      await updateDoc(doc(db, 'userSubscriptions', userId), {
        'featureUsage.jobTrackers': jobTrackersUsage,
        updatedBy: 'webhook'
      });

      return true;
    } catch (error) {
      console.error('Job tracker tracking error:', error);
      throw error;
    }
  }

  static async trackJobApplication(userId: string): Promise<boolean> {
    try {
      const tierProfile = await this.checkAndResetFeatureUsageIfNeeded(userId);
      const jobApplicationsUsage = tierProfile.featureUsage.jobApplications;

      // Check if user has reached the maximum number of job applications
      if (jobApplicationsUsage.usageCount >= jobApplicationsUsage.maxAllowedUsage) {
        throw new Error('You have reached the maximum number of job applications. Delete an existing application to add a new one.');
      }

      // Increment job applications usage
      jobApplicationsUsage.usageCount += 1;

      // Update Firestore document
      const db = this.getFirestoreInstance();
      await updateDoc(doc(db, 'userSubscriptions', userId), {
        'featureUsage.jobApplications': jobApplicationsUsage,
        updatedBy: 'webhook'
      });

      return true;
    } catch (error) {
      console.error('Job application tracking error:', error);
      throw error;
    }
  }

  static async upgradeUserTier(
    userId: string, 
    newTier: SubscriptionTier, 
    razorpaySubscriptionId?: string
  ): Promise<UserSubscription> {
    console.log(`🚀 Upgrading User Tier`, { userId, newTier });

    try {
      const db = this.getFirestoreInstance();
      const userSubscriptionRef = doc(db, 'userSubscriptions', userId);
      const tierConfig = SUBSCRIPTION_TIERS[newTier];

      // Prepare default feature usage with all necessary fields
      const defaultFeatureUsage = {
        resumeGeneration: {
          usageCount: 0,
          maxAllowedUsage: tierConfig.featureUsageLimits.resumeGeneration,
          lastResetTimestamp: Timestamp.now()
        },
        coverLetterGeneration: {
          usageCount: 0,
          maxAllowedUsage: tierConfig.featureUsageLimits.coverLetterGeneration,
          lastResetTimestamp: Timestamp.now()
        },
        jobAnalysis: {
          usageCount: 0,
          maxAllowedUsage: tierConfig.featureUsageLimits.jobAnalysis,
          lastResetTimestamp: Timestamp.now()
        },
        jobTrackers: {
          usageCount: 0,
          maxAllowedUsage: tierConfig.featureUsageLimits.jobTrackers,
          lastResetTimestamp: Timestamp.now()
        },
        jobApplications: {
          usageCount: 0,
          maxAllowedUsage: tierConfig.featureUsageLimits.jobApplications,
          lastResetTimestamp: Timestamp.now()
        },
        interviewPrep: {
          usageCount: 0,
          maxAllowedUsage: tierConfig.featureUsageLimits.interviewPrep,
          lastResetTimestamp: Timestamp.now()
        }
      };

      const subscriptionData = {
        userId,
        currentTier: newTier,
        paymentStatus: 'active',
        razorpaySubscriptionId: razorpaySubscriptionId || null,
        featureUsage: defaultFeatureUsage,
        subscriptionStartDate: Timestamp.now(),
        subscriptionEndDate: new Timestamp(
          Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
          0
        ),
        updatedBy: 'webhook'
      };

      // Update subscription document
      await updateDoc(userSubscriptionRef, subscriptionData);

      console.log(`✅ Successfully Upgraded to ${newTier} Tier`, { userId });

      return subscriptionData as UserSubscription;

    } catch (error) {
      console.error(`❌ Tier Upgrade Failed`, {
        userId,
        newTier,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  static async downgradeUserTier(userId: string): Promise<UserSubscription> {
    const db = this.getFirestoreInstance();
    const defaultTier: SubscriptionTier = 'free';
    const tierConfig = SUBSCRIPTION_TIERS[defaultTier];

    const downgradedProfile: UserSubscription = {
      userId,
      currentTier: defaultTier,
      featureUsage: {
        resumeGeneration: {
          usageCount: 0,
          maxAllowedUsage: tierConfig.featureUsageLimits.resumeGeneration,
          lastResetTimestamp: Timestamp.now()
        },
        coverLetterGeneration: {
          usageCount: 0,
          maxAllowedUsage: tierConfig.featureUsageLimits.coverLetterGeneration,
          lastResetTimestamp: Timestamp.now()
        },
        jobAnalysis: {
          usageCount: 0,
          maxAllowedUsage: tierConfig.featureUsageLimits.jobAnalysis,
          lastResetTimestamp: Timestamp.now()
        },
        jobTrackers: {
          usageCount: 0,
          maxAllowedUsage: tierConfig.featureUsageLimits.jobTrackers,
          lastResetTimestamp: Timestamp.now()
        },
        jobApplications: {
          usageCount: 0,
          maxAllowedUsage: tierConfig.featureUsageLimits.jobApplications,
          lastResetTimestamp: Timestamp.now()
        },
        interviewPrep: {
          usageCount: 0,
          maxAllowedUsage: tierConfig.featureUsageLimits.interviewPrep,
          lastResetTimestamp: Timestamp.now()
        }
      },
      subscriptionStartDate: Timestamp.now(),
      subscriptionEndDate: undefined,
      paymentStatus: 'expired',
      razorpaySubscriptionId: undefined,
      updatedBy: 'webhook'
    };

    // Convert to plain object for Firestore compatibility
    const firestoreUpdateData = JSON.parse(JSON.stringify(downgradedProfile));
    await updateDoc(doc(db, 'userSubscriptions', userId), firestoreUpdateData);
    
    return downgradedProfile;
  }

  static async resetDeletedAccountUsage(userId: string): Promise<void> {
    try {
      const db = this.getFirestoreInstance();
      const userSubscriptionRef = doc(db, 'userSubscriptions', userId);

      // Reset to initial tier and usage
      const initialTier: SubscriptionTier = 'free';
      const tierConfig = SUBSCRIPTION_TIERS[initialTier];

      // Create a new usage tracking entry that prevents regeneration
      await setDoc(userSubscriptionRef, {
        userId,
        currentTier: initialTier,
        featureUsage: {
          resumeGeneration: {
            usageCount: 0,
            maxAllowedUsage: tierConfig.featureUsageLimits.resumeGeneration,
            lastResetTimestamp: Timestamp.now()
          },
          coverLetterGeneration: {
            usageCount: 0,
            maxAllowedUsage: tierConfig.featureUsageLimits.coverLetterGeneration,
            lastResetTimestamp: Timestamp.now()
          },
          jobAnalysis: {
            usageCount: 0,
            maxAllowedUsage: tierConfig.featureUsageLimits.jobAnalysis,
            lastResetTimestamp: Timestamp.now()
          },
          jobTrackers: {
            usageCount: 0,
            maxAllowedUsage: tierConfig.featureUsageLimits.jobTrackers,
            lastResetTimestamp: Timestamp.now()
          },
          jobApplications: {
            usageCount: 0,
            maxAllowedUsage: tierConfig.featureUsageLimits.jobApplications,
            lastResetTimestamp: Timestamp.now()
          },
          interviewPrep: {
            usageCount: 0,
            maxAllowedUsage: tierConfig.featureUsageLimits.interviewPrep,
            lastResetTimestamp: Timestamp.now()
          }
        },
        subscriptionStartDate: Timestamp.now(),
        subscriptionEndDate: null,
        paymentStatus: 'expired',
        deletedAccountFlag: true,  // Add a flag to prevent further usage
        updatedBy: 'webhook'
      }, { merge: false });

      // Clear any local storage related to usage
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('userUsageTracking');
      }
    } catch (error) {
      console.error('Error resetting deleted account usage:', error);
      throw error;
    }
  }

  static async checkAndResetFeatureUsage(userId: string): Promise<void> {
    try {
      const db = this.getFirestoreInstance();
      const userSubscriptionRef = doc(db, 'userSubscriptions', userId);
      const userSubscriptionSnap = await getDoc(userSubscriptionRef);
      
      if (!userSubscriptionSnap.exists()) {
        console.warn(`No subscription found for user ${userId}`);
        return;
      }

      const userData = userSubscriptionSnap.data() as UserSubscription;
      const currentTier = userData.currentTier;
      const billingCycle = SUBSCRIPTION_TIERS[currentTier].billingCycle;
      
      // Determine if reset is needed based on billing cycle
      const subscriptionStartDate = userData.subscriptionStartDate.toDate();
      const nextResetDate = addMonths(subscriptionStartDate, billingCycle === 'monthly' ? 1 : 12);
      const now = new Date();

      // If it's time to reset
      if (isAfter(now, nextResetDate)) {
        // Reset feature usage for all features
        const resetFeatureUsage: UserSubscription['featureUsage'] = {
          resumeGeneration: {
            usageCount: 0,
            maxAllowedUsage: SUBSCRIPTION_TIERS[currentTier].featureUsageLimits.resumeGeneration,
            lastResetTimestamp: Timestamp.now()
          },
          coverLetterGeneration: {
            usageCount: 0,
            maxAllowedUsage: SUBSCRIPTION_TIERS[currentTier].featureUsageLimits.coverLetterGeneration,
            lastResetTimestamp: Timestamp.now()
          },
          jobAnalysis: {
            usageCount: 0,
            maxAllowedUsage: SUBSCRIPTION_TIERS[currentTier].featureUsageLimits.jobAnalysis,
            lastResetTimestamp: Timestamp.now()
          },
          jobTrackers: {
            usageCount: 0,
            maxAllowedUsage: SUBSCRIPTION_TIERS[currentTier].featureUsageLimits.jobTrackers,
            lastResetTimestamp: Timestamp.now()
          },
          jobApplications: {
            usageCount: 0,
            maxAllowedUsage: SUBSCRIPTION_TIERS[currentTier].featureUsageLimits.jobApplications,
            lastResetTimestamp: Timestamp.now()
          },
          interviewPrep: {
            usageCount: 0,
            maxAllowedUsage: SUBSCRIPTION_TIERS[currentTier].featureUsageLimits.interviewPrep,
            lastResetTimestamp: Timestamp.now()
          }
        };

        // Update the document with reset usage and new subscription start date
        await updateDoc(userSubscriptionRef, {
          featureUsage: resetFeatureUsage,
          subscriptionStartDate: Timestamp.now(),
          updatedBy: 'webhook'
        });

        console.log(`Reset feature usage for user ${userId} on tier ${currentTier}`);
      }
    } catch (error) {
      console.error('Error resetting feature usage:', error);
    }
  }

  static async resetAllUsersFeatureUsage(): Promise<void> {
    try {
      const db = this.getFirestoreInstance();
      const userSubscriptionsRef = collection(db, 'userSubscriptions');
      const querySnapshot = await getDocs(userSubscriptionsRef);

      const resetPromises = querySnapshot.docs.map(async (doc) => {
        await this.checkAndResetFeatureUsage(doc.id);
      });

      await Promise.all(resetPromises);
      console.log('Completed feature usage reset for all users');
    } catch (error) {
      console.error('Error resetting feature usage for all users:', error);
    }
  }

  static async manuallyResetUserFeatureUsage(userId: string): Promise<void> {
    try {
      const db = this.getFirestoreInstance();
      const userSubscriptionRef = doc(db, 'userSubscriptions', userId);
      const userSubscriptionSnap = await getDoc(userSubscriptionRef);
      
      if (!userSubscriptionSnap.exists()) {
        throw new Error(`No subscription found for user ${userId}`);
      }

      const userData = userSubscriptionSnap.data() as UserSubscription;
      const currentTier = userData.currentTier;

      // Reset feature usage
      const resetFeatureUsage: UserSubscription['featureUsage'] = {
        resumeGeneration: {
          usageCount: 0,
          maxAllowedUsage: SUBSCRIPTION_TIERS[currentTier].featureUsageLimits.resumeGeneration,
          lastResetTimestamp: Timestamp.now()
        },
        coverLetterGeneration: {
          usageCount: 0,
          maxAllowedUsage: SUBSCRIPTION_TIERS[currentTier].featureUsageLimits.coverLetterGeneration,
          lastResetTimestamp: Timestamp.now()
        },
        jobAnalysis: {
          usageCount: 0,
          maxAllowedUsage: SUBSCRIPTION_TIERS[currentTier].featureUsageLimits.jobAnalysis,
          lastResetTimestamp: Timestamp.now()
        },
        jobTrackers: {
          usageCount: 0,
          maxAllowedUsage: SUBSCRIPTION_TIERS[currentTier].featureUsageLimits.jobTrackers,
          lastResetTimestamp: Timestamp.now()
        },
        jobApplications: {
          usageCount: 0,
          maxAllowedUsage: SUBSCRIPTION_TIERS[currentTier].featureUsageLimits.jobApplications,
          lastResetTimestamp: Timestamp.now()
        },
        interviewPrep: {
          usageCount: 0,
          maxAllowedUsage: SUBSCRIPTION_TIERS[currentTier].featureUsageLimits.interviewPrep,
          lastResetTimestamp: Timestamp.now()
        }
      };

      // Update the document with reset usage and new subscription start date
      await updateDoc(userSubscriptionRef, {
        featureUsage: resetFeatureUsage,
        subscriptionStartDate: Timestamp.now(),
        updatedBy: 'webhook'
      });

      console.log(`Manually reset feature usage for user ${userId}`);
    } catch (error) {
      console.error('Error manually resetting feature usage:', error);
      throw error;
    }
  }

  static async initializeUserSubscriptionIfNeeded(userId: string): Promise<UserSubscription> {
    try {
      const db = this.getFirestoreInstance();
      const userSubscriptionRef = doc(db, 'userSubscriptions', userId);

      // If subscription already exists, return it
      const userSubscriptionDoc = await getDoc(userSubscriptionRef);
      if (userSubscriptionDoc.exists()) {
        return userSubscriptionDoc.data() as UserSubscription;
      }

      // Default tier configuration
      const defaultTier: SubscriptionTier = 'free';
      const tierConfig = SUBSCRIPTION_TIERS[defaultTier];

      // Comprehensive default feature usage
      const defaultFeatureUsage = {
        resumeGeneration: {
          usageCount: 0,
          maxAllowedUsage: tierConfig.featureUsageLimits.resumeGeneration,
          lastResetTimestamp: Timestamp.now()
        },
        coverLetterGeneration: {
          usageCount: 0,
          maxAllowedUsage: tierConfig.featureUsageLimits.coverLetterGeneration,
          lastResetTimestamp: Timestamp.now()
        },
        jobAnalysis: {
          usageCount: 0,
          maxAllowedUsage: tierConfig.featureUsageLimits.jobAnalysis,
          lastResetTimestamp: Timestamp.now()
        },
        jobTrackers: {
          usageCount: 0,
          maxAllowedUsage: tierConfig.featureUsageLimits.jobTrackers,
          lastResetTimestamp: Timestamp.now()
        },
        jobApplications: {
          usageCount: 0,
          maxAllowedUsage: tierConfig.featureUsageLimits.jobApplications,
          lastResetTimestamp: Timestamp.now()
        },
        interviewPrep: {
          usageCount: 0,
          maxAllowedUsage: tierConfig.featureUsageLimits.interviewPrep,
          lastResetTimestamp: Timestamp.now()
        }
      };

      // Create new subscription document with default values
      const newSubscription = {
        userId,
        currentTier: defaultTier,
        paymentStatus: 'pending',
        featureUsage: defaultFeatureUsage,
        subscriptionStartDate: Timestamp.now(),
        updatedBy: 'webhook'
      } as UserSubscription;

      await setDoc(userSubscriptionRef, newSubscription);
      console.log(`Created new subscription for user ${userId}`);

      return newSubscription;
    } catch (error) {
      console.error('Error initializing user subscription:', error);
      throw error;
    }
  }

  static async checkAndResetFeatureUsageIfNeeded(userId: string): Promise<UserSubscription> {
    try {
      // First, ensure the subscription exists
      const initializedSubscription = await this.initializeUserSubscriptionIfNeeded(userId);

      // If initialization fails or returns an empty object, create a default subscription
      if (!initializedSubscription || !initializedSubscription.featureUsage) {
        const defaultTier: SubscriptionTier = 'free';
        const tierConfig = SUBSCRIPTION_TIERS[defaultTier];
        
        const defaultSubscription: UserSubscription = {
          userId,
          currentTier: defaultTier,
          featureUsage: {
            resumeGeneration: {
              usageCount: 0,
              maxAllowedUsage: tierConfig.featureUsageLimits.resumeGeneration,
              lastResetTimestamp: Timestamp.now()
            },
            coverLetterGeneration: {
              usageCount: 0,
              maxAllowedUsage: tierConfig.featureUsageLimits.coverLetterGeneration,
              lastResetTimestamp: Timestamp.now()
            },
            jobAnalysis: {
              usageCount: 0,
              maxAllowedUsage: tierConfig.featureUsageLimits.jobAnalysis,
              lastResetTimestamp: Timestamp.now()
            },
            jobTrackers: {
              usageCount: 0,
              maxAllowedUsage: tierConfig.featureUsageLimits.jobTrackers,
              lastResetTimestamp: Timestamp.now()
            },
            jobApplications: {
              usageCount: 0,
              maxAllowedUsage: tierConfig.featureUsageLimits.jobApplications,
              lastResetTimestamp: Timestamp.now()
            },
            interviewPrep: {
              usageCount: 0,
              maxAllowedUsage: tierConfig.featureUsageLimits.interviewPrep,
              lastResetTimestamp: Timestamp.now()
            }
          },
          subscriptionStartDate: Timestamp.now(),
          paymentStatus: 'pending',
          updatedBy: 'webhook'
        };

        // Save the default subscription
        const db = this.getFirestoreInstance();
        const userSubscriptionRef = doc(db, 'userSubscriptions', userId);
        await setDoc(userSubscriptionRef, defaultSubscription, { merge: true });

        console.warn(`Created default subscription for user ${userId}`);
        return defaultSubscription;
      }

      const db = this.getFirestoreInstance();
      const userSubscriptionRef = doc(db, 'userSubscriptions', userId);
      const userSubscriptionSnap = await getDoc(userSubscriptionRef);
      
      if (!userSubscriptionSnap.exists()) {
        console.warn(`No subscription document found for user ${userId}. Using initialized subscription.`);
        return initializedSubscription;
      }

      const userData = userSubscriptionSnap.data() as UserSubscription;
      const currentTier = userData.currentTier || 'free';
      const billingCycle = SUBSCRIPTION_TIERS[currentTier].billingCycle;
      
      // Determine if reset is needed based on billing cycle
      const subscriptionStartDate = userData.subscriptionStartDate.toDate();
      const nextResetDate = addMonths(subscriptionStartDate, billingCycle === 'monthly' ? 1 : 12);
      const now = new Date();

      // If it's time to reset
      if (isAfter(now, nextResetDate)) {
        // Reset feature usage for all features
        const resetFeatureUsage: UserSubscription['featureUsage'] = {
          resumeGeneration: {
            usageCount: 0,
            maxAllowedUsage: SUBSCRIPTION_TIERS[currentTier].featureUsageLimits.resumeGeneration,
            lastResetTimestamp: Timestamp.now()
          },
          coverLetterGeneration: {
            usageCount: 0,
            maxAllowedUsage: SUBSCRIPTION_TIERS[currentTier].featureUsageLimits.coverLetterGeneration,
            lastResetTimestamp: Timestamp.now()
          },
          jobAnalysis: {
            usageCount: 0,
            maxAllowedUsage: SUBSCRIPTION_TIERS[currentTier].featureUsageLimits.jobAnalysis,
            lastResetTimestamp: Timestamp.now()
          },
          jobTrackers: {
            usageCount: 0,
            maxAllowedUsage: SUBSCRIPTION_TIERS[currentTier].featureUsageLimits.jobTrackers,
            lastResetTimestamp: Timestamp.now()
          },
          jobApplications: {
            usageCount: 0,
            maxAllowedUsage: SUBSCRIPTION_TIERS[currentTier].featureUsageLimits.jobApplications,
            lastResetTimestamp: Timestamp.now()
          },
          interviewPrep: {
            usageCount: 0,
            maxAllowedUsage: SUBSCRIPTION_TIERS[currentTier].featureUsageLimits.interviewPrep,
            lastResetTimestamp: Timestamp.now()
          }
        };

        // Update the document with reset usage and new subscription start date
        await updateDoc(userSubscriptionRef, {
          featureUsage: resetFeatureUsage,
          subscriptionStartDate: Timestamp.now(),
          updatedBy: 'webhook'
        });

        console.log(`Reset feature usage for user ${userId} on tier ${currentTier}`);
        
        // Return the updated user subscription
        return {
          ...userData,
          featureUsage: resetFeatureUsage,
          subscriptionStartDate: Timestamp.now()
        };
      }

      // Return the original user data if no reset is needed
      return userData;
    } catch (error) {
      console.error('Error checking and resetting feature usage:', error);
      
      // Fallback to a minimal default subscription
      const defaultTier: SubscriptionTier = 'free';
      const tierConfig = SUBSCRIPTION_TIERS[defaultTier];
      
      return {
        userId,
        currentTier: defaultTier,
        featureUsage: {
          resumeGeneration: {
            usageCount: 0,
            maxAllowedUsage: tierConfig.featureUsageLimits.resumeGeneration,
            lastResetTimestamp: Timestamp.now()
          },
          coverLetterGeneration: {
            usageCount: 0,
            maxAllowedUsage: tierConfig.featureUsageLimits.coverLetterGeneration,
            lastResetTimestamp: Timestamp.now()
          },
          jobAnalysis: {
            usageCount: 0,
            maxAllowedUsage: tierConfig.featureUsageLimits.jobAnalysis,
            lastResetTimestamp: Timestamp.now()
          },
          jobTrackers: {
            usageCount: 0,
            maxAllowedUsage: tierConfig.featureUsageLimits.jobTrackers,
            lastResetTimestamp: Timestamp.now()
          },
          jobApplications: {
            usageCount: 0,
            maxAllowedUsage: tierConfig.featureUsageLimits.jobApplications,
            lastResetTimestamp: Timestamp.now()
          },
          interviewPrep: {
            usageCount: 0,
            maxAllowedUsage: tierConfig.featureUsageLimits.interviewPrep,
            lastResetTimestamp: Timestamp.now()
          }
        },
        subscriptionStartDate: Timestamp.now(),
        paymentStatus: 'pending',
        updatedBy: 'webhook'
      };
    }
  }

  static async getCurrentFeatureUsage(userId: string, feature: keyof UserSubscription['featureUsage']): Promise<number> {
    try {
      // Ensure subscription exists before getting usage
      await this.initializeUserSubscriptionIfNeeded(userId);
      
      const tierProfile = await this.checkAndResetFeatureUsageIfNeeded(userId);
      
      // Add additional null/undefined checks
      if (!tierProfile.featureUsage) {
        console.warn(`Feature usage not initialized for user ${userId}`);
        return 0;
      }

      const featureUsage = tierProfile.featureUsage[feature];
      
      if (!featureUsage) {
        console.warn(`Feature ${feature} not found in usage profile for user ${userId}`);
        return 0;
      }

      return featureUsage.usageCount || 0;
    } catch (error) {
      console.error(`Error getting current ${feature} usage:`, error);
      return 0;
    }
  }

  /**
   * Get all feature usage statistics at once for a user
   * @param userId User ID to get usage statistics for
   * @returns Object containing all feature usage counts
   */
  static async getAllFeatureUsage(userId: string): Promise<Record<string, number>> {
    try {
      // Ensure subscription exists before getting usage
      await this.initializeUserSubscriptionIfNeeded(userId);
      
      const tierProfile = await this.checkAndResetFeatureUsageIfNeeded(userId);
      
      // Default empty usage map
      const usageMap: Record<string, number> = {
        resumeGeneration: 0,
        coverLetterGeneration: 0,
        jobAnalysis: 0,
        jobTrackers: 0,
        jobApplications: 0,
        interviewPrep: 0
      };
      
      // If no feature usage is initialized, return defaults
      if (!tierProfile.featureUsage) {
        console.warn(`Feature usage not initialized for user ${userId}`);
        return usageMap;
      }

      // Add counts for each feature that exists
      Object.entries(tierProfile.featureUsage).forEach(([feature, data]) => {
        if (data && typeof data.usageCount === 'number') {
          usageMap[feature] = data.usageCount;
        }
      });

      return usageMap;
    } catch (error) {
      console.error('Error getting all feature usage:', error);
      // Return empty usage map on error
      return {
        resumeGeneration: 0,
        coverLetterGeneration: 0,
        jobAnalysis: 0,
        jobTrackers: 0,
        jobApplications: 0,
        interviewPrep: 0
      };
    }
  }

  static async trackResumeGeneration(userId: string): Promise<boolean> {
    try {
      const tierProfile = await this.checkAndResetFeatureUsageIfNeeded(userId);
      const resumeGenerationUsage = tierProfile.featureUsage.resumeGeneration;

      // Check if user has reached the maximum number of resume generations
      if (resumeGenerationUsage.usageCount >= resumeGenerationUsage.maxAllowedUsage) {
        throw new Error('You have reached the maximum number of resume generations. Upgrade to continue.');
      }

      // Increment resume generation usage
      resumeGenerationUsage.usageCount += 1;

      // Update Firestore document
      const db = this.getFirestoreInstance();
      await updateDoc(doc(db, 'userSubscriptions', userId), {
        'featureUsage.resumeGeneration': resumeGenerationUsage,
        updatedBy: 'webhook'
      });

      return true;
    } catch (error) {
      console.error('Resume generation tracking error:', error);
      throw error;
    }
  }

  static async trackCoverLetterGeneration(userId: string): Promise<boolean> {
    try {
      const tierProfile = await this.checkAndResetFeatureUsageIfNeeded(userId);
      const coverLetterGenerationUsage = tierProfile.featureUsage.coverLetterGeneration;

      // Check if user has reached the maximum number of cover letter generations
      if (coverLetterGenerationUsage.usageCount >= coverLetterGenerationUsage.maxAllowedUsage) {
        throw new Error('You have reached the maximum number of cover letter generations. Upgrade to continue.');
      }

      // Increment cover letter generation usage
      coverLetterGenerationUsage.usageCount += 1;

      // Update Firestore document
      const db = this.getFirestoreInstance();
      await updateDoc(doc(db, 'userSubscriptions', userId), {
        'featureUsage.coverLetterGeneration': coverLetterGenerationUsage,
        updatedBy: 'webhook'
      });

      return true;
    } catch (error) {
      console.error('Cover letter generation tracking error:', error);
      throw error;
    }
  }

  static async trackJobAnalysisRequests(userId: string): Promise<boolean> {
    try {
      const tierProfile = await this.checkAndResetFeatureUsageIfNeeded(userId);
      const jobAnalysisUsage = tierProfile.featureUsage.jobAnalysis;

      console.log('Current Job Analysis Usage:', JSON.stringify(jobAnalysisUsage, null, 2));

      // Check if user has reached the maximum number of job analysis requests
      if (jobAnalysisUsage.usageCount >= jobAnalysisUsage.maxAllowedUsage) {
        throw new Error('You have reached the maximum number of job analysis requests. Upgrade to continue.');
      }

      // Increment job analysis requests usage
      jobAnalysisUsage.usageCount += 1;

      console.log('Updated Job Analysis Usage:', JSON.stringify(jobAnalysisUsage, null, 2));

      // Update Firestore document
      const db = this.getFirestoreInstance();
      const userSubscriptionRef = doc(db, 'userSubscriptions', userId);

      console.log('Updating document:', userSubscriptionRef.path);
      console.log('Update payload:', JSON.stringify({
        'featureUsage.jobAnalysis': jobAnalysisUsage
      }, null, 2));

      await updateDoc(userSubscriptionRef, {
        'featureUsage.jobAnalysis': jobAnalysisUsage,
        updatedBy: 'webhook'
      });

      return true;
    } catch (error) {
      console.error('Job analysis requests tracking error:', error);
      // Log the full error details
      console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      throw error;
    }
  }

  static async trackJobTrackers(userId: string): Promise<boolean> {
    try {
      const tierProfile = await this.checkAndResetFeatureUsageIfNeeded(userId);
      const jobTrackersUsage = tierProfile.featureUsage.jobTrackers;

      // Check if user has reached the maximum number of job trackers
      if (jobTrackersUsage.usageCount >= jobTrackersUsage.maxAllowedUsage) {
        throw new Error('You have reached the maximum number of job trackers. Upgrade to continue.');
      }

      // Increment job trackers usage
      jobTrackersUsage.usageCount += 1;

      // Update Firestore document
      const db = this.getFirestoreInstance();
      await updateDoc(doc(db, 'userSubscriptions', userId), {
        'featureUsage.jobTrackers': jobTrackersUsage,
        updatedBy: 'webhook'
      });

      return true;
    } catch (error) {
      console.error('Job trackers tracking error:', error);
      throw error;
    }
  }

  static async trackJobApplications(userId: string): Promise<boolean> {
    try {
      const tierProfile = await this.checkAndResetFeatureUsageIfNeeded(userId);
      const jobApplicationsUsage = tierProfile.featureUsage.jobApplications;

      // Check if user has reached the maximum number of job applications
      if (jobApplicationsUsage.usageCount >= jobApplicationsUsage.maxAllowedUsage) {
        throw new Error('You have reached the maximum number of job applications. Upgrade to continue.');
      }

      // Increment job applications usage
      jobApplicationsUsage.usageCount += 1;

      // Update Firestore document
      const db = this.getFirestoreInstance();
      await updateDoc(doc(db, 'userSubscriptions', userId), {
        'featureUsage.jobApplications': jobApplicationsUsage,
        updatedBy: 'webhook'
      });

      return true;
    } catch (error) {
      console.error('Job applications tracking error:', error);
      throw error;
    }
  }

  static async trackInterviewPrep(userId: string): Promise<boolean> {
    try {
      // Ensure subscription exists before tracking usage
      await this.initializeUserSubscriptionIfNeeded(userId);
      
      const tierProfile = await this.checkAndResetFeatureUsageIfNeeded(userId);
      
      // Add null checks for feature usage
      if (!tierProfile.featureUsage) {
        throw new Error('Feature usage not initialized for user');
      }
      
      // Initialize interviewPrep if it doesn't exist
      if (!tierProfile.featureUsage.interviewPrep) {
        const currentTier = tierProfile.currentTier || 'free';
        tierProfile.featureUsage.interviewPrep = {
          usageCount: 0,
          maxAllowedUsage: SUBSCRIPTION_TIERS[currentTier].featureUsageLimits.interviewPrep,
          lastResetTimestamp: Timestamp.now()
        };
      }
      
      const interviewPrepUsage = tierProfile.featureUsage.interviewPrep;

      // Check if user has reached the maximum number of interview prep sessions
      if (interviewPrepUsage.usageCount >= interviewPrepUsage.maxAllowedUsage) {
        throw new Error('You have reached the maximum number of interview prep sessions. Upgrade to continue.');
      }

      // Increment interview prep usage
      interviewPrepUsage.usageCount += 1;

      // Update Firestore document
      const db = this.getFirestoreInstance();
      await updateDoc(doc(db, 'userSubscriptions', userId), {
        'featureUsage.interviewPrep': interviewPrepUsage,
        updatedBy: 'webhook'
      });

      return true;
    } catch (error) {
      console.error('Interview prep tracking error:', error);
      throw error;
    }
  }

  static async checkFeatureAccess(userId: string, feature: FeatureKey): Promise<boolean> {
    // Normalize the feature key
    let normalizedFeature = feature;
    if (feature === 'coverLetter') {
      normalizedFeature = 'coverLetterGeneration';
    } else if (feature === 'interviewPrep') {
      normalizedFeature = 'interviewPrep';
    }

    // Ensure db is defined before using
    if (!this.db) {
      this.initDb();
    }

    try {
      const userSubscriptionRef = doc(this.db, 'userSubscriptions', userId);
      const userSubscriptionDoc = await getDoc(userSubscriptionRef);
      
      if (!userSubscriptionDoc.exists()) {
        console.error(`No subscription document found for user ${userId}`);
        return false;
      }

      const userData = userSubscriptionDoc.data() as UserSubscription;

      // Ensure featureUsage exists
      if (!userData.featureUsage) {
        console.warn(`Initializing feature usage for user ${userId}`);
        return true;
      }

      // Ensure the specific feature exists in featureUsage
      const currentTier = userData.currentTier || 'free';
      
      // Convert the normalized feature to a key that exists in featureUsage
      let featureKey: keyof UserSubscription['featureUsage'];
      if (normalizedFeature === 'coverLetter') {
        featureKey = 'coverLetterGeneration';
      } else if (normalizedFeature === 'interviewPrep') {
        featureKey = 'interviewPrep';
      } else {
        featureKey = normalizedFeature as keyof UserSubscription['featureUsage'];
      }
      
      const featureUsage = userData.featureUsage[featureKey];

      if (!featureUsage) {
        console.warn(`Initializing ${normalizedFeature} usage for user ${userId}`);
        return true;
      }

      const currentUsage = featureUsage.usageCount;
      
      // Get the limit based on the normalized feature
      const limit = FEATURE_LIMITS[currentTier][featureKey];

      // If already at limit, return false immediately
      if (currentUsage >= limit && limit !== Infinity) {
        console.warn(`Feature limit exceeded for ${normalizedFeature} in ${currentTier} tier`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Error checking feature access for ${feature}:`, error);
      return false;
    }
  }

  static async upgradeToProSubscription(userId: string): Promise<void> {
    // Ensure db is defined before using
    if (!this.db) {
      this.initDb();
    }

    try {
      const userSubscriptionRef = doc(this.db, 'userSubscriptions', userId);
      await updateDoc(userSubscriptionRef, {
        'currentTier': 'pro',
        updatedBy: 'webhook'
      });
    } catch (error) {
      console.error('Error upgrading to pro subscription:', error);
    }
  }

  static async updateSubscriptionTierAfterPayment(
    userId: string, 
    razorpaySubscriptionId?: string
  ): Promise<void> {
    // Ensure db is defined before using
    if (!this.db) {
      this.initDb();
    }

    try {
      const userSubscriptionRef = doc(this.db, 'userSubscriptions', userId);
      const timestamp = Timestamp.now();

      // Update subscription document with pro tier and payment details
      await updateDoc(userSubscriptionRef, {
        'currentTier': 'pro',
        'subscriptionStartDate': timestamp,
        'paymentStatus': 'active',
        ...(razorpaySubscriptionId && { 
          'razorpaySubscriptionId': razorpaySubscriptionId 
        }),
        // Reset feature usage limits to unlimited
        'featureUsage': {
          resumeGeneration: { usageCount: 0, maxAllowedUsage: Infinity },
          coverLetterGeneration: { usageCount: 0, maxAllowedUsage: Infinity },
          jobAnalysis: { usageCount: 0, maxAllowedUsage: Infinity },
          jobTrackers: { usageCount: 0, maxAllowedUsage: Infinity },
          jobApplications: { usageCount: 0, maxAllowedUsage: Infinity },
          interviewPrep: { usageCount: 0, maxAllowedUsage: Infinity }
        },
        updatedBy: 'webhook'
      });

      console.log(`User ${userId} upgraded to pro tier`, {
        timestamp: new Date().toISOString(),
        razorpaySubscriptionId
      });
    } catch (error) {
      console.error('Error updating subscription tier:', error);
      throw error;
    }
  }

  static async incrementFeatureUsage(userId: string, feature: keyof UserSubscription['featureUsage']): Promise<void> {
    console.log(`Feature usage increment for ${feature} skipped`);
  }

  /**
   * Decrements the usage count for job trackers when a job is deleted
   * @param userId The user ID
   * @returns Promise<boolean> indicating success
   */
  static async decrementJobTrackerUsage(userId: string): Promise<boolean> {
    try {
      const tierProfile = await this.getUserTierProfile(userId);
      const jobTrackersUsage = tierProfile.featureUsage.jobTrackers;

      // Only decrement if the count is greater than 0
      if (jobTrackersUsage.usageCount > 0) {
        // Decrement job trackers usage
        jobTrackersUsage.usageCount -= 1;

        // Update Firestore document
        const db = this.getFirestoreInstance();
        await updateDoc(doc(db, 'userSubscriptions', userId), {
          'featureUsage.jobTrackers': jobTrackersUsage,
          updatedBy: 'webhook'
        });
      }

      return true;
    } catch (error) {
      console.error('Error decrementing job tracker usage:', error);
      // Don't throw the error to prevent blocking job deletion
      return false;
    }
  }
}
