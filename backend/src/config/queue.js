import Queue from 'bull';
import { env } from './env.js';

const REDIS_URL = env.REDIS_URL || 'redis://localhost:6379';

export const paymentQueue = new Queue('payments', REDIS_URL);
export const webhookQueue = new Queue('webhooks', REDIS_URL);
export const refundQueue = new Queue('refunds', REDIS_URL);

// Configure job options
const jobOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 2000
  },
  removeOnComplete: true
};

export async function enqueuePaymentJob(paymentId) {
  return paymentQueue.add({ paymentId }, jobOptions);
}

export async function enqueueWebhookJob(merchantId, event, payload) {
  return webhookQueue.add({ merchantId, event, payload }, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: false
  });
}

export async function enqueueRefundJob(refundId) {
  return refundQueue.add({ refundId }, jobOptions);
}

export async function getQueueStatus() {
  const [pendingPayments, processingPayments, completedPayments, failedPayments] = await Promise.all([
    paymentQueue.getJobCounts().then(c => c.waiting + c.delayed),
    paymentQueue.getJobCounts().then(c => c.active),
    paymentQueue.getJobCounts().then(c => c.completed),
    paymentQueue.getJobCounts().then(c => c.failed)
  ]);

  return {
    pending: pendingPayments,
    processing: processingPayments,
    completed: completedPayments,
    failed: failedPayments,
    worker_status: 'running'
  };
}

export default {
  paymentQueue,
  webhookQueue,
  refundQueue,
  enqueuePaymentJob,
  enqueueWebhookJob,
  enqueueRefundJob,
  getQueueStatus
};
