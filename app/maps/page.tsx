'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  MapPin,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
  Compass,
  Maximize2
} from 'lucide-react';
import { CadastralParcel } from '@/types';
import 'leaflet/dist/leaflet.css';

export default function MapsPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletInstance = useRef<any>(null);

  const [parcels, setParcels] = useState<CadastralParcel[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<CadastralParcel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadParcels() {
      try {
        const res = await fetch('/api/parcels');
        const json = await res.json();
        if (json.success) {
          setParcels(json.data);
          if (json.data.length > 0) {
            setSelectedParcel(json.data[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load parcels', err);
      } finally {
        setLoading(false);
      }
    }
    loadParcels();
  }, []);

  // Initialize Leaflet Map dynamically on client
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current || parcels.length === 0) return;

    let isMounted = true;

    async function initMap() {
      const L = (await import('leaflet')).default;

      // Clean up previous instance
      if (leafletInstance.current) {
        leafletInstance.current.remove();
      }

      // Center around Madurai Kovilur parcel cluster
      const map = L.map(mapRef.current!).setView([9.9625, 78.1278], 16);
      leafletInstance.current = map;

      // Standard OSM tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      // Add Cadastral Polygons
      parcels.forEach((parcel) => {
        const isSelected = selectedParcel?.id === parcel.id;
        const color = parcel.status === 'VERIFIED' ? '#10B981' : parcel.status === 'PENDING' ? '#F59E0B' : '#EF4444';

        const polygon = L.polygon(parcel.coordinates, {
          color,
          fillColor: color,
          fillOpacity: isSelected ? 0.6 : 0.35,
          weight: isSelected ? 3 : 2
        }).addTo(map);

        polygon.on('click', () => {
          setSelectedParcel(parcel);
        });

        polygon.bindTooltip(`Survey ${parcel.surveyNumber}/${parcel.subdivision} (${parcel.ownerName})`, {
          permanent: false,
          direction: 'center'
        });
      });
    }

    initMap();

    return () => {
      if (leafletInstance.current) {
        leafletInstance.current.remove();
        leafletInstance.current = null;
      }
    };
  }, [parcels]);

  // Center map on selected parcel
  useEffect(() => {
    if (leafletInstance.current && selectedParcel) {
      leafletInstance.current.flyTo(selectedParcel.center, 16, { duration: 1 });
    }
  }, [selectedParcel]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase();
    const match = parcels.find(
      p => p.surveyNumber.toLowerCase().includes(q) ||
           p.ulpin.toLowerCase().includes(q) ||
           p.ownerName.toLowerCase().includes(q) ||
           p.village.toLowerCase().includes(q)
    );
    if (match) {
      setSelectedParcel(match);
    } else {
      alert(`No parcel found matching "${searchQuery}". Try "145", "Kovilur", or "Ramesh".`);
    }
  };

  return (
    <AppLayout
      title="Cadastral GIS Spatial Map & Bhu-Aadhaar (ULPIN) Layer"
      subtitle="Interactive PostGIS polygon boundaries linked with digitized Survey numbers and Record of Rights"
      requiredPermission="GIS_VIEW"
    >
      {/* Demonstration Cadastral Banner */}
      <div className="p-3 bg-slate-900 text-white rounded-lg text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="font-bold text-slate-200">Demonstration Cadastral Layer (PostGIS EPSG:4326)</span>
          <span className="text-slate-400">• OpenStreetMap base layer with GeoJSON parcel overlay</span>
        </div>
        <div className="text-[11px] text-slate-400">
          Showing <strong>{parcels.length}</strong> active cadastral parcels
        </div>
      </div>

      {/* Main Layout: Map (Left) & Parcel Attributes Side Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 8 Cols: Map View */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-col">
          <form onSubmit={handleSearch} className="mb-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Locate Parcel by Survey No (e.g. 145), ULPIN, or Owner..."
                className="w-full bg-slate-50 border border-slate-300 rounded pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold shadow-xs transition w-full sm:w-auto"
            >
              Locate Parcel
            </button>
          </form>

          {/* Leaflet Map DOM Element */}
          <div
            ref={mapRef}
            className="w-full h-[360px] sm:h-[450px] lg:h-[540px] rounded border border-slate-300 overflow-hidden relative z-10"
          >
            {loading && (
              <div className="absolute inset-0 bg-slate-100 flex items-center justify-center text-xs text-slate-500">
                Loading cadastral vector geometry...
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block"></span> Verified & Registered
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block"></span> Pending Review / Area Check
              </span>
            </div>
            <span>Coordinates: WGS84 Datum</span>
          </div>
        </div>

        {/* Right 4 Cols: Selected Parcel Attribute Inspector */}
        <div className="lg:col-span-4 space-y-4">
          {selectedParcel ? (
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-700 font-mono">
                    PARCEL ID: {selectedParcel.id}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                    selectedParcel.status === 'VERIFIED'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}>
                    {selectedParcel.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  Survey #{selectedParcel.surveyNumber}/{selectedParcel.subdivision}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedParcel.village}, {selectedParcel.taluk}, {selectedParcel.district}
                </p>
              </div>

              {/* Bhu-Aadhaar Card */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-md">
                <div className="text-[10px] font-bold uppercase text-indigo-900 tracking-wider">
                  Unique Land Parcel Identifier (ULPIN)
                </div>
                <div className="text-sm font-mono font-bold text-indigo-950 mt-0.5">
                  {selectedParcel.ulpin}
                </div>
                <div className="text-[10px] text-indigo-700 mt-1">
                  14-digit standardized national Bhu-Aadhaar spatial code
                </div>
              </div>

              {/* Attributes List */}
              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Registered Owner:</span>
                  <span className="font-semibold text-slate-900 text-right">{selectedParcel.ownerName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Cadastral GIS Area:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedParcel.gisArea} {selectedParcel.gisUnit}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Land Classification:</span>
                  <span className="text-slate-900 font-medium">{selectedParcel.classification}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Centroid Lat / Lng:</span>
                  <span className="font-mono text-[11px] text-slate-700">{selectedParcel.center[0].toFixed(4)}° N, {selectedParcel.center[1].toFixed(4)}° E</span>
                </div>
              </div>

              {/* Deep Link to Associated Record */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    const record = parcels.find(p => p.id === selectedParcel.id);
                    if (record) {
                      window.location.href = `/records?search=${selectedParcel.surveyNumber}`;
                    }
                  }}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs shadow-xs transition"
                >
                  View Associated Land Record
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-500 text-xs">
              Select a parcel polygon on the map to inspect ownership and spatial metrics.
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
