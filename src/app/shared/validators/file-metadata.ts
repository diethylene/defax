import { z } from 'zod';
import type { FileMetadata } from '../interfaces/file-metadata';

export const fileMetadataSchema = z.object({
  name: z.string().min(1).max(1024),
  size: z.number().int().nonnegative(),
  mime: z.string().max(256),
  extension: z.string().max(64),
  lastModified: z.number().int().nonnegative()
});

export function parseFileMetadata(json: string): FileMetadata {
  return fileMetadataSchema.parse(JSON.parse(json));
}
