import { z } from 'zod';
import { decodeSid } from '../utils/sid';

export const sidSchema = z.string().refine(
  (value) => {
    try {
      decodeSid(value);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'sid must be 16 bytes as base64url' }
);
