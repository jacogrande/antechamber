import { beforeAll, afterEach } from 'bun:test';
import { seed, clean } from '../src/db/seed';

/**
 * Call this in test files that need database state.
 * Seeds before all tests, cleans after each test.
 */
export function useTestDb() {
  beforeAll(async () => {
    await seed();
  });

  afterEach(async () => {
    await clean();
    await seed();
  });
}
