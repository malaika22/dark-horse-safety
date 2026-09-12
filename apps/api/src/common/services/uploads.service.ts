import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

export type SavedUpload = {
  storagePath: string;
  url: string;
  sizeBytes: number;
  fileName: string;
};

/**
 * Local disk file storage under UPLOADS_DIR (or ./uploads).
 * Public URLs are served at /uploads/* via Nest static assets.
 */
@Injectable()
export class UploadsService {
  root() {
    return (
      process.env.UPLOADS_DIR?.trim() || path.join(process.cwd(), 'uploads')
    );
  }

  absolute(storagePath: string) {
    const normalized = storagePath.replace(/\\/g, '/').replace(/^\/+/, '');
    const absolute = path.resolve(this.root(), normalized);
    const rootResolved = path.resolve(this.root());
    if (
      absolute !== rootResolved &&
      !absolute.startsWith(rootResolved + path.sep)
    ) {
      throw new BadRequestException({
        code: 'INVALID_PATH',
        message: 'Invalid storage path',
      });
    }
    return absolute;
  }

  sanitizeFileName(fileName: string) {
    return (
      fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'file'
    );
  }

  /** Allow only safe relative folder segments (no ..). */
  sanitizeFolder(folder: string) {
    const cleaned = folder
      .replace(/\\/g, '/')
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => s !== '.' && s !== '..')
      .map((s) => s.replace(/[^a-zA-Z0-9._-]/g, '_'))
      .join('/');
    if (!cleaned) {
      throw new BadRequestException({
        code: 'INVALID_FOLDER',
        message: 'Enter an upload folder.',
      });
    }
    return cleaned;
  }

  decodeBase64(contentBase64: string): Buffer {
    const raw = contentBase64.includes(',')
      ? contentBase64.split(',').pop()!
      : contentBase64;
    let buffer: Buffer;
    try {
      buffer = Buffer.from(raw, 'base64');
    } catch {
      throw new BadRequestException({
        code: 'INVALID_BASE64',
        message: 'contentBase64 is not valid base64',
      });
    }
    if (!buffer.length) {
      throw new BadRequestException({
        code: 'EMPTY_FILE',
        message: 'File content is empty',
      });
    }
    return buffer;
  }

  async saveBase64(opts: {
    folder: string;
    fileName: string;
    contentBase64: string;
  }): Promise<SavedUpload> {
    const folder = this.sanitizeFolder(opts.folder);
    const buffer = this.decodeBase64(opts.contentBase64);
    const safeName = this.sanitizeFileName(opts.fileName);
    const storagePath = path
      .join(folder, `${randomUUID()}-${safeName}`)
      .replace(/\\/g, '/');
    const absolute = this.absolute(storagePath);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, buffer);
    return {
      storagePath,
      url: `/uploads/${storagePath}`,
      sizeBytes: buffer.length,
      fileName: opts.fileName,
    };
  }

  async deleteIfExists(storagePath: string) {
    try {
      await fs.unlink(this.absolute(storagePath));
    } catch {
      // file may already be missing
    }
  }
}
