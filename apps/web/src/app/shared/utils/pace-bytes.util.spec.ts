import { map } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { describe, expect, it } from 'vitest';
import { paceBytes } from './pace-bytes.util';

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
 * Paces a synchronous burst of chunk sizes and records the emissions.
 * @param sizes Sizes emitted together at frame zero.
 * @returns Emissions the paced stream produced.
 */
const paceBurst = (sizes: readonly number[]): readonly Emission[] => {
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
        paceBytes(BYTES_PER_SECOND, scheduler),
        map((chunk) => chunk.byteLength),
      )
      .subscribe({
        next: (size) => emissions.push({ frame: scheduler.frame, size }),
      });
    scheduler.flush();
  });

  return emissions;
};

describe('paceBytes', () => {
  describe('success', () => {
    it('spreads a burst so cumulative bytes per second stays at the ceiling', () => {
      const emissions = paceBurst([100, 200, 300]);

      expect(emissions).toEqual([
        { frame: 100, size: 100 },
        { frame: 300, size: 200 },
        { frame: 600, size: 300 },
      ]);
    });
  });

  describe('invariants', () => {
    it('keeps chunks in arrival order even when the source waits between them', () => {
      const scheduler = new TestScheduler(() => undefined);
      const emissions: Emission[] = [];

      scheduler.run(({ cold }) => {
        cold('a 10ms b 20ms c|', { a: 1, b: 2, c: 3 })
          .pipe(
            map((size) => chunkOf(size)),
            paceBytes(BYTES_PER_SECOND, scheduler),
            map((chunk) => chunk.byteLength),
          )
          .subscribe({
            next: (size) => emissions.push({ frame: scheduler.frame, size }),
          });
        scheduler.flush();
      });

      expect(emissions).toEqual([
        { frame: 1, size: 1 },
        { frame: 11, size: 2 },
        { frame: 32, size: 3 },
      ]);
    });

    it('passes zero-byte chunks through without delay', () => {
      const emissions = paceBurst([0, 0]);

      expect(emissions).toEqual([
        { frame: 0, size: 0 },
        { frame: 0, size: 0 },
      ]);
    });

    it('completes as soon as the last chunk is paced out', () => {
      const scheduler = new TestScheduler(() => undefined);
      const frames: number[] = [];

      scheduler.run(({ cold }) => {
        cold('(a|)', { a: 300 })
          .pipe(
            map((size) => chunkOf(size)),
            paceBytes(BYTES_PER_SECOND, scheduler),
          )
          .subscribe({
            next: () => frames.push(scheduler.frame),
            complete: () => frames.push(scheduler.frame),
          });
        scheduler.flush();
      });

      expect(frames).toEqual([300, 300]);
    });

    it('rejects a ceiling that cannot pace any bytes', () => {
      expect(() => paceBytes(0)).toThrow(RangeError);
    });
  });
});
