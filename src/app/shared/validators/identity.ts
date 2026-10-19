import { z } from 'zod';
import type { Identity } from '../interfaces/identity';

const text = z.string().min(1).max(256);

export const identitySchema = z.object({
  browser: text,
  os: text,
  timeZone: text,
  language: text
});

export function parseIdentity(json: string): Identity {
  return identitySchema.parse(JSON.parse(json));
}
