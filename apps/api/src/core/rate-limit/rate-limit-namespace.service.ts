import type { RateLimiterDo } from '@api/core/rate-limit/rate-limiter.do';
import * as Context from 'effect/Context';

/** Binding to the Durable Object namespace that holds rate limit counters. */
export const RateLimiterNamespace = Context.Service<{
  /** The `RATE_LIMITER` namespace binding. */
  readonly namespace: DurableObjectNamespace<RateLimiterDo>;
}>('RateLimiterNamespace');
