import { clean, seed } from './seed';

const mode = process.argv[2] ?? 'seed';

if (mode === 'clean') {
  await clean();
  console.log('Database fixtures cleaned.');
} else if (mode === 'seed') {
  await seed();
  console.log('Database fixtures seeded.');
} else {
  console.error(`Unknown mode "${mode}". Use "seed" or "clean".`);
  process.exit(1);
}
