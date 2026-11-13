import { DurableObject } from 'cloudflare:workers';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { type ConsumeRequest, ConsumeRequestSchema, type ConsumeResult } from './rate-limit.model';

/** One fixed window's counter. */
interface WindowState {
  /** Requests counted since the window opened. */
  count: number;
  /** Epoch milliseconds at which the window resets. */
  resetAt: number;
}

/** A fixed-window rate limiter backed by one shared Durable Object. */
export class RateLimiterDo extends DurableObject<Record<string, never>> {
  /**
   * Routes a consume request, answering 404 for anything else.
   * @param request Incoming request.
   * @returns The response.
   */
  override async fetch(request: Request): Promise<Response> {
    const action = new URL(request.url).pathname.split('/').filter(Boolean).at(-1);
    return Match.value([action, request.method] as const).pipe(
      Match.when(['consume', 'POST'], () => this.consume(request)),
      Match.orElse(() => new Response(null, { status: 404 })),
    );
  }

  /**
   * Counts one request against a key's window and reports the outcome.
   * @param request Request whose JSON body carries the consume input.
   * @returns The consume result as JSON, or 400 when the body is unreadable.
   */
  private async consume(request: Request): Promise<Response> {
    const body: unknown = await request.json();
    return Option.match(Schema.decodeUnknownOption(ConsumeRequestSchema)(body), {
      onNone: async () => new Response(null, { status: 400 }),
      onSome: async (input) => {
        const result = await this.ctx.blockConcurrencyWhile(() => this.consumeAtomically(input));
        return Response.json(result);
      },
    });
  }

  /**
   * Reads, updates, and writes one counter inside the object's lock.
   * @param input Consume input.
   * @returns The outcome for this request.
   */
  private async consumeAtomically(input: ConsumeRequest): Promise<ConsumeResult> {
    const now = Date.now();
    const stored = await this.ctx.storage.get<WindowState>(input.key);
    const window =
      stored === undefined || now >= stored.resetAt
        ? { count: 0, resetAt: now + input.windowMs }
        : stored;
    const allowed = window.count < input.limit;
    const next = allowed ? { ...window, count: window.count + 1 } : window;
    await this.ctx.storage.put(input.key, next);
    return {
      allowed,
      remaining: Math.max(0, input.limit - next.count),
      resetAfterMs: window.resetAt - now,
    };
  }
}
