export type { StorageClient } from './storage/types';
export { VercelBlobStorageClient } from './storage/vercel-blob';

import type { StorageClient } from './storage/types';

export class StubStorageClient implements StorageClient {
  private store = new Map<string, Buffer>();

  async put(key: string, data: Buffer | Uint8Array): Promise<void> {
    this.store.set(key, Buffer.from(data));
  }

  async get(key: string): Promise<Buffer | null> {
    return this.store.get(key) ?? null;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async getSignedUrl(key: string, expiresInSec: number): Promise<string> {
    const expiresAt = new Date(Date.now() + expiresInSec * 1000);
    return `https://stub-storage.local/${key}?expires=${expiresAt.toISOString()}`;
  }
}
