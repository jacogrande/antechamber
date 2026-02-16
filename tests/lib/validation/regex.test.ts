import { describe, test, expect } from 'bun:test';
import { isRegexSafe, safeRegexTest } from '../../../src/lib/validation/regex';

describe('isRegexSafe', () => {
  test('rejects classic ReDoS pattern (a+)+', () => {
    expect(isRegexSafe('(a+)+b')).toBe(false);
  });

  test('rejects nested quantifiers', () => {
    expect(isRegexSafe('([a-zA-Z]+)*')).toBe(false);
  });

  test('accepts simple patterns', () => {
    expect(isRegexSafe('^[a-z]+$')).toBe(true);
    expect(isRegexSafe('\\d{3}-\\d{4}')).toBe(true);
    expect(isRegexSafe('^https?://')).toBe(true);
  });

  test('accepts email-like pattern', () => {
    expect(isRegexSafe('^[^@]+@[^@]+\\.[^@]+$')).toBe(true);
  });

  test('returns false for invalid regex', () => {
    expect(isRegexSafe('[invalid(')).toBe(false);
  });
});

describe('safeRegexTest', () => {
  test('matches valid patterns', () => {
    const result = safeRegexTest('^hello$', 'hello');
    expect(result.matched).toBe(true);
    expect(result.timedOut).toBe(false);
  });

  test('returns false for non-matching patterns', () => {
    const result = safeRegexTest('^hello$', 'world');
    expect(result.matched).toBe(false);
    expect(result.timedOut).toBe(false);
  });

  test('handles short strings efficiently', () => {
    const result = safeRegexTest('\\d+', '12345');
    expect(result.matched).toBe(true);
    expect(result.timedOut).toBe(false);
  });
});
