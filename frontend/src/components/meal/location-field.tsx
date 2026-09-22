'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MapPin, Search, Crosshair, Loader2, X, Plus } from 'lucide-react';
import { C } from '@/lib/meal-api';
import type L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface LocationValue {
  latitude: number | null;
  longitude: number | null;
  location_name: string;
}

const EMPTY: LocationValue = { latitude: null, longitude: null, location_name: '' };
const DEFAULT_CENTER: [number, number] = [5.5, 40]; // roughly between Kenya and Ethiopia

/** Reverse geocode via Nominatim (OpenStreetMap) — same free service already
 * used for forward search elsewhere in this app. Used whenever coordinates
 * change by any means OTHER than picking a named search result (map click,
 * drag, manual typing, or "use my location") — so a location name is never
 * missing just because someone entered raw coordinates. */
async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14&addressdetails=0`,
      { signal }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.display_name ?? null;
  } catch (err: any) {
    if (err?.name === 'AbortError') return null;
    return null;
  }
}

async function forwardGeocode(query: string, signal?: AbortSignal): Promise<{ name: string; lat: number; lng: number }[]> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=0&limit=5`,
      { signal }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((item: any) => ({ name: item.display_name, lat: parseFloat(item.lat), lng: parseFloat(item.lon) }));
  } catch (err: any) {
    if (err?.name === 'AbortError') return [];
    return [];
  }
}

