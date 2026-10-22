import type { ActivatedRouteSnapshot } from '@angular/router';
import { match, P } from 'ts-pattern';

export type NavDirection = 'forward' | 'backward';

const STEP_ORDER: Record<'send' | 'receive', string[]> = {
  send: ['', 'code', 'approve', 'transfer', 'complete', 'failed'],
  receive: ['', 'confirm', 'transfer', 'complete', 'failed']
};

function leafSegments(snapshot: ActivatedRouteSnapshot): string[] {
  const segments: string[] = [];
  let node: ActivatedRouteSnapshot | null = snapshot;
  while (node) {
    segments.push(...node.url.map((segment) => segment.path));
    node = node.firstChild ?? null;
  }
  return segments;
}

function stepIndex(flow: 'send' | 'receive', child: string): number {
  return Math.max(0, STEP_ORDER[flow].indexOf(child));
}

function routeStep(
  snapshot: ActivatedRouteSnapshot
): { flow: 'send' | 'receive'; step: number } | null {
  const [flow, child = ''] = leafSegments(snapshot);
  return match(flow)
    .with('send', () => ({
      flow: 'send' as const,
      step: stepIndex('send', child)
    }))
    .with('receive', () => ({
      flow: 'receive' as const,
      step: stepIndex('receive', child)
    }))
    .otherwise(() => null);
}

export function navDirection(
  from: ActivatedRouteSnapshot,
  to: ActivatedRouteSnapshot
): NavDirection {
  return match([routeStep(from), routeStep(to)] as const)
    .with(
      [
        { flow: P.select('fromFlow'), step: P.select('fromStep') },
        { flow: P.select('toFlow'), step: P.select('toStep') }
      ],
      ({ fromFlow, fromStep, toFlow, toStep }) =>
        fromFlow === toFlow && toStep < fromStep ? 'backward' : 'forward'
    )
    .otherwise(() => 'forward');
}
