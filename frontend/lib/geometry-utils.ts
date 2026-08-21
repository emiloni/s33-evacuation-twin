import type { Point } from "./schema";

/**
 * Calculate the centroid of a polygon.
 *
 * Uses the standard area-weighted polygon centroid
 * rather than simply averaging the vertices. This
 * gives better label positioning for irregular rooms.
 */
export function polygonCentroid(points: Point[]): Point {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }

  if (points.length === 1) {
    return points[0];
  }

  let area = 0;
  let centroidX = 0;
  let centroidY = 0;

  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];

    const cross =
      current.x * next.y -
      next.x * current.y;

    area += cross;

    centroidX +=
      (current.x + next.x) * cross;

    centroidY +=
      (current.y + next.y) * cross;
  }

  area *= 0.5;

  // Degenerate polygon: fall back to average.
  if (Math.abs(area) < 0.000001) {
    const sum = points.reduce(
      (acc, point) => ({
        x: acc.x + point.x,
        y: acc.y + point.y,
      }),
      { x: 0, y: 0 }
    );

    return {
      x: sum.x / points.length,
      y: sum.y / points.length,
    };
  }

  return {
    x: centroidX / (6 * area),
    y: centroidY / (6 * area),
  };
}

/**
 * Convert geometry points into the format
 * expected by an SVG polygon/polyline.
 */
export function polygonToSvgPoints(
  points: Point[]
): string {
  return points
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
}

/**
 * Euclidean distance between two points.
 */
export function distance(
  a: Point,
  b: Point
): number {
  return Math.hypot(
    b.x - a.x,
    b.y - a.y
  );
}

/**
 * Calculate the total length of a polyline.
 */
export function pathLength(
  points: Point[]
): number {
  if (points.length < 2) {
    return 0;
  }

  let total = 0;

  for (let i = 1; i < points.length; i++) {
    total += distance(
      points[i - 1],
      points[i]
    );
  }

  return total;
}

/**
 * Return a point at normalized position `t`
 * along a polyline.
 *
 * t = 0 → beginning
 * t = 0.5 → middle
 * t = 1 → end
 */
export function pointAlongPath(
  points: Point[],
  t: number
): Point {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }

  if (points.length === 1) {
    return points[0];
  }

  const total = pathLength(points);

  if (total === 0) {
    return points[0];
  }

  const normalizedT = Math.max(
    0,
    Math.min(1, t)
  );

  let remaining = total * normalizedT;

  for (let i = 1; i < points.length; i++) {
    const start = points[i - 1];
    const end = points[i];

    const segmentLength = distance(
      start,
      end
    );

    if (remaining <= segmentLength) {
      const ratio =
        segmentLength === 0
          ? 0
          : remaining / segmentLength;

      return {
        x:
          start.x +
          (end.x - start.x) * ratio,

        y:
          start.y +
          (end.y - start.y) * ratio,
      };
    }

    remaining -= segmentLength;
  }

  return points[points.length - 1];
}

/**
 * Calculate the bounding box of a set of points.
 */
export function polygonBounds(
  points: Point[]
) {
  if (points.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
    };
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Determine whether a point lies inside
 * a polygon using ray casting.
 */
export function pointInPolygon(
  point: Point,
  polygon: Point[]
): boolean {
  if (polygon.length < 3) {
    return false;
  }

  let inside = false;

  for (
    let i = 0, j = polygon.length - 1;
    i < polygon.length;
    j = i++
  ) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;

    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersects =
      yi > point.y !== yj > point.y &&
      point.x <
        ((xj - xi) *
          (point.y - yi)) /
          (yj - yi) +
          xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}