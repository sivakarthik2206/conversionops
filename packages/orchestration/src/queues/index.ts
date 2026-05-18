import { Queue } from "bullmq";
import { redisConnection } from "./connection";

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

export const queues = {
  leadIntake: new Queue(QUEUE_NAMES.LEAD_INTAKE, { connection: redisConnection }),
  aiResponse: new Queue(QUEUE_NAMES.AI_RESPONSE, { connection: redisConnection }),
  qualification: new Queue(QUEUE_NAMES.QUALIFICATION, { connection: redisConnection }),
  leadRouting: new Queue(QUEUE_NAMES.LEAD_ROUTING, { connection: redisConnection }),
  appointmentBooking: new Queue(QUEUE_NAMES.APPOINTMENT_BOOKING, { connection: redisConnection }),
  crmSync: new Queue(QUEUE_NAMES.CRM_SYNC, { connection: redisConnection }),
  missedCall: new Queue(QUEUE_NAMES.MISSED_CALL, { connection: redisConnection }),
  reactivation: new Queue(QUEUE_NAMES.REACTIVATION, { connection: redisConnection }),
  notification: new Queue(QUEUE_NAMES.NOTIFICATION, { connection: redisConnection }),
  analyticsIngest: new Queue(QUEUE_NAMES.ANALYTICS_INGEST, { connection: redisConnection }),
  auditLog: new Queue(QUEUE_NAMES.AUDIT_LOG, { connection: redisConnection }),
  retention: new Queue(QUEUE_NAMES.RETENTION, { connection: redisConnection }),
} as const;
