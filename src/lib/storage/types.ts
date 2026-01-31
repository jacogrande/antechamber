export interface StorageClient {
  put(key: string, data: Buffer | Uint8Array, contentType?: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getSignedUrl(key: string, expiresInSec: number): Promise<string>;
}
