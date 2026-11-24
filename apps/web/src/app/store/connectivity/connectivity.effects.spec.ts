import type { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import type { Action } from '@ngrx/store';
import { ConnectivityProbeService } from '@web/core/services/connectivity-probe.service';
import { firstValueFrom, type Observable, of, take, toArray } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { ReceiveActions } from '../receive/receive.actions';
import { SendActions } from '../send/send.actions';
import { ConnectivityActions } from './connectivity.actions';
import { liveRoute$, recheck$, startCheck$ } from './connectivity.effects';
import type { Readiness } from './connectivity-status.type';

/**
 * Runs a functional effect once and collects every action it emits.
 * @param effect Effect factory to run in the injection context.
 * @param providers Providers the effect needs.
 * @returns Every action emitted before the effect completes.
 */
const run = (effect: () => Observable<Action>, providers: Provider[]): Promise<Action[]> => {
  TestBed.configureTestingModule({ providers });
  return firstValueFrom(TestBed.runInInjectionContext(effect).pipe(toArray()));
};

/**
 * Fakes the action stream with the given actions.
 * @param actions Actions the fake stream emits.
 * @returns Provider for the fake Actions.
 */
const actionsFor = (...actions: Action[]): Provider => ({
  provide: Actions,
  useValue: new Actions(of(...actions)),
});

/**
 * Fakes the probe with a fixed readiness.
 * @param readiness Readiness the fake probe reports.
 * @returns Provider for the fake probe.
 */
const probeFor = (readiness: Readiness): Provider => ({
  provide: ConnectivityProbeService,
  useValue: { check: () => of(readiness) },
});

describe('startCheck$', () => {
  describe('success', () => {
    it('dispatches the readiness the probe reports', async () => {
      const emitted = await run(startCheck$, [
        actionsFor(ConnectivityActions.check()),
        probeFor({ _tag: 'DirectPossible' }),
      ]);

      expect(emitted).toEqual([
        ConnectivityActions.checkSucceeded({ readiness: { _tag: 'DirectPossible' } }),
      ]);
    });
  });
});

describe('recheck$', () => {
  describe('success', () => {
    it('dispatches a check when the browser comes back online', async () => {
      TestBed.configureTestingModule({});
      const emitted = firstValueFrom(TestBed.runInInjectionContext(recheck$).pipe(take(1)));

      window.dispatchEvent(new Event('online'));

      await expect(emitted).resolves.toEqual(ConnectivityActions.check());
    });

    it('dispatches a check when a visible tab is shown', async () => {
      TestBed.configureTestingModule({});
      const emitted = firstValueFrom(TestBed.runInInjectionContext(recheck$).pipe(take(1)));

      document.dispatchEvent(new Event('visibilitychange'));

      await expect(emitted).resolves.toEqual(ConnectivityActions.check());
    });
  });
});

describe('liveRoute$', () => {
  describe('success', () => {
    it('mirrors a send route to route changed', async () => {
      const emitted = await run(liveRoute$, [
        actionsFor(SendActions.transferRouted({ route: 'relay' })),
      ]);

      expect(emitted).toEqual([ConnectivityActions.routeChanged({ route: 'relay' })]);
    });

    it('mirrors a receive route to route changed', async () => {
      const emitted = await run(liveRoute$, [
        actionsFor(ReceiveActions.transferRouted({ route: 'direct' })),
      ]);

      expect(emitted).toEqual([ConnectivityActions.routeChanged({ route: 'direct' })]);
    });
  });

  describe('invariants', () => {
    it('clears the route on every send terminal action', async () => {
      const emitted = await run(liveRoute$, [
        actionsFor(
          SendActions.transferComplete(),
          SendActions.transferFailed({ error: 'transfer-failed' }),
          SendActions.reset(),
          SendActions.disconnect(),
        ),
      ]);

      expect(emitted).toEqual([
        ConnectivityActions.routeCleared(),
        ConnectivityActions.routeCleared(),
        ConnectivityActions.routeCleared(),
        ConnectivityActions.routeCleared(),
      ]);
    });

    it('clears the route on every receive terminal action', async () => {
      const emitted = await run(liveRoute$, [
        actionsFor(
          ReceiveActions.transferComplete(),
          ReceiveActions.transferFailed({ error: 'transfer-failed' }),
          ReceiveActions.reset(),
          ReceiveActions.disconnect(),
        ),
      ]);

      expect(emitted).toEqual([
        ConnectivityActions.routeCleared(),
        ConnectivityActions.routeCleared(),
        ConnectivityActions.routeCleared(),
        ConnectivityActions.routeCleared(),
      ]);
    });
  });
});
