'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { C, STATUS_COLORS, STATUS_LABELS, fmtNumber, type MapPoint } from '@/lib/meal-api';
import 'leaflet/dist/leaflet.css';
import kenyaBoundary from '@/data/kenya-boundary.json';
import ethiopiaBoundary from '@/data/ethiopia-boundary.json';

// Bundled directly rather than fetched from a boundary API at runtime —
// after the tile-provider issues, a static, verified-once file that can
// never require a key or go down is the more reliable choice here.
const BOUNDARY_STYLE = {
  color: C.brown,
  weight: 3,
  opacity: 0.85,
  fill: false,
};

// The full extent of both countries is roughly 20° of latitude by 15° of
// longitude — much taller than wide. A wide, full-width map card can't fit
// that full extent without either showing a lot of neighboring territory
// (the old behavior) or being impractically tall. This narrower band
// trades the very far north of Ethiopia (Gondar, Tigray, the Eritrea
// border) for a tight fit that still comfortably includes Nairobi,
// Mombasa, Addis Ababa, and the Marsabit/Moyale border area — deliberately
// chosen since that's the area SND's own work is actually centered on.
// Users can still pan/zoom out to see further north.
const KENYA_ETHIOPIA_BOUNDS: [[number, number], [number, number]] = [[-4.6, 32.9], [10.5, 48.0]];
// A generously padded version, used only to stop panning drifting away into
// neighboring countries — not for the initial framing.
const PAN_LIMIT_BOUNDS: [[number, number], [number, number]] = [[-9, 27], [20, 53]];

function statusColor(status: string) {
  return STATUS_COLORS[status] ?? C.muted;
}

export function pointKey(p: MapPoint) {
  return `${p.kind}-${p.location_id}`;
}

/** Rendered inside MapContainer (needs the useMap hook, which only works
 * there) — reacts to the parent's selectedKey changing by panning the map
 * to that point and opening its popup, so clicking a row in the list
 * below the map does something visible on the map itself. */
function FlyToSelected({ selectedKey, points, markerRefs }: {
  selectedKey: string | null;
  points: MapPoint[];
  markerRefs: React.MutableRefObject<Record<string, L.Marker | null>>;
}) {
  const map = useMap();
  useEffect(() => {
    if (!selectedKey) return;
    const point = points.find(p => pointKey(p) === selectedKey);
    if (!point) return;
    map.flyTo([point.latitude, point.longitude], Math.max(map.getZoom(), 9), { duration: 0.6 });
    const marker = markerRefs.current[selectedKey];
    // Popups can't open mid-flight in Leaflet — wait for the pan/zoom to settle first.
    const openWhenReady = () => marker?.openPopup();
    map.once('moveend', openWhenReady);
    return () => { map.off('moveend', openWhenReady); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);
  return null;
}

/** A small colored marker built from a div, not an image file — lets the
 * color and shape vary per status/kind without needing a separate icon
 * asset per combination. */
function buildIcon(kind: 'project' | 'activity', color: string) {
  const size = kind === 'project' ? 30 : 22;
  const shape = kind === 'project'
    ? `border-radius: 6px 6px 6px 0; transform: rotate(-45deg);`
    : `border-radius: 50%;`;
  const inner = kind === 'project' ? 'transform: rotate(45deg);' : '';
  return L.divIcon({
    className: 'clarity-map-marker',
    html: `<div style="width:${size}px;height:${size}px;background:${color};${shape}border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
             <div style="width:6px;height:6px;background:white;border-radius:50%;${inner}"></div>
           </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, kind === 'project' ? size : size / 2],
    popupAnchor: [0, kind === 'project' ? -size : -size / 2],
  });
}

export default function PortfolioMapView({ points, selectedKey = null, onMarkerClick }: {
  points: MapPoint[];
  selectedKey?: string | null;
  onMarkerClick?: (key: string) => void;
}) {
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

  useEffect(() => {
    // Fix Leaflet's default marker icon path (unused here since we build
    // our own divIcons, but harmless to keep consistent with the rest of
    // the app in case anything ever falls back to the default icon).
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });
  }, []);

  return (
    <MapContainer
      bounds={KENYA_ETHIOPIA_BOUNDS}
      boundsOptions={{ padding: [16, 16] }}
      maxBounds={PAN_LIMIT_BOUNDS}
      minZoom={4}
      style={{ width: '100%', height: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <GeoJSON data={kenyaBoundary as any} style={BOUNDARY_STYLE} />
      <GeoJSON data={ethiopiaBoundary as any} style={BOUNDARY_STYLE} />
      <FlyToSelected selectedKey={selectedKey} points={points} markerRefs={markerRefs} />
      {points.map(p => {
        const key = pointKey(p);
        return (
          <Marker
            key={key}
            position={[p.latitude, p.longitude]}
            icon={buildIcon(p.kind, statusColor(p.status))}
            ref={m => { markerRefs.current[key] = m; }}
            eventHandlers={onMarkerClick ? { click: () => onMarkerClick(key) } : undefined}
          >
            <Popup>
            <div style={{ minWidth: 200 }}>
              <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.orange, fontWeight: 600, margin: 0 }}>
                {p.kind === 'project' ? 'Project' : 'Activity'}
              </p>
              <p style={{ fontWeight: 700, color: C.brown, margin: '2px 0 4px' }}>{p.name}</p>
              {p.kind === 'activity' && (
                <p style={{ fontSize: 12, color: '#666', margin: '0 0 4px' }}>
                  Part of{' '}
                  <Link href={`/projects?project=${p.project_id}`} style={{ color: C.orange }}>{p.project_name}</Link>
                </p>
              )}
              {p.location_name && (
                <p style={{ fontSize: 12, color: '#666', margin: '0 0 6px' }}>{p.location_name}</p>
              )}
              <p style={{ fontSize: 13, margin: '2px 0' }}>
                <span style={{ color: statusColor(p.status), fontWeight: 600 }}>{STATUS_LABELS[p.status] ?? p.status}</span>
              </p>
              <p style={{ fontSize: 13, margin: '2px 0' }}>
                {p.target !== null ? (
                  <>Reach: <b>{fmtNumber(p.reach)}</b> of <b>{fmtNumber(p.target)}</b> target</>
                ) : (
                  <>Total reach: <b>{fmtNumber(p.reach)}</b></>
                )}
              </p>
              <Link
                href={p.kind === 'project' ? `/projects?project=${p.id}` : `/activities/${p.id}`}
                style={{ color: C.orange, fontSize: 13, fontWeight: 600, display: 'inline-block', marginTop: 6 }}
              >
                View details →
              </Link>
            </div>
          </Popup>
        </Marker>
        );
      })}
    </MapContainer>
  );
}