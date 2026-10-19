import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideStore, Store } from '@ngrx/store';
import { filter, firstValueFrom, take } from 'rxjs';
import { SignalTransport } from '../../shared/interfaces/signal-transport';
import { BroadcastChannelTransport } from '../../shared/services/broadcast-channel-transport';
import { HandshakeService } from '../../shared/services/handshake.service';
import { receiveCodeEntered } from '../actions/receive.actions';
import { receiveReducer } from '../reducers/receive.reducer';
import {
  selectReceivePhase,
  selectReceiveSas
} from '../selectors/receive.selectors';
import { ReceiveEffects } from './receive.effects';

function openSender(password: string): {
  code: string;
  senderSas: Promise<string>;
  sender: HandshakeService;
} {
  const transport = new BroadcastChannelTransport();
  const sender = new HandshakeService();
  const { roomId, sid } = transport.createRoom();
  const senderSas = firstValueFrom(
    sender.runAsInitiator(transport, { roomId, sid, password })
  ).then((result) => result.sas);
  return { code: `${roomId}-${password}`, senderSas, sender };
}

describe('ReceiveEffects', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideStore({ receive: receiveReducer }),
        provideEffects(ReceiveEffects),
        { provide: SignalTransport, useClass: BroadcastChannelTransport },
        {
          provide: Router,
          useValue: { url: '', navigateByUrl: () => Promise.resolve(true) }
        }
      ]
    });
  });

  it('derives the sender sas from an entered code', async () => {
    const { code, senderSas, sender } = openSender('apple-bird');
    const store = TestBed.inject(Store);

    const guestSas = firstValueFrom(
      store.select(selectReceiveSas).pipe(
        filter((sas): sas is string => sas !== null),
        take(1)
      )
    );

    store.dispatch(receiveCodeEntered({ code }));

    expect(await guestSas).toBe(await senderSas);

    sender.destroy();
  });

  it('dispatches handshake failed for a code without a room id', async () => {
    const store = TestBed.inject(Store);

    const phase = firstValueFrom(
      store.select(selectReceivePhase).pipe(
        filter((p): p is 'failed' => p === 'failed'),
        take(1)
      )
    );

    store.dispatch(receiveCodeEntered({ code: 'invalid' }));

    await expect(phase).resolves.toBe('failed');
  });
});
