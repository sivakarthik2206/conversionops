export interface PlatformHealthSummary {
  status: "healthy" | "degraded" | "down";
  ai: { p50Ms: number; p95Ms: number };
  twilio: { p95Ms: number };
  queue: { lagCount: number };
  crm: { successRatePercent: number };
  bookings: { failedLast1h: number };
  generatedAt: string;
}
