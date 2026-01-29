import { put, del, head, type PutBlobResult } from '@vercel/blob';
import type { StorageClient } from '../storage';

/**
 * StorageClient implementation backed by Vercel Blob.
 */
export class VercelBlobStorageClient implements StorageClient {
  constructor(private token: string) {}

  async put(key: string, data: Buffer | Uint8Array, contentType?: string): Promise<void> {
    // Convert Uint8Array to Buffer for Vercel Blob compatibility
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    await put(key, buffer, {
      access: 'public',
      token: this.token,
      contentType: contentType ?? 'application/octet-stream',
      addRandomSuffix: false,
    });
  }

  async get(key: string): Promise<Buffer | null> {
    const meta = await this.getMeta(key);
    if (!meta) return null;

    const response = await fetch(meta.url);
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async delete(key: string): Promise<void> {
    const meta = await this.getMeta(key);
    if (meta) {
      await del(meta.url, { token: this.token });
    }
  }

  async exists(key: string): Promise<boolean> {
    const meta = await this.getMeta(key);
    return meta !== null;
  }

  async getSignedUrl(key: string, _expiresInSec: number): Promise<string> {
    // Vercel Blob uses public URLs by default
    // For private access, we'd need to implement token-based URLs
    const meta = await this.getMeta(key);
    if (!meta) {
      throw new Error(`Blob not found: ${key}`);
    }
    return meta.url;
  }

  private async getMeta(key: string): Promise<PutBlobResult | null> {
    try {
      const meta = await head(key, { token: this.token });
      return meta;
    } catch {
      return null;
    }
  }
}
