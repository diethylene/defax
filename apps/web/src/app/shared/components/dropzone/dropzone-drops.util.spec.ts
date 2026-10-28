import { describe, expect, it } from 'vitest';
import type { Drop, DropLayoutOptions } from './dropzone-drops.util';
import { computeDrops } from './dropzone-drops.util';

/** Expected drops for a rounded rectangle with every segment kind present. */
const rounded: readonly Drop[] = [
  { x: 18.39, y: 0, dx: 0, dy: 1, delay: '-0.080s' },
  { x: 18.39, y: 0, dx: 0, dy: 1, delay: '-1.280s' },
  { x: 39.17, y: 0, dx: 0, dy: 1, delay: '-0.626s' },
  { x: 39.17, y: 0, dx: 0, dy: 1, delay: '-1.826s' },
  { x: 50, y: 13.39, dx: -1, dy: 0, delay: '-0.146s' },
  { x: 50, y: 13.39, dx: -1, dy: 0, delay: '-1.346s' },
  { x: 49.71, y: 34.15, dx: -0.9633, dy: -0.2685, delay: '-0.630s' },
  { x: 49.71, y: 34.15, dx: -0.9633, dy: -0.2685, delay: '-1.830s' },
  { x: 31.61, y: 40, dx: 0, dy: -1, delay: '0.080s' },
  { x: 31.61, y: 40, dx: 0, dy: -1, delay: '-1.120s' },
  { x: 10.83, y: 40, dx: 0, dy: -1, delay: '-0.574s' },
  { x: 10.83, y: 40, dx: 0, dy: -1, delay: '-1.774s' },
  { x: 0, y: 26.61, dx: 1, dy: 0, delay: '0.146s' },
  { x: 0, y: 26.61, dx: 1, dy: 0, delay: '-1.054s' },
  { x: 0.29, y: 5.85, dx: 0.9633, dy: 0.2685, delay: '-0.570s' },
  { x: 0.29, y: 5.85, dx: 0.9633, dy: 0.2685, delay: '-1.770s' },
];

/** Expected drops for a sharp-cornered rectangle with one drop per column. */
const sharp: readonly Drop[] = [
  { x: 15, y: 0, dx: 0, dy: 1, delay: '-0.068s' },
  { x: 45, y: 0, dx: 0, dy: 1, delay: '-1.283s' },
  { x: 60, y: 15, dx: -1, dy: 0, delay: '-0.068s' },
  { x: 45, y: 30, dx: 0, dy: -1, delay: '-1.132s' },
  { x: 15, y: 30, dx: 0, dy: -1, delay: '0.083s' },
  { x: 0, y: 15, dx: 1, dy: 0, delay: '-1.132s' },
];

describe('computeDrops', () => {
  describe('success', () => {
    it('places every column of a rounded rectangle along its perimeter', () => {
      expect(computeDrops(50, 40, 8, { columnSpacing: 20 })).toEqual(rounded);
    });

    it('places the straight segments of a sharp rectangle without corner arcs', () => {
      expect(computeDrops(60, 30, 0, { columnSpacing: 30, perColumn: 1 })).toEqual(sharp);
    });
  });

  describe('invariants', () => {
    it('returns no drops for a frame without area', () => {
      expect(computeDrops(0, 40, 8)).toEqual([]);
    });

    it('returns no drops for a non-finite frame', () => {
      expect(computeDrops(Number.POSITIVE_INFINITY, 40, 8)).toEqual([]);
    });

    it('returns an even number of columns so the ripple stays symmetric', () => {
      const options: DropLayoutOptions = { columnSpacing: 13 };
      expect(computeDrops(37, 91, 5, options).length % 4).toBe(0);
    });

    it('leaves the options untouched', () => {
      const options: DropLayoutOptions = { columnSpacing: 20 };
      computeDrops(50, 40, 8, options);
      expect(options).toEqual({ columnSpacing: 20 });
    });
  });

  describe('regressions', () => {
    it('returns no drops for a zero column spacing instead of hanging (#columnSpacing)', () => {
      expect(computeDrops(50, 40, 8, { columnSpacing: 0 })).toEqual([]);
    });
  });
});
