import { concatBytes } from '@noble/curves/utils.js';
import { sha512 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { CPACE_DSI } from '../constants/cpace';
import { lvCat } from './lv-cat';

const EMPTY = new Uint8Array(0);

export function deriveIsk(
  sid: Uint8Array,
  k: Uint8Array,
  ya: Uint8Array,
  yb: Uint8Array,
  options: {
    adA?: Uint8Array;
    adB?: Uint8Array;
  } = {}
): Uint8Array {
  const { adA = EMPTY, adB = EMPTY } = options;
  return sha512(
    concatBytes(
      lvCat(concatBytes(CPACE_DSI, utf8ToBytes('_ISK')), sid, k),
      lvCat(ya, adA, yb, adB)
    )
  );
}
