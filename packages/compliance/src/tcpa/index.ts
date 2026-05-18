/ TCPA invariants — called before every outbound SMS
// These are hard-coded rules. Never bypass. Never feature-flag.

export const TCPA_OPT_OUT_KEYWORDS = [
  "STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT",
] as const;

export const QUIET_HOURS_START = 21; // 9pm
export const QUIET_HOURS_END   =  8; // 8am

export function isOptOutKeyword(message: string): boolean {
  const normalised = message.trim().toUpperCase();
  return (TCPA_OPT_OUT_KEYWORDS as readonly string[]).includes(normalised);
}

export function isQuietHours(timezone: string): boolean {
  try {
    const now = new Date();
    const hour = parseInt(
      now.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: timezone }),
      10,
    );
    return hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END;
  } catch {
    // Unknown timezone — default to safe (blocked)
    return true;
  }
}
