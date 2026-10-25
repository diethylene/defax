import { z } from 'zod';
import { decodeBase64Url } from '../utilities/base64url';

export function base64UrlBytesSchema(
  length: number,
  label: string
): z.ZodString {
  return z.string().refine(
    (value) => {
      try {
        return decodeBase64Url(value).length === length;
      } catch {
        return false;
      }
    },
    { message: `${label} must be ${length} bytes as base64url` }
  );
}
