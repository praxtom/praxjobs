import { TierManagementService } from './tierManagement';
import type { Feature } from './subscriptionConfig';
import { authService } from './auth';

export function trackFeatureUsage(feature: Feature) {
  return function (
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      try {
        const user = await authService.getCurrentUser();
        
        if (!user) {
          throw new Error('User not authenticated');
        }

        const usageAllowed = await TierManagementService.trackFeatureUsage(
          user.uid, 
          feature
        );

        if (!usageAllowed) {
          throw new Error(`Feature limit exceeded for ${feature}`);
        }

        return await originalMethod.apply(this, args);
      } catch (error) {
        console.error(`Feature usage tracking error for ${feature}:`, error);
        throw error;
      }
    };

    return descriptor;
  };
}
