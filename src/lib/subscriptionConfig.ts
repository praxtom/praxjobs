export type FeatureUsageLimit = number

export type Feature =
  | 'resumeGeneration'
  | 'coverLetterGeneration'
  | 'jobAnalysis'
  | 'jobTrackers'
  | 'jobApplications'
  | 'interviewPrep'
  | 'linkedinOptimization'

export type FeatureUsageLimits = {
  [key in Feature]: FeatureUsageLimit
}

export type SubscriptionTierConfig = {
  name: string
  maxFeatureUses: number
  price: number
  billingCycle: string
  features: string[]
  featureUsageLimits: FeatureUsageLimits
}

export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    billingCycle: 'monthly',
    features: [
      '5 Resume Generation',
      '5 Cover Letter Generation',
      '5 Job Analysis Requests',
      'Unlimited Job Application Tracking',
      '5 Interview Prep Sessions',
      '5 LinkedIn Optimizations'
    ],
    featureUsageLimits: {
      resumeGeneration: 5,
      coverLetterGeneration: 5,
      jobAnalysis: 5,
      jobTrackers: 5,
      jobApplications: 5,
      interviewPrep: 5,
      linkedinOptimization: 5
    }
  },
  pro: {
    name: 'Pro',
    price: 59900,
    billingCycle: 'monthly',
    features: [
      'Unlimited Resume Generation',
      'Unlimited Cover Letter Generation',
      'Unlimited Job Analysis Requests',
      'Unlimited Job Application Tracking',
      'Unlimited Interview Prep Sessions'
    ],
    featureUsageLimits: {
      resumeGeneration: 1000000, // Effectively unlimited
      coverLetterGeneration: 1000000,
      jobAnalysis: 1000000,
      jobTrackers: 1000000,
      jobApplications: 1000000,
      interviewPrep: 1000000,
      linkedinOptimization: 1000000
    }
  }
} as const

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS
