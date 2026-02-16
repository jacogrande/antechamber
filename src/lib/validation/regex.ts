import isSafeRegex from 'safe-regex2';

/**
 * Maximum time (ms) allowed for a regex test operation.
 */
const REGEX_TIMEOUT_MS = 100;

/**
 * Check if a regex pattern is safe from catastrophic backtracking (ReDoS).
 * Returns true if the regex is safe to use, false otherwise.
 */
export function isRegexSafe(pattern: string): boolean {
  try {
    return isSafeRegex(pattern);
  } catch {
    return false;
  }
}

/**
 * Test a value against a regex pattern with a timeout to prevent ReDoS.
 * Returns { matched, timedOut } indicating the result.
 */
export function safeRegexTest(
  pattern: string,
  value: string,
): { matched: boolean; timedOut: boolean } {
  const regex = new RegExp(pattern);
  const start = performance.now();

  // For short values, just run the test directly
  if (value.length < 100) {
    return { matched: regex.test(value), timedOut: false };
  }

  // For longer values, check elapsed time periodically by testing in chunks
  // This is a heuristic - true async timeout isn't possible in sync context
  // But we can at least bail early if the pattern is taking too long on prefixes
  const chunkSize = 100;
  for (let i = chunkSize; i <= value.length; i += chunkSize) {
    const chunk = value.slice(0, i);
    regex.test(chunk);

    if (performance.now() - start > REGEX_TIMEOUT_MS) {
      return { matched: false, timedOut: true };
    }
  }

  // Final test on full value
  const matched = regex.test(value);
  const timedOut = performance.now() - start > REGEX_TIMEOUT_MS;

  return { matched, timedOut };
}
