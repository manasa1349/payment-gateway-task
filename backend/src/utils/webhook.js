import crypto from 'crypto';

export function generateWebhookSignature(payload, webhookSecret) {
  const payloadString = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payloadString)
    .digest('hex');
  return signature;
}

export function getRetryIntervals() {
  const useTestIntervals = process.env.WEBHOOK_RETRY_INTERVALS_TEST === 'true';
  
  if (useTestIntervals) {
    // Attempt 1: immediate, Attempt 2: 5s, Attempt 3: 10s, Attempt 4: 15s, Attempt 5: 20s
    return [0, 5, 10, 15, 20]; // seconds
  }
  
  // Attempt 1: immediate, Attempt 2: 1min, Attempt 3: 5min, Attempt 4: 30min, Attempt 5: 2hr
  return [0, 60, 300, 1800, 7200]; // seconds
}

/**
 * Given attempts already made (0..5), return when the next retry should happen.
 * - If attemptsMade is 1 and last attempt failed, next retry uses Attempt 2 delay.
 */
export function getNextRetryTime(attemptsMade) {
  const intervals = getRetryIntervals();
  if (attemptsMade >= 5) return null;
  
  const nextAttemptNumber = attemptsMade + 1; // 1-based attempt number of next try
  const delaySeconds = intervals[nextAttemptNumber - 1] ?? null;
  if (delaySeconds === null) return null;
  const nextRetryAt = new Date();
  nextRetryAt.setSeconds(nextRetryAt.getSeconds() + delaySeconds);
  return nextRetryAt;
}

export default {
  generateWebhookSignature,
  getRetryIntervals,
  getNextRetryTime
};
