import { utf8ToBytes } from '@noble/hashes/utils.js';
import { PROTOCOL_VERSION } from '@contract/signal/protocol-version.constant';

export const CPACE_DSI = utf8ToBytes('CPaceRistretto255');
export const CPACE_CI = utf8ToBytes(`defax-${PROTOCOL_VERSION}`);
export const SHA512_BLOCK_SIZE = 128;
