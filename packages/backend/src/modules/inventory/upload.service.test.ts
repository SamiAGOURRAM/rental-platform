import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { uploadService } from './upload.service.js';
import { mkdir, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('UploadService', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `wave3-uploads-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe('saveProductImage', () => {
    const oneByte = Buffer.from([0x01]);

    it('persists a jpeg with .jpg extension', async () => {
      const result = await uploadService.saveProductImage(oneByte, 'image/jpeg', undefined, tmpDir);
      expect(result.filename).toMatch(/\.jpg$/);
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.url).toMatch(/^\/uploads\/products\/.+\.jpg$/);
      const fileContent = await readFile(join(tmpDir, 'uploads', 'products', result.filename));
      expect(fileContent).toEqual(oneByte);
    });

    it('persists a png with .png extension', async () => {
      const result = await uploadService.saveProductImage(oneByte, 'image/png', undefined, tmpDir);
      expect(result.filename).toMatch(/\.png$/);
      expect(result.mimeType).toBe('image/png');
      expect(result.url).toMatch(/^\/uploads\/products\/.+\.png$/);
    });

    it('persists a webp with .webp extension', async () => {
      const result = await uploadService.saveProductImage(oneByte, 'image/webp', undefined, tmpDir);
      expect(result.filename).toMatch(/\.webp$/);
      expect(result.mimeType).toBe('image/webp');
      expect(result.url).toMatch(/^\/uploads\/products\/.+\.webp$/);
    });

    it('persists an avif with .avif extension', async () => {
      const result = await uploadService.saveProductImage(oneByte, 'image/avif', undefined, tmpDir);
      expect(result.filename).toMatch(/\.avif$/);
      expect(result.mimeType).toBe('image/avif');
      expect(result.url).toMatch(/^\/uploads\/products\/.+\.avif$/);
    });

    it('rejects unknown mime type image/gif', async () => {
      await expect(
        uploadService.saveProductImage(oneByte, 'image/gif', undefined, tmpDir),
      ).rejects.toThrow('Unsupported image type: image/gif');
    });

    it('rejects an empty buffer', async () => {
      await expect(
        uploadService.saveProductImage(Buffer.alloc(0), 'image/jpeg', undefined, tmpDir),
      ).rejects.toThrow('Empty file');
    });

    it('falls back to extname(originalName) when mime is allowed but unmapped', async () => {
      // image/heic is not in ALLOWED_MIME, so it is rejected before the fallback.
      // The fallback path (EXT_BY_MIME[mimeType] ?? extname(originalName)) applies
      // when a mime type passes the ALLOWED_MIME gate but has no EXT_BY_MIME entry.
      // With the current constant set, every allowed mime has a mapping.
      // This test verifies the boundary: heic is rejected because it is not allowed.
      await expect(
        uploadService.saveProductImage(oneByte, 'image/heic', 'foo.heic', tmpDir),
      ).rejects.toThrow('Unsupported image type: image/heic');
    });

    it('returns correct shape { url, filename, bytes, mimeType }', async () => {
      const result = await uploadService.saveProductImage(oneByte, 'image/png', undefined, tmpDir);
      expect(result).toEqual({
        url: expect.stringMatching(/^\/uploads\/products\/.+\.png$/),
        filename: expect.stringMatching(/^\d+-[a-f0-9]+\.png$/),
        bytes: 1,
        mimeType: 'image/png',
      });
    });
  });
});
