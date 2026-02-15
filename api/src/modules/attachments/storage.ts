import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rm, stat } from 'node:fs/promises';
import { once } from 'node:events';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

/**
 * Attachments live on a local volume under UPLOAD_DIR/YYYY/MM/<uuid>. The
 * original filename is only kept in the database, so nothing a user types
 * ever ends up in a path.
 */
export class LocalStorage {
  constructor(private readonly root: string) {}

  private resolve(key: string): string {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(path.resolve(this.root) + path.sep)) {
      throw new Error(`Storage key escapes the upload directory: ${key}`);
    }
    return full;
  }

  async save(source: Readable, now: Date): Promise<{ key: string; size: number }> {
    const dir = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const key = `${dir}/${randomUUID()}`;
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    const out = createWriteStream(full, { flags: 'wx' });
    try {
      await pipeline(source, out);
    } catch (err) {
      // Wait for the file handle to close, or the file can reappear after rm.
      if (!out.closed) await once(out, 'close');
      await rm(full, { force: true });
      throw err;
    }
    const { size } = await stat(full);
    return { key, size };
  }

  open(key: string): Readable {
    return createReadStream(this.resolve(key));
  }

  async remove(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }
}
