import {
  receiveCodeEntered,
  receiveHandshakeFailed,
  receiveReset,
  receiveSasComputed
} from '../actions/receive.actions';
import {
  initialReceiveState,
  type ReceiveState,
  receiveReducer
} from './receive.reducer';

const peerIdentity = {
  browser: 'Firefox 121',
  os: 'Windows',
  timeZone: 'Europe/London',
  language: 'en-GB'
};

const file = {
  name: 'report.pdf',
  size: 12345,
  mime: 'application/pdf',
  extension: 'pdf',
  lastModified: 1700000000000
};

describe('receiveReducer', () => {
  it('clears prior sas and error when a code is entered', () => {
    const state: ReceiveState = {
      ...initialReceiveState,
      sas: '123456',
      error: 'stale'
    };

    const next = receiveReducer(
      state,
      receiveCodeEntered({ code: '123456-apple-bird' })
    );

    expect(next.phase).toBe('connecting');
    expect(next.code).toBe('123456-apple-bird');
    expect(next.sas).toBeNull();
    expect(next.error).toBeNull();
  });

  it('records the sas and peer details and moves to confirming', () => {
    const state: ReceiveState = {
      ...initialReceiveState,
      phase: 'connecting',
      code: '123456-apple-bird'
    };

    const next = receiveReducer(
      state,
      receiveSasComputed({ sas: '654321', peerIdentity, file })
    );

    expect(next.phase).toBe('confirming');
    expect(next.sas).toBe('654321');
    expect(next.peerIdentity?.browser).toBe('Firefox 121');
    expect(next.file?.name).toBe('report.pdf');
  });

  it('records the error and moves to failed when the handshake fails', () => {
    const state: ReceiveState = {
      ...initialReceiveState,
      phase: 'connecting'
    };

    const next = receiveReducer(
      state,
      receiveHandshakeFailed({ error: 'invalid peer public key' })
    );

    expect(next.phase).toBe('failed');
    expect(next.error).toBe('invalid peer public key');
  });

  it('resets to the initial state', () => {
    const state: ReceiveState = {
      phase: 'confirming',
      code: '123456-apple-bird',
      sas: '654321',
      peerIdentity: null,
      file: null,
      digest: null,
      error: null,
      transfer: initialReceiveState.transfer
    };

    expect(receiveReducer(state, receiveReset())).toEqual(initialReceiveState);
  });
});