function LocationPickerDialog({ open, onOpenChange, value, onSave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: LocationValue;
  onSave: (v: LocationValue) => void;
}) {
  const [current, setCurrent] = useState<LocationValue>(value);
  const [search, setSearch] = useState(value.location_name || '');
  const [suggestions, setSuggestions] = useState<{ name: string; lat: number; lng: number }[]>([]);
  const [resolvingName, setResolvingName] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const leafletRef = useRef<typeof L | null>(null);
  const mapReadyRef = useRef(false);
  const reverseAbortRef = useRef<AbortController | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Reset to the incoming value each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setCurrent(value);
    setSearch(value.location_name || '');
    setSuggestions([]);
    setLocateError(null);
  }, [open, value]);

  // Set up the map once, on open.
  useEffect(() => {
    if (!open || !mapContainerRef.current || mapReadyRef.current) return;

    let cancelled = false;
    import('leaflet').then((leafletModule) => {
      if (cancelled || !mapContainerRef.current) return;
      const Lmod = leafletModule.default;
      leafletRef.current = Lmod;

      // Fix Leaflet's default marker icon path, which breaks under webpack/Next.js bundling.
      delete (Lmod.Icon.Default.prototype as any)._getIconUrl;
      Lmod.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const startCenter: [number, number] = current.latitude !== null && current.longitude !== null
        ? [current.latitude, current.longitude] : DEFAULT_CENTER;
      const startZoom = current.latitude !== null ? 13 : 5;

      const map = Lmod.map(mapContainerRef.current, { center: startCenter, zoom: startZoom });
      Lmod.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const marker = Lmod.marker(startCenter, { draggable: true, opacity: current.latitude !== null ? 1 : 0 }).addTo(map);

      marker.on('dragend', () => {
        const { lat, lng } = marker.getLatLng();
        handlePositionChange(lat, lng);
      });
      map.on('click', (e: L.LeafletMouseEvent) => {
        marker.setOpacity(1);
        marker.setLatLng(e.latlng);
        handlePositionChange(e.latlng.lat, e.latlng.lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
      mapReadyRef.current = true;
      setTimeout(() => map.invalidateSize(), 150);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Tear the map down when the dialog closes, so reopening builds a fresh one.
  useEffect(() => {
    if (open) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    markerRef.current = null;
    mapReadyRef.current = false;
  }, [open]);

  // Keep the marker/view in sync whenever `current` changes from any source.
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || current.latitude === null || current.longitude === null) return;
    const pos: [number, number] = [current.latitude, current.longitude];
    markerRef.current.setLatLng(pos);
    markerRef.current.setOpacity(1);
    mapInstanceRef.current.setView(pos, Math.max(mapInstanceRef.current.getZoom(), 12));
  }, [current.latitude, current.longitude]);

  function handlePositionChange(rawLat: number, rawLng: number, knownName?: string) {
    // The database column stores 6 decimal places (~11cm precision, plenty
    // for this use case) — but GPS, browser geolocation, and geocoding
    // search results all return far more precision than that. Rounding
    // here, at the one chokepoint every source of a coordinate change
    // passes through, means it's fixed everywhere at once rather than
    // needing separate rounding at each call site.
    const lat = Math.round(rawLat * 1e6) / 1e6;
    const lng = Math.round(rawLng * 1e6) / 1e6;
    reverseAbortRef.current?.abort();
    if (knownName !== undefined) {
      setCurrent({ latitude: lat, longitude: lng, location_name: knownName });
      setSearch(knownName);
      return;
    }
    // Coordinates changed without a name attached (map click/drag, manual
    // typing, geolocation) — resolve a name so it's never left missing.
    setCurrent(prev => ({ ...prev, latitude: lat, longitude: lng }));
    setResolvingName(true);
    const controller = new AbortController();
    reverseAbortRef.current = controller;
    reverseGeocode(lat, lng, controller.signal).then(name => {
      if (controller.signal.aborted) return;
      setResolvingName(false);
      if (name) {
        setCurrent(prev => ({ ...prev, location_name: name }));
        setSearch(name);
      }
    });
  }

  // Debounced forward search-as-you-type.
  useEffect(() => {
    searchAbortRef.current?.abort();
    if (!search || search === current.location_name) { setSuggestions([]); return; }
    const controller = new AbortController();
    searchAbortRef.current = controller;
    const handle = setTimeout(async () => {
      const results = await forwardGeocode(search, controller.signal);
      if (!controller.signal.aborted) setSuggestions(results);
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const applySuggestion = (s: { name: string; lat: number; lng: number }) => {
    setSuggestions([]);
    handlePositionChange(s.lat, s.lng, s.name);
  };

  const handleManualCoord = (field: 'latitude' | 'longitude', raw: string) => {
    const num = raw === '' ? null : parseFloat(raw);
    if (num === null || Number.isNaN(num)) {
      setCurrent(prev => ({ ...prev, [field]: null }));
      return;
    }
    const lat = field === 'latitude' ? num : current.latitude;
    const lng = field === 'longitude' ? num : current.longitude;
    if (lat !== null && lng !== null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      handlePositionChange(lat, lng);
    } else {
      setCurrent(prev => ({ ...prev, [field]: num }));
    }
  };

  const useCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocateError('Geolocation is not available in this browser.');
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        handlePositionChange(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setLocating(false);
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied — you can still search by name or enter coordinates manually.'
            : 'Could not get your current location — you can still search by name or enter coordinates manually.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const clear = () => {
    reverseAbortRef.current?.abort();
    setCurrent(EMPTY);
    setSearch('');
    setSuggestions([]);
    markerRef.current?.setOpacity(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl w-full max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Set Location</DialogTitle>
          <DialogDescription>
            Search for a place, click or drag on the map, enter coordinates directly, or use your current location.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 px-1">
          <div className="relative">
            <Label htmlFor="loc-search">Search by place name</Label>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="loc-search" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="e.g. Moyale, Marsabit County, Kenya" className="pl-8"
              />
            </div>
            {suggestions.length > 0 && (
              <ul className="absolute z-10 bg-white border rounded-md w-full mt-1 max-h-56 overflow-auto shadow-lg">
                {suggestions.map((s, i) => (
                  <li key={i} className="px-3 py-2 hover:bg-muted/60 cursor-pointer text-sm" onClick={() => applySuggestion(s)}>
                    {s.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={useCurrentLocation} disabled={locating}>
              {locating ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Crosshair className="h-3.5 w-3.5 mr-2" />}
              Use My Current Location
            </Button>
            {(current.latitude !== null || current.longitude !== null) && (
              <Button type="button" variant="ghost" size="sm" onClick={clear}>
                <X className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>
          {locateError && <p className="text-xs" style={{ color: C.red }}>{locateError}</p>}
          <p className="text-xs text-muted-foreground">This is entirely optional — searching by name or entering coordinates works just as well.</p>

          <div className="w-full border rounded-md overflow-hidden bg-muted" style={{ height: '45vh' }}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} className="leaflet-container" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="loc-lat">Latitude</Label>
              <Input
                id="loc-lat" type="number" step="0.000001"
                value={current.latitude ?? ''} onChange={e => handleManualCoord('latitude', e.target.value)}
                placeholder="e.g. 3.522000"
              />
            </div>
            <div>
              <Label htmlFor="loc-lng">Longitude</Label>
              <Input
                id="loc-lng" type="number" step="0.000001"
                value={current.longitude ?? ''} onChange={e => handleManualCoord('longitude', e.target.value)}
                placeholder="e.g. 39.056000"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="loc-name">Location Name</Label>
            <div className="relative mt-1">
              <Input
                id="loc-name" value={current.location_name}
                onChange={e => setCurrent(prev => ({ ...prev, location_name: e.target.value }))}
                placeholder={resolvingName ? 'Resolving name from coordinates...' : 'Resolved automatically, or edit directly'}
              />
              {resolvingName && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { onSave(current); onOpenChange(false); }} style={{ backgroundColor: C.orange }} className="text-white">
            Save Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Inline field for a form: shows the current location (or "not set") with
 * a button that opens the full picker dialog. Drop-in for any Activity or
/** A form field managing MULTIPLE locations (a project can span a head
 * office plus field sites; an activity can run at more than one site) —
 * shows the current list with a remove button on each, and an "Add
 * Location" button that opens the same picker dialog used for a single
 * location. Locations are edited locally here; the parent form is
 * responsible for actually persisting additions/removals on save. */
export function LocationListField({ locations, onChange, label = 'Locations' }: {
  locations: LocationValue[]; onChange: (locs: LocationValue[]) => void; label?: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const addLocation = (loc: LocationValue) => {
    if (loc.latitude === null || loc.longitude === null) return; // guard against saving an empty picker
    onChange([...locations, loc]);
  };
  const removeLocation = (index: number) => {
    onChange(locations.filter((_, i) => i !== index));
  };

  return (
    <div>
      <Label>{label} <span className="text-muted-foreground font-normal">(optional — add as many as apply)</span></Label>
      <div className="space-y-2 mt-1">
        {locations.length === 0 && (
          <p className="text-sm text-muted-foreground">No locations added yet.</p>
        )}
        {locations.map((loc, i) => (
          <div key={i} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <MapPin className="h-4 w-4 shrink-0" style={{ color: C.orange }} />
            <span className="flex-1 truncate">
              {loc.location_name || `${loc.latitude?.toFixed(4)}, ${loc.longitude?.toFixed(4)}`}
            </span>
            <button type="button" onClick={() => removeLocation(i)} aria-label={`Remove ${loc.location_name || 'this location'}`} className="shrink-0 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-2" /> Add Location
        </Button>
      </div>
      <LocationPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} value={EMPTY} onSave={addLocation} />
    </div>
  );
}