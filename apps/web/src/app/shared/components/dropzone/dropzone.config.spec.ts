import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DropzoneValidator } from './dropzone.model';
import { parseDropzoneConfig } from './dropzone.config';

describe('parseDropzoneConfig', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('success', () => {
    it('normalizes the accept list', () => {
      const config = parseDropzoneConfig({ accept: ' image/* , .PNG ' });

      expect(config.accept).toEqual(['image/*', '.png']);
    });

    it('keeps the validator function', () => {
      const validator: DropzoneValidator = () => 'custom';

      expect(parseDropzoneConfig({ validator }).validator).toBe(validator);
    });

    it('keeps an explicit file limit in multiple mode', () => {
      const config = parseDropzoneConfig({ multiple: true, maxFiles: 4 });

      expect(config.maxFiles).toBe(4);
    });
  });

  describe('invariants', () => {
    it('applies the documented defaults', () => {
      const config = parseDropzoneConfig({ multiple: true });

      expect(config).toMatchObject({
        accept: [],
        multiple: true,
        maxFiles: null,
        maxFileSize: null,
        minFileSize: 0,
        maxTotalSize: null,
        validator: null,
        rejectionMode: 'partial',
        noClick: false,
        noKeyboard: false,
        disabled: false
      });
    });

    it('limits a single-file dropzone to one file', () => {
      expect(parseDropzoneConfig({ maxFiles: 5 }).maxFiles).toBe(1);
    });

    it('falls back to the defaults and logs when the input is invalid', () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      const config = parseDropzoneConfig({ maxFiles: -1 });

      expect(config.maxFiles).toBe(1);
      expect(consoleError).toHaveBeenCalledWith(
        '[app-dropzone] invalid config:',
        expect.any(String)
      );
    });
  });
});
