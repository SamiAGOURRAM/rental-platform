import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { randomBytes } from 'node:crypto';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
};

export interface UploadedImage {
  url: string;
  filename: string;
  bytes: number;
  mimeType: string;
}

export class UploadService {
  /** Persist a buffer to disk under `uploads/products/` and return its public URL. */
  async saveProductImage(
    file: Buffer,
    mimeType: string,
    originalName?: string,
  ): Promise<UploadedImage> {
    if (!ALLOWED_MIME.has(mimeType)) {
      throw new Error(`Unsupported image type: ${mimeType}`);
    }
    if (file.length === 0) {
      throw new Error('Empty file');
    }

    const dir = resolve(process.cwd(), 'uploads', 'products');
    await mkdir(dir, { recursive: true });

    const ext =
      EXT_BY_MIME[mimeType] ?? (originalName ? extname(originalName).toLowerCase() : '.bin');
    const filename = `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`;
    const filepath = resolve(dir, filename);
    await writeFile(filepath, file);

    return {
      url: `/uploads/products/${filename}`,
      filename,
      bytes: file.length,
      mimeType,
    };
  }
}

export const uploadService = new UploadService();
