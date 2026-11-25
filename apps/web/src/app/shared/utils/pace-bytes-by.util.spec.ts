import { map, of } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { describe, expect, it } from 'vitest';
import { paceBytesBy } from './pace-bytes-by.util';

/** Ceiling the tests pace against: one byte per millisecond. */
const BYTES_PER_SECOND = 1_000;

/** One paced chunk as it left the operator. */
interface Emission {
  /** Scheduler frame the chunk was emitted at. */
  readonly frame: number;
  /** Chunk length in bytes. */
  readonly size: number;
}

/**
 * Builds a chunk of the given length.
 * @param size Chunk length in bytes.
 * @returns Buffer with that length.
 */
const chunkOf = (size: number): ArrayBuffer => new ArrayBuffer(size);

/**
 * Paces a synchronous burst of chunk sizes under one ceiling and records the emissions.
 * @param sizes Sizes emitted together at frame zero.
 * @param ceiling Ceiling the burst is paced under.
 * @returns Emissions the paced stream produced.
 */
const paceBurst = (sizes: readonly number[], ceiling: number): readonly Emission[] => {
  const scheduler = new TestScheduler(() => undefined);
  const emissions: Emission[] = [];
  const values: Record<string, number> = Object.fromEntries(
    sizes.map((size, index) => [String.fromCharCode(97 + index), size]),
  );
  const marbles = `(${Object.keys(values).join('')}|)`;

  scheduler.run(({ cold }) => {
    cold(marbles, values)
      .pipe(
        map((size) => chunkOf(size)),
        paceBytesBy(of(ceiling), scheduler),
        map((chunk) => chunk.byteLength),
      )
      .subscribe({
        next: (size) => emissions.push({ frame: scheduler.frame, size }),
      });
    scheduler.flush();
  });

  return emissions;
};

describe('paceBytesBy', () => {
  describe('success', () => {
    it('spreads a burst under the current ceiling', () => {
      const emissions = paceBurst([100, 200, 300], BYTES_PER_SECOND);

      expect(emissions).toEqual([
        { frame: 100, size: 100 },
        { frame: 300, size: 200 },
        { frame: 600, size: 300 },
      ]);
    });
  });

  describe('invariants', () => {
    it('passes chunks through when the ceiling is infinite', () => {
      const emissions = paceBurst([100, 200], Number.POSITIVE_INFINITY);

      expect(emissions).toEqual([
        { frame: 0, size: 100 },
        { frame: 0, size: 200 },
      ]);
    });

    it('passes chunks through when the ceiling is zero', () => {
      const emissions = paceBurst([100], 0);

      expect(emissions).toEqual([{ frame: 0, size: 100 }]);
    });

    it('passes chunks through when the ceiling is negative', () => {
      const emissions = paceBurst([100], -BYTES_PER_SECOND);

      expect(emissions).toEqual([{ frame: 0, size: 100 }]);
    });

    it('applies a changed ceiling to later chunks', () => {
      const scheduler = new TestScheduler(() => undefined);
      const emissions: Emission[] = [];

      scheduler.run(({ cold }) => {
        const ceiling$ = cold('a 50ms b', {
          a: BYTES_PER_SECOND,
          b: 2 * BYTES_PER_SECOND,
        });
        cold('10ms a 109ms b|', { a: 100, b: 100 })
          .pipe(
            map((size) => chunkOf(size)),
            paceBytesBy(ceiling$, scheduler),
            map((chunk) => chunk.byteLength),
          )
          .subscribe({
            next: (size) => emissions.push({ frame: scheduler.frame, size }),
          });
        scheduler.flush();
      });

      expect(emissions).toEqual([
        { frame: 100, size: 100 },
        { frame: 120, size: 100 },
      ]);
    });
  });
});
