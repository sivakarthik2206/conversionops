import { Queue } from "bullmq";
import { redisConnection } from "./connection";
export { redisConnection } from "./connection";

export const QUEUE_NAMES = {
  LEAD_INTAKE: "lead-intake",
  AI_RESPONSE: "ai-response",
  QUALIFICATION: "qualification",
  LEAD_ROUTING: "lead-routing",
  APPOINTMENT_BOOKING: "appointment-booking",
  CRM_SYNC: "crm-sync",
  MISSED_CALL: "missed-call",
  REACTIVATION: "reactivation",
  NOTIFICATION: "notification",
  ANALYTICS_INGEST: "analytics-ingest",
  AUDIT_LOG: "audit-log",
  RETENTION: "retention",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// Default retry: 3 attempts, exponential backoff starting at 2s (2s, 4s, 8s)
const withRetry = (attempts: number, delayMs = 2000) => ({
  defaultJobOptions: {
    attempts,
    backoff: { type: 'exponential' as const, delay: delayMs },
    removeOnFail: 100,
  },
});

// Fire-and-forget queues: analytics and retention do not need retries
const noRetry = {
  defaultJobOptions: { attempts: 1, removeOnFail: 50 },
};

export const queues = {
  leadIntake:        new Queue(QUEUE_NAMES.LEAD_INTAKE,        { connection: redisConnection, ...withRetry(3) }),
  aiResponse:        new Queue(QUEUE_NAMES.AI_RESPONSE,        { connection: redisConnection, ...withRetry(3) }),
  qualification:     new Queue(QUEUE_NAMES.QUALIFICATION,      { connection: redisConnection, ...withRetry(3) }),
  leadRouting:       new Queue(QUEUE_NAMES.LEAD_ROUTING,       { connection: redisConnection, ...withRetry(3) }),
  appointmentBooking:new Queue(QUEUE_NAMES.APPOINTMENT_BOOKING,{ connection: redisConnection, ...withRetry(3) }),
  crmSync:           new Queue(QUEUE_NAMES.CRM_SYNC,           { connection: redisConnection, ...withRetry(3, 5000) }),
  missedCall:        new Queue(QUEUE_NAMES.MISSED_CALL,        { connection: redisConnection, ...withRetry(2, 1000) }),
  reactivation:      new Queue(QUEUE_NAMES.REACTIVATION,       { connection: redisConnection, ...withRetry(2) }),
  notification:      new Queue(QUEUE_NAMES.NOTIFICATION,       { connection: redisConnection, ...withRetry(3) }),
  auditLog:          new Queue(QUEUE_NAMES.AUDIT_LOG,          { connection: redisConnection, ...withRetry(5, 1000) }),
  analyticsIngest:   new Queue(QUEUE_NAMES.ANALYTICS_INGEST,   { connection: redisConnection, ...noRetry }),
  retention:         new Queue(QUEUE_NAMES.RETENTION,          { connection: redisConnection, ...noRetry }),
} as const;
