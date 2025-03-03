export type PaymentStatus = 'success' | 'failure' | 'pending';

export interface PaymentResponse {
  status: PaymentStatus;
  orderId: string;
  amount: number;
  tier: 'free' | 'pro';
}
