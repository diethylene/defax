import { z } from 'zod';
import type { DropzoneValidator } from './dropzone.model';
import { normalizeAccept } from './dropzone-accept';

const acceptSchema = z
  .union([z.string(), z.array(z.string())])
  .default([])
  .transform((value) => normalizeAccept(value));

export const dropzoneConfigSchema = z.object({
  accept: acceptSchema,
  multiple: z.boolean().default(false),
  maxFiles: z.number().int().nonnegative().nullable().default(null),
  maxFileSize: z.number().nonnegative().nullable().default(null),
  minFileSize: z.number().nonnegative().default(0),
  maxTotalSize: z.number().nonnegative().nullable().default(null),
  validator: z.custom<DropzoneValidator>().nullable().default(null),
  rejectionMode: z.enum(['all', 'partial']).default('partial'),
  noClick: z.boolean().default(false),
  noKeyboard: z.boolean().default(false),
  disabled: z.boolean().default(false)
});

export type DropzoneConfigInput = z.input<typeof dropzoneConfigSchema>;
export type DropzoneConfig = z.output<typeof dropzoneConfigSchema>;

const defaultConfig: DropzoneConfig = dropzoneConfigSchema.parse({});

export function parseDropzoneConfig(
  input: DropzoneConfigInput
): DropzoneConfig {
  const result = dropzoneConfigSchema.safeParse(input);
  const config = result.success ? result.data : defaultConfig;
  if (!result.success) {
    console.error('[app-dropzone] invalid config:', result.error.issues);
  }
  if (!config.multiple) {
    return { ...config, maxFiles: 1 };
  }
  return config;
}
