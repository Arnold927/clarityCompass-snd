/** Point-in-country-boundary check, used to filter map pins to only those
 * physically located inside a selected country — as opposed to the
 * separate, tag-based Country filter (which matches on how a project is
 * categorized, not on where any individual pin actually sits).
 *
 * Verified against known reference coordinates (Nairobi, Mombasa, Addis
 * Ababa, both sides of Moyale, and points clearly in neither country)
 * before use — see the conversation this was built in for the test run.
 * Mombasa specifically failed a strict point-in-polygon test on first
 * pass: it sits right at a coastal indentation (Tudor Creek/Kilindini
 * Harbour) that the simplified boundary data smooths over, placing the
 * simplified coastline about 1.5km seaward of the city's real
 * coordinates. A small tolerance exists specifically to absorb that
 * class of coastline-simplification error.
 *
 * That tolerance alone caused a second, more serious bug once live-tested
 * against the shared Kenya/Ethiopia land border: a point sitting only a
 * few km inside Kenya, near the border, was incorrectly passing Ethiopia's
 * tolerant check too, since it happened to be within the tolerance
 * distance of Ethiopia's boundary line as well — even though it was
 * strictly, unambiguously inside Kenya already. The fix: the tolerance
 * rescue only applies when the point isn't already strictly claimed by
 * one of the other countries passed in. A coastline gap gets rescued; a
 * point on the neighboring country's side of a shared land border does
 * not, regardless of how close it sits to the line. */

type Ring = [number, number][];
type Polygon = Ring[];

const COASTLINE_TOLERANCE_KM = 5;

function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function distToSegmentKm(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const A = px - ax, B = py - ay, C = bx - ax, D = by - ay;
  const dot = A * C + B * D, lenSq = C * C + D * D;
  let t = lenSq !== 0 ? dot / lenSq : -1;
  t = Math.max(0, Math.min(1, t));
  const ex = ax + t * C, ey = ay + t * D;
  return Math.hypot(px - ex, py - ey) * 111; // rough km per degree — fine at this small scale
}

function minDistToRingKm(lng: number, lat: number, ring: Ring): number {
  let min = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    min = Math.min(min, distToSegmentKm(lng, lat, ring[i][0], ring[i][1], ring[j][0], ring[j][1]));
  }
  return min;
}

function strictlyInPolygon(lng: number, lat: number, polygon: Polygon): boolean {
  return pointInRing(lng, lat, polygon[0]);
}

function distToPolygonKm(lng: number, lat: number, polygon: Polygon): number {
  return minDistToRingKm(lng, lat, polygon[0]);
}

function strictlyInGeometry(lng: number, lat: number, geojson: any): boolean {
  const geom = geojson?.features?.[0]?.geometry;
  if (!geom) return false;
  if (geom.type === 'Polygon') return strictlyInPolygon(lng, lat, geom.coordinates);
  if (geom.type === 'MultiPolygon') return geom.coordinates.some((poly: Polygon) => strictlyInPolygon(lng, lat, poly));
  return false;
}

function minDistToGeometryKm(lng: number, lat: number, geojson: any): number {
  const geom = geojson?.features?.[0]?.geometry;
  if (!geom) return Infinity;
  if (geom.type === 'Polygon') return distToPolygonKm(lng, lat, geom.coordinates);
  if (geom.type === 'MultiPolygon') return Math.min(...geom.coordinates.map((poly: Polygon) => distToPolygonKm(lng, lat, poly)));
  return Infinity;
}

/**
 * targetGeojson: the country to test membership against.
 * otherGeojsons: every other country's boundary that's loaded — used to
 * make sure a coastline-tolerance rescue never overrides a point that
 * genuinely belongs to a neighbor instead.
 */
export function pointInCountryBoundary(lng: number, lat: number, targetGeojson: any, otherGeojsons: any[] = []): boolean {
  if (strictlyInGeometry(lng, lat, targetGeojson)) return true;
  if (otherGeojsons.some(g => strictlyInGeometry(lng, lat, g))) return false;
  return minDistToGeometryKm(lng, lat, targetGeojson) <= COASTLINE_TOLERANCE_KM;
}