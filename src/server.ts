// Force IPv4 DNS resolution to work around Supabase IPv6 + Vercel connectivity issues
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import { serve } from '@hono/node-server';
import app from './index';

const port = Number(process.env.PORT) || 3000;

console.log(`Server starting on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`Server running at http://localhost:${port}`);
