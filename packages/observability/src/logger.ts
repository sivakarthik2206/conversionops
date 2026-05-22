import pino from "pino";

export const logger = pino({
  level: process.env['LOG_LEVEL'] ?? "info",
  base: { service: "conversionops" },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Redact PII and secrets from logs automatically
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'body.password',
      'body.token',
      'phone',
      'email',
      '*.phone',
      '*.email',
    ],
    censor: '[REDACTED]',
  },
});

/**
 * Creates a child logger bound with correlation context.
 * Use this at the start of each request/job to propagate IDs through all log lines.
 *
 * @example
 * const log = childLogger({ requestId, workspaceId, leadId });
 * log.info('Processing lead intake');
 */
export function childLogger(context: {
  requestId?: string;
  correlationId?: string;
  workspaceId?: string;
  leadId?: string;
  conversationId?: string;
  jobId?: string | number;
  queueName?: string;
}): pino.Logger {
  return logger.child(context);
}
