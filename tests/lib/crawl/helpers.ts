import type { FetchFn } from '@/lib/crawl/types';

interface StubResponse {
  status: number;
  body: string;
  headers?: Record<string, string>;
}

/**
 * Create a stub fetch that returns predefined responses based on URL.
 */
export function createStubFetch(
  responses: Map<string, StubResponse>,
): FetchFn {
  return (async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const stub = responses.get(url);
    if (!stub) {
      throw new Error(`No stub response for ${url}`);
    }
    return new Response(stub.body, {
      status: stub.status,
      headers: {
        'content-type': 'text/html',
        ...stub.headers,
      },
    });
  }) as FetchFn;
}

interface TrackedCall {
  url: string;
  init?: RequestInit;
  timestamp: number;
}

/**
 * Create a stub fetch that records all calls with timestamps.
 */
export function createTrackingFetch(
  responses: Map<string, StubResponse>,
): { fetch: FetchFn; calls: TrackedCall[] } {
  const calls: TrackedCall[] = [];

  const trackingFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    calls.push({ url, init, timestamp: Date.now() });

    const stub = responses.get(url);
    if (!stub) {
      throw new Error(`No stub response for ${url}`);
    }
    return new Response(stub.body, {
      status: stub.status,
      headers: {
        'content-type': 'text/html',
        ...stub.headers,
      },
    });
  }) as FetchFn;

  return { fetch: trackingFetch, calls };
}
