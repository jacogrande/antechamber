export interface StorageClient {
  put(key: string, data: Buffer | Uint8Array, contentType?: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

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
}
