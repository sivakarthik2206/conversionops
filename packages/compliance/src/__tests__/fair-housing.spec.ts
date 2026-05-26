import { checkFairHousing } from '../fair-housing';

describe('Fair Housing Act Compliance — checkFairHousing', () => {
  describe('clean content — should pass', () => {
    it('passes neutral real estate description', () => {
      const result = checkFairHousing(
        'This 3-bedroom home features a modern kitchen, hardwood floors, and a large backyard.'
      );
      expect(result.passed).toBe(true);
      expect(result.flaggedPatterns).toHaveLength(0);
    });

    it('passes property listing with price and features', () => {
      const result = checkFairHousing(
        'Listed at $450,000. 2,100 sq ft with an open floor plan and updated bathrooms.'
      );
      expect(result.passed).toBe(true);
      expect(result.flaggedPatterns).toHaveLength(0);
    });

    it('passes AI qualification question about budget', () => {
      const result = checkFairHousing(
        "Hi! I'm here to help you find your dream home. What's your budget range?"
      );
      expect(result.passed).toBe(true);
      expect(result.flaggedPatterns).toHaveLength(0);
    });

    it('passes mention of proximity to amenities by type (not religious)', () => {
      const result = checkFairHousing(
        'The property is close to parks, shopping centers, and public transit.'
      );
      expect(result.passed).toBe(true);
      expect(result.flaggedPatterns).toHaveLength(0);
    });

    it('passes mention of nearby schools by name (not school district steering)', () => {
      const result = checkFairHousing(
        'Barton Hills Elementary is 0.3 miles from the property.'
      );
      expect(result.passed).toBe(true);
      expect(result.flaggedPatterns).toHaveLength(0);
    });
  });

  describe('BLOCK violations — racial/ethnic steering', () => {
    it('blocks reference to racial composition of a neighborhood', () => {
      const result = checkFairHousing(
        'This is a predominantly white neighborhood with great property values.'
      );
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('block');
    });

    it('blocks reference to ethnic area steering', () => {
      const result = checkFairHousing(
        "You'll find a Hispanic community area nearby."
      );
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('block');
    });

    it('blocks crime rate references', () => {
      const result = checkFairHousing(
        'The crime rate in this area is very low.'
      );
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('block');
    });

    it('blocks school district references in AI responses', () => {
      const result = checkFairHousing(
        'This home is in a top school district, which is great for families.'
      );
      expect(result.passed).toBe(false);
    });

    it('blocks "good neighborhood" language', () => {
      const result = checkFairHousing(
        "You'll love the good neighborhood — it's very well-maintained."
      );
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('block');
    });

    it('blocks family-friendly marketing language', () => {
      const result = checkFairHousing(
        'This home is perfect for families with young children.'
      );
      expect(result.passed).toBe(false);
    });

    it('blocks "up-and-coming area" language (displacement indicator)', () => {
      const result = checkFairHousing(
        "This is an up-and-coming neighborhood with lots of new development."
      );
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('block');
    });

    it('blocks "best neighborhood" comparisons', () => {
      const result = checkFairHousing(
        "This is in the best neighborhood on the east side."
      );
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('block');
    });

    it('blocks "you\'ll love the neighbors" steering', () => {
      const result = checkFairHousing(
        "You'll love the neighbors in this community."
      );
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('block');
    });

    it('blocks "no minorities" type exclusionary language', () => {
      const result = checkFairHousing(
        "There are not many immigrants in this area."
      );
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('block');
    });
  });

  describe('return structure is always correct', () => {
    it('always returns passed, flaggedPatterns, and severity', () => {
      const clean = checkFairHousing('A nice home with a garage.');
      expect(clean).toHaveProperty('passed');
      expect(clean).toHaveProperty('flaggedPatterns');
      expect(clean).toHaveProperty('severity');
      expect(Array.isArray(clean.flaggedPatterns)).toBe(true);
    });

    it('severity is "warn" when content passes', () => {
      const result = checkFairHousing('Great property with stunning views.');
      expect(result.passed).toBe(true);
      expect(result.severity).toBe('warn');
    });

    it('severity is "block" for hard violations', () => {
      const result = checkFairHousing('Low crime rate neighborhood.');
      expect(result.passed).toBe(false);
      expect(result.severity).toBe('block');
    });

    it('flaggedPatterns contains the pattern string for violations', () => {
      const result = checkFairHousing('The crime rate here is very low.');
      expect(result.passed).toBe(false);
      expect(result.flaggedPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('handles empty string without throwing', () => {
      expect(() => checkFairHousing('')).not.toThrow();
      expect(checkFairHousing('').passed).toBe(true);
    });

    it('handles very long content without throwing', () => {
      const longContent = 'This is a wonderful home. '.repeat(1000);
      expect(() => checkFairHousing(longContent)).not.toThrow();
    });

    it('does not produce false positives on "great" used in non-steering context', () => {
      const result = checkFairHousing(
        'This is a great investment property with great returns.'
      );
      expect(result.passed).toBe(true);
    });
  });
});
