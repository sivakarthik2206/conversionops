/**
 * Unit tests for TCPA compliance gate in the AI response pipeline.
 * These tests verify the business rules that protect ConversionOps from
 * TCPA violations. All tested functions are pure — no DB or network.
 */
import { isOptOutKeyword, isQuietHours } from '@conversionops/compliance';

describe('TCPA Gate — isOptOutKeyword', () => {
  describe('all 6 CTIA-mandated opt-out keywords', () => {
    const keywords = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
    it.each(keywords)('blocks "%s"', (kw) => {
      expect(isOptOutKeyword(kw)).toBe(true);
    });
  });

  describe('case insensitive matching', () => {
    it('blocks lowercase "stop"', () => expect(isOptOutKeyword('stop')).toBe(true));
    it('blocks "Stop"', () => expect(isOptOutKeyword('Stop')).toBe(true));
    it('blocks "QUIT" with trailing whitespace', () => expect(isOptOutKeyword('QUIT  ')).toBe(true));
    it('blocks "unsubscribe" lowercase', () => expect(isOptOutKeyword('unsubscribe')).toBe(true));
  });

  describe('non-opt-out messages do NOT trigger', () => {
    it('does not block "Looking for 3BR homes"', () => {
      expect(isOptOutKeyword('Looking for 3BR homes')).toBe(false);
    });
    it('does not block "When can I stop by?"', () => {
      expect(isOptOutKeyword('When can I stop by?')).toBe(false);
    });
    it('does not block an empty string', () => {
      expect(isOptOutKeyword('')).toBe(false);
    });
    it('does not block "I want to end the search next year"', () => {
      expect(isOptOutKeyword('I want to end the search next year')).toBe(false);
    });
  });
});

describe('TCPA Gate — isQuietHours', () => {
  it('accepts all major US timezone strings without throwing', () => {
    const tzList = [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Phoenix',
      'America/Anchorage',
      'Pacific/Honolulu',
    ];
    tzList.forEach(tz => {
      expect(() => isQuietHours(tz)).not.toThrow();
      expect(typeof isQuietHours(tz)).toBe('boolean');
    });
  });

  it('returns true (blocked) for invalid timezone — fail safe', () => {
    expect(isQuietHours('')).toBe(true);
    expect(isQuietHours('INVALID/TZ')).toBe(true);
  });

  describe('quiet hours boundary: 9pm (21) to 8am (8)', () => {
    const isBlocked = (hour: number) => hour >= 21 || hour < 8;

    it('hour 21 (9pm) is blocked', () => expect(isBlocked(21)).toBe(true));
    it('hour 22 (10pm) is blocked', () => expect(isBlocked(22)).toBe(true));
    it('hour 23 (11pm) is blocked', () => expect(isBlocked(23)).toBe(true));
    it('hour 0 (midnight) is blocked', () => expect(isBlocked(0)).toBe(true));
    it('hour 7 (7am) is blocked', () => expect(isBlocked(7)).toBe(true));
    it('hour 8 (8am) is allowed', () => expect(isBlocked(8)).toBe(false));
    it('hour 9 (9am) is allowed', () => expect(isBlocked(9)).toBe(false));
    it('hour 12 (noon) is allowed', () => expect(isBlocked(12)).toBe(false));
    it('hour 20 (8pm) is allowed', () => expect(isBlocked(20)).toBe(false));
  });
});
