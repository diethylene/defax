import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  type CanActivateFn,
  type CanDeactivateFn,
  provideRouter,
  Router,
  type RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import type { Action } from '@ngrx/store';
import { Store } from '@ngrx/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPhaseRouteGuard } from './transfer-phase.guard';

/** Status the guard spec drives the fake store through. */
type TestStatus = { readonly _tag: 'Idle' } | { readonly _tag: 'Running' };

/** Page a test status can show. */
type TestPhase = 'idle' | 'running';

/** Page each test status shows. */
const phaseForStatus = {
  Idle: 'idle',
  Running: 'running',
} satisfies Record<TestStatus['_tag'], TestPhase>;

/** Route that shows each test phase. */
const routeForPhase = {
  idle: '/test',
  running: '/test/running',
} satisfies Record<TestPhase, string>;

/** Whether leaving each test status loses nothing. */
const safeToLeave = {
  Idle: true,
  Running: false,
} satisfies Record<TestStatus['_tag'], boolean>;

/** Action the guard dispatches when the user confirms leaving. */
const disconnect = (): Action => ({ type: '[Test] Disconnect' });

/** Route snapshot the guards never read. */
const route = new ActivatedRouteSnapshot();

/**
 * Reads the router state snapshot pinned to one url.
 * @param url Url the navigation is heading to.
 * @returns Snapshot the guards read.
 */
const stateAt = (url: string): RouterStateSnapshot => {
  const snapshot = TestBed.inject(Router).routerState.snapshot;
  snapshot.url = url;
  return snapshot;
};

/**
 * Wires the guard pair against a fake store sitting on one status.
 * @param status Status the fake store reports.
 * @returns The guard pair and the fake dispatch spy.
 */
const setup = (status: TestStatus) => {
  const dispatch = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: Store, useValue: { selectSignal: () => () => status, dispatch } },
    ],
  });
  return {
    guard: createPhaseRouteGuard<TestStatus, TestPhase>({
      selectStatus: () => status,
      phaseForStatus: (current) => phaseForStatus[current._tag],
      routeForPhase: (phase) => routeForPhase[phase],
      disconnect,
      isSafeToLeave: (current) => safeToLeave[current._tag],
    }),
    dispatch,
  };
};

/**
 * Runs canActivate in the injection context the router would use.
 * @param canActivate Guard to run.
 * @param url Url the router is heading to.
 * @returns What the guard decided.
 */
const activate = (canActivate: CanActivateFn, url: string) =>
  TestBed.runInInjectionContext(() => canActivate(route, stateAt(url)));

/**
 * Runs canDeactivate in the injection context the router would use.
 * @param canDeactivate Guard to run.
 * @param currentUrl Url of the route being left.
 * @param nextUrl Url the router is heading to.
 * @returns What the guard decided.
 */
const deactivate = (canDeactivate: CanDeactivateFn<unknown>, currentUrl: string, nextUrl: string) =>
  TestBed.runInInjectionContext(() =>
    canDeactivate(null, route, stateAt(currentUrl), stateAt(nextUrl)),
  );

describe('createPhaseRouteGuard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('canActivate: success', () => {
    it('lets the status route through', () => {
      const { guard } = setup({ _tag: 'Running' });

      expect(activate(guard.canActivate, '/test/running')).toBe(true);
    });

    it('redirects to the route the status owns', () => {
      const { guard } = setup({ _tag: 'Running' });

      const result = activate(guard.canActivate, '/elsewhere');

      expect(result).toBeInstanceOf(UrlTree);
      expect(String(result)).toBe('/test/running');
    });
  });

  describe('canDeactivate: success', () => {
    it('lets the status route go without asking', () => {
      const { guard, dispatch } = setup({ _tag: 'Running' });
      const confirm = vi.spyOn(window, 'confirm');

      expect(deactivate(guard.canDeactivate, '/test', '/test/running')).toBe(true);
      expect(confirm).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('lets a safe status leave without asking', () => {
      const { guard, dispatch } = setup({ _tag: 'Idle' });
      const confirm = vi.spyOn(window, 'confirm');

      expect(deactivate(guard.canDeactivate, '/test', '/help')).toBe(true);
      expect(confirm).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalled();
    });
  });

  describe('canDeactivate: invariants', () => {
    it('dispatches the disconnect action when the user confirms', () => {
      const { guard, dispatch } = setup({ _tag: 'Running' });
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      expect(deactivate(guard.canDeactivate, '/test/running', '/help')).toBe(false);
      expect(dispatch).toHaveBeenCalledWith(disconnect());
    });

    it('dispatches nothing when the user declines', () => {
      const { guard, dispatch } = setup({ _tag: 'Running' });
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      expect(deactivate(guard.canDeactivate, '/test/running', '/help')).toBe(false);
      expect(dispatch).not.toHaveBeenCalled();
    });
  });
});
