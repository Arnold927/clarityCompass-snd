'use client';

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export interface Location {
  id?: string;
  name: string;
  lat?: number;
  lon?: number;
}

interface LocationEditorProps {
  location: Location | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (location: Location) => void | Promise<void>;
}

const defaultLocation: Location = { name: "", lat: -1.286389, lon: 36.817223 };

export function LocationEditor({ location, isOpen, onClose, onSave }: LocationEditorProps) {
  const [currentLocation, setCurrentLocation] = useState<Location>(location || defaultLocation);
  const [search, setSearch] = useState(location?.name || "");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapInitializedRef = useRef(false);

  useEffect(() => {
    setCurrentLocation(location || defaultLocation);
    setSearch(location?.name || "");
    setSuggestions([]);
  }, [location, isOpen]);

  useEffect(() => {
    if (!isOpen || !mapContainerRef.current || currentLocation.lat === undefined || currentLocation.lon === undefined) {
      return;
    }

    if (mapInitializedRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.setView([currentLocation.lat, currentLocation.lon], 13);
      if (markerRef.current) {
        markerRef.current.setLatLng([currentLocation.lat, currentLocation.lon]);
      }
      return;
    }

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const initMap = () => {
      if (!mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [currentLocation.lat!, currentLocation.lon!],
        zoom: 13,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([currentLocation.lat!, currentLocation.lon!], { draggable: true }).addTo(map);

      marker.bindPopup(
        `<div class="text-sm"><p class="font-semibold">${currentLocation.name || "Location"}</p>
         <p>Lat: ${currentLocation.lat!.toFixed(6)}</p>
         <p>Lon: ${currentLocation.lon!.toFixed(6)}</p></div>`
      );

      marker.on("dragend", () => {
        const latlng = marker.getLatLng();
        setCurrentLocation(prev => ({ ...prev, lat: latlng.lat, lon: latlng.lng }));
      });

      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setCurrentLocation(prev => ({ ...prev, lat, lon: lng }));
        marker.setLatLng([lat, lng]);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
      mapInitializedRef.current = true;

      setTimeout(() => map.invalidateSize(), 200);
    };

    requestAnimationFrame(initMap);
  }, [isOpen, currentLocation.lat, currentLocation.lon, currentLocation.name]);

  useEffect(() => {
    if (markerRef.current && currentLocation.lat !== undefined && currentLocation.lon !== undefined) {
      markerRef.current.setLatLng([currentLocation.lat, currentLocation.lon]);
      markerRef.current.setPopupContent(
        `<div class="text-sm"><p class="font-semibold">${currentLocation.name || "Location"}</p>
         <p>Lat: ${currentLocation.lat!.toFixed(6)}</p>
         <p>Lon: ${currentLocation.lon!.toFixed(6)}</p></div>`
      );
    }
  }, [currentLocation.lat, currentLocation.lon, currentLocation.name]);

  const handleChange = (field: keyof Location, value: string | number) => {
    setCurrentLocation(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (!search) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const fetchSuggestions = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(search)}&format=json&addressdetails=1&limit=5`,
          { signal: controller.signal }
        );
        const data = await res.json();
        const newSuggestions: Location[] = data.map((item: any) => ({
          name: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
        }));
        setSuggestions(newSuggestions);
      } catch (err) {
        if ((err as any).name !== "AbortError") console.error(err);
      }
    };

    const timeout = setTimeout(fetchSuggestions, 300);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [search]);

  const applySuggestion = (suggestion: Location) => {
    setCurrentLocation(suggestion);
    setSearch(suggestion.name || "");
    setSuggestions([]);
    if (mapInstanceRef.current && suggestion.lat !== undefined && suggestion.lon !== undefined) {
      mapInstanceRef.current.setView([suggestion.lat, suggestion.lon], 13);
      markerRef.current?.setLatLng([suggestion.lat, suggestion.lon]);
    }
  };

  const handleSearchButton = async () => {
    if (suggestions.length > 0) {
      applySuggestion(suggestions[0]);
    }
  };

  const handleSave = () => {
    if (!currentLocation.name || currentLocation.lat === undefined || currentLocation.lon === undefined) {
      alert("Please provide a name and select a position on the map.");
      return;
    }
    onSave(currentLocation);
  };

  const handleClose = () => {
    mapInitializedRef.current = false;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    markerRef.current = null;
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl w-full max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{location?.id ? "Edit Location" : "Add New Location"}</DialogTitle>
          <DialogDescription>
            {location ? "Edit the location or adjust it on the map." : "Enter a location name or click on the map to select a location."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-4 py-4 px-4">
            {/* Location Search */}
            <div className="space-y-2 relative">
              <Label htmlFor="name">Location Name</Label>
              <div className="flex gap-2">
                <Input
                  id="name"
                  placeholder="Type location name..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearchButton()}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleSearchButton} disabled={loadingSearch}>
                  {loadingSearch ? "Searching..." : "Search"}
                </Button>
              </div>
              {/* Suggestions dropdown */}
              {suggestions.length > 0 && (
                <ul className="absolute z-10 bg-white border rounded-md w-full mt-1 max-h-60 overflow-auto shadow-md">
                  {suggestions.map((sugg, i) => (
                    <li
                      key={i}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                      onClick={() => applySuggestion(sugg)}
                    >
                      {sugg.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Map */}
            {currentLocation.lat !== undefined && currentLocation.lon !== undefined && (
              <div className="w-full border rounded-md overflow-hidden bg-gray-100" style={{ height: "60vh" }}>
                <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} className="leaflet-container" />
              </div>
            )}

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lat">Latitude</Label>
                <Input
                  id="lat"
                  type="number"
                  step="0.000001"
                  value={currentLocation.lat ?? ""}
                  onChange={e => handleChange("lat", parseFloat(e.target.value))}
                  placeholder="Latitude"
                />
              </div>
              <div>
                <Label htmlFor="lon">Longitude</Label>
                <Input
                  id="lon"
                  type="number"
                  step="0.000001"
                  value={currentLocation.lon ?? ""}
                  onChange={e => handleChange("lon", parseFloat(e.target.value))}
                  placeholder="Longitude"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-end space-x-2 px-4 py-4 border-t">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!currentLocation.name}>Save Location</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
