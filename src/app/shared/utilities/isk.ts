import { concatBytes } from '@noble/curves/utils.js';
import { sha512 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { CPACE_DSI } from '../constants/cpace';
import { lvCat } from './lv-cat';

const EMPTY = new Uint8Array(0);

export function deriveIsk(
  sid: Uint8Array,
  k: Uint8Array,
  yInitiator: Uint8Array,
  yResponder: Uint8Array,
  options: {
    adInitiator?: Uint8Array;
    adResponder?: Uint8Array;
  } = {}
): Uint8Array {
  const { adInitiator = EMPTY, adResponder = EMPTY } = options;
  return sha512(
    concatBytes(
      lvCat(concatBytes(CPACE_DSI, utf8ToBytes('_ISK')), sid, k),
      lvCat(yInitiator, adInitiator, yResponder, adResponder)
    )
  );
}
