import { handle } from 'hono/vercel';
import app from '../src/index';

// Export the Hono app as a Vercel serverless function
// Using Bun runtime (experimental)
export default handle(app);
