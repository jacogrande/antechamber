// Force IPv4 DNS resolution to work around Supabase IPv6 + Vercel connectivity issues
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import { handle } from '@hono/node-server/vercel';
import app from '../src/index';

export default handle(app);
