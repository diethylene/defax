/** One falling drop in the drag animation. */
export interface Drop {
  /** Horizontal position in pixels. */
  x: number;
  /** Vertical position in pixels. */
  y: number;
  /** Horizontal drift direction. */
  dx: number;
  /** Vertical drift direction. */
  dy: number;
  /** Animation delay. */
  delay: string;
}

/** Tuning for the drop layout. */
export interface DropLayoutOptions {
  /** Distance between drop columns in pixels. */
  columnSpacing?: number;
  /** Drops per column. */
  perColumn?: number;
  /** Ripple amount along the perimeter. */
  ripple?: number;
  /** Animation duration in seconds. */
  duration?: number;
}

/** One straight or curved piece of the perimeter. */
interface Segment {
  /** Length of the segment. */
  length: number;
  /** Position and outward normal at a distance along the segment. */
  at: (t: number) => [number, number, number, number];
}

/** Default layout tuning. */
const defaults: Required<DropLayoutOptions> = {
  columnSpacing: 4,
  perColumn: 2,
  ripple: 0.07,
  duration: 2.4,
};

/**
 * Builds the rounded-rectangle perimeter from lines and quarter arcs.
 * @param width Frame width in pixels.
 * @param height Frame height in pixels.
 * @param radius Corner radius in pixels.
 * @returns Perimeter segments in draw order.
 */
function perimeter(width: number, height: number, radius: number): Segment[] {
  const segments: Segment[] = [];

  /** Adds a straight perimeter segment. */
  const line = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number): void => {
    const length = Math.hypot(x1 - x0, y1 - y0);
    if (length > 0) {
      segments.push({
        length,
        at: (t) => [x0 + ((x1 - x0) * t) / length, y0 + ((y1 - y0) * t) / length, nx, ny],
      });
    }
  };

  /** Adds a quarter-circle perimeter segment. */
  const arc = (cx: number, cy: number, a0: number): void => {
    if (radius <= 0) return;
    const length = (Math.PI / 2) * radius;
    segments.push({
      length,
      at: (t) => {
        const a = a0 + t / radius;
        const ux = Math.cos(a);
        const uy = Math.sin(a);
        return [cx + radius * ux, cy + radius * uy, -ux, -uy];
      },
    });
  };

  line(radius, 0, width - radius, 0, 0, 1);
  arc(width - radius, radius, -Math.PI / 2);
  line(width, radius, width, height - radius, -1, 0);
  arc(width - radius, height - radius, 0);
  line(width - radius, height, radius, height, 0, -1);
  arc(radius, height - radius, Math.PI / 2);
  line(0, height - radius, 0, radius, 1, 0);
  arc(radius, radius, Math.PI);

  return segments;
}

/**
 * Computes a smooth ripple along the perimeter.
 * @param offset Distance along the perimeter in pixels.
 * @param total Perimeter length in pixels.
 * @param amount Ripple amplitude.
 * @returns Ripple offset.
 */
function ripple(offset: number, total: number, amount: number): number {
  const k1 = Math.max(1, Math.round(total / 173));
  const k2 = Math.max(1, Math.round(total / 61));
  const u = (offset / total) * Math.PI * 2;
  return amount * (0.6 * Math.sin(k1 * u) + 0.4 * Math.sin(k2 * u + 1.3));
}

/**
 * Places the falling drops around a rounded rectangle.
 * @param width Frame width in pixels.
 * @param height Frame height in pixels.
 * @param radius Corner radius in pixels.
 * @param options Layout tuning.
 * @returns Drops in animation order.
 */
export function computeDrops(
  width: number,
  height: number,
  radius: number,
  options: DropLayoutOptions = {},
): Drop[] {
  const {
    columnSpacing,
    perColumn,
    ripple: rippleAmount,
    duration,
  } = {
    ...defaults,
    ...options,
  };

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return [];
  }

  const segments = perimeter(width, height, radius);
  const total = segments.reduce((sum, segment) => sum + segment.length, 0);
  if (total <= 0) return [];

  let columns = Math.round(total / columnSpacing);
  if (columns % 2) columns += 1;
  const step = total / columns;

  const drops: Drop[] = [];
  let segmentIndex = 0;
  let segmentStart = 0;

  for (let c = 0; c < columns; c++) {
    const t = (c + 0.5) * step;
    while (t > segmentStart + segments[segmentIndex].length) {
      segmentStart += segments[segmentIndex].length;
      segmentIndex += 1;
    }
    const [x, y, dx, dy] = segments[segmentIndex].at(t - segmentStart);
    const phase = (c % 2) * 0.5 + ripple(t, total, rippleAmount) * perColumn;

    for (let j = 0; j < perColumn; j++) {
      drops.push({
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        dx: Number(dx.toFixed(4)),
        dy: Number(dy.toFixed(4)),
        delay: `${(-((j + phase) / perColumn) * duration).toFixed(3)}s`,
      });
    }
  }

  return drops;
}
