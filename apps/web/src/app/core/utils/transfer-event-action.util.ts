import type { Action } from '@ngrx/store';
import * as Match from 'effect/Match';
import type { TransferErrorTag } from '../services/transfer.service';
import type { TimedTransferEvent } from './transfer-event-time.util';

/** Store actions a transfer event can become, one method per event kind. */
export interface TransferEventActionSink {
  started(total: number): Action;
  progress(transferred: number): Action;
  complete(): Action;
  verified(elapsed: number): Action;
  failed(error: TransferErrorTag): Action;
}

/**
 * Turns a timed transfer event into the action the sink builds for it.
 * @param sink Store-specific action builders.
 * @returns Mapper from a timed event to an action.
 */
export const transferEventActionFor =
  (sink: TransferEventActionSink) =>
  ({ event, startedAt, at }: TimedTransferEvent): Action =>
    Match.value(event).pipe(
      Match.discriminator('type')('started', ({ total }) => sink.started(total)),
      Match.discriminator('type')('progress', ({ transferred }) => sink.progress(transferred)),
      Match.discriminator('type')('complete', () => sink.complete()),
      Match.discriminator('type')('verified', () => sink.verified(at - startedAt)),
      Match.discriminator('type')('failed', ({ error }) => sink.failed(error)),
      Match.exhaustive,
    );
