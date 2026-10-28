import type { ActivatedRouteSnapshot } from '@angular/router';
import * as Match from 'effect/Match';

/** Direction the router transition should animate. */
export type NavDirection = 'forward' | 'backward';

/** Transfer flow a route belongs to. */
type Flow = 'send' | 'receive';

/** Ordered step names for each transfer flow. */
const STEP_ORDER: Record<Flow, readonly string[]> = {
  send: ['', 'code', 'approve', 'transfer', 'complete', 'failed'],
  receive: ['', 'confirm', 'transfer', 'complete', 'failed'],
};

/** A resolved flow and its position within the flow steps. */
interface RouteStep {
  /** Flow the route belongs to. */
  readonly flow: Flow;
  /** Zero-based step position within the flow. */
  readonly step: number;
}

/**
 * Collects the URL segments along the deepest route branch.
 * @param snapshot Root snapshot to walk.
 * @returns Segment paths from the root down to the leaf.
 */
const leafSegments = (snapshot: ActivatedRouteSnapshot): string[] => [
  ...snapshot.url.map((segment) => segment.path),
  ...(snapshot.firstChild ? leafSegments(snapshot.firstChild) : []),
];

/**
 * Returns the ordinal of a flow step, defaulting to the first step.
 * @param flow Transfer flow.
 * @param child Child route segment name.
 * @returns The zero-based step index.
 */
const stepIndex = (flow: Flow, child: string): number =>
  Math.max(0, STEP_ORDER[flow].indexOf(child));

/**
 * Resolves the flow and step a snapshot points at.
 * @param snapshot Snapshot to resolve.
 * @returns The route step, or null when the snapshot is not inside a flow.
 */
const routeStep = (snapshot: ActivatedRouteSnapshot): RouteStep | null => {
  const [flow, child = ''] = leafSegments(snapshot);
  return Match.value(flow).pipe(
    Match.when('send', () => ({
      flow: 'send' as const,
      step: stepIndex('send', child),
    })),
    Match.when('receive', () => ({
      flow: 'receive' as const,
      step: stepIndex('receive', child),
    })),
    Match.orElse(() => null),
  );
};

/**
 * Tells whether a transition moves back within the same flow.
 * @param from Step the transition leaves.
 * @param to Step the transition enters.
 * @returns True when both steps share a flow and the target is earlier.
 */
const isBackward = (from: RouteStep | null, to: RouteStep | null): boolean => {
  if (!from || !to) return false;
  if (from.flow !== to.flow) return false;
  return to.step < from.step;
};

/**
 * Derives the animation direction between two snapshots.
 * @param from Snapshot the transition leaves.
 * @param to Snapshot the transition enters.
 * @returns Backward when the target step precedes the source within a flow.
 */
export const navDirection = (
  from: ActivatedRouteSnapshot,
  to: ActivatedRouteSnapshot,
): NavDirection => (isBackward(routeStep(from), routeStep(to)) ? 'backward' : 'forward');
