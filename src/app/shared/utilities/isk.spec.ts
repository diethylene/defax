import { hexToBytes } from '@noble/curves/utils.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import { deriveIsk } from './isk';

describe('deriveIsk', () => {
  it('matches the draft ristretto255 test vector', () => {
    const sid = hexToBytes('7e4b4791d6a8ef019b936c79fb7f2c57');
    const k = hexToBytes(
      'fa1d0318864e2cacb26875f1b791c9ae83204fe8359addb53e95a2e98893853f'
    );
    const ya = hexToBytes(
      '383a85dd236978f17f8c8545b50dabc52a39fcdab2cf8bc531ce040ff77ca82d'
    );
    const yb = hexToBytes(
      'a6206309c0e8e5f579295e35997ac4300ab3fecec3c17f7b604f3e698fa1383c'
    );
    expect(
      deriveIsk(sid, k, ya, yb, {
        adA: utf8ToBytes('ADa'),
        adB: utf8ToBytes('ADb')
      })
    ).toEqual(
      hexToBytes(
        'e91ccb2c0f5e0d0993a33956e3be59754f3f2b07db57631f5394452ea2e7b4354674eb1f5686c078462bf83bec72e8743df440108e638f3526d9b90e85be096f'
      )
    );
  });
});
