import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import FloodDepthOverlay from './FloodDepthOverlay';

// API Configuration
const API_BASE_URL = "http://localhost:8220/api";

export const FloodMonitoringMap = ({ zones, selectedZoneId, onZoneSelect, onStatsUpdate }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const selectionRectRef = useRef(null);
  const borderLayersRef = useRef([]);
  const abortControllerRef = useRef(null);

  const [isInteracting, setIsInteracting] = useState(false);
  const [isLoadingBorders, setIsLoadingBorders] = useState(false);
  const [showFloodOverlay, setShowFloodOverlay] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(0.7);
  
  // Selection Tool State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectionCoords, setSelectionCoords] = useState(null);
  const isDrawingRef = useRef(false);
  const startLatLngRef = useRef(null);

  // Initialize Map - Focus on Ho Chi Minh City
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Create Map Instance centered on Ho Chi Minh City
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([10.762622, 106.660172], 12);

    mapInstanceRef.current = map;

    // Add OpenStreetMap Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Add Attribution
    L.control.attribution({
      position: 'bottomright',
      prefix: 'OSM'
    }).addTo(map);

    // Cleanup
    return () => {
      if (map) {
        map.remove();
      }
      mapInstanceRef.current = null;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Function to fetch and draw borders based on bounds
  const fetchAndDrawBorders = async (bounds) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    setIsLoadingBorders(true);
    
    try {
        // Clear previous border layers
        borderLayersRef.current.forEach(layer => layer.remove());
        borderLayersRef.current = [];

        // Prepare payload
        const payload = {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
        };

        // Call API to get ward IDs
        const res = await fetch(`${API_BASE_URL}/admin/selected-area`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal
        });
        const json = await res.json();

        if (json.success && json.data.wards) {
            // Fetch details for each ward
            const fetchPromises = json.data.wards.map(async (ward) => {
                try {
                    const detailRes = await fetch(`${API_BASE_URL}/admin/get-board/${ward.id}`, { signal });
                    const detailJson = await detailRes.json();
                    
                    if (detailJson.success && detailJson.data) {
                        // Draw Polygon borders
                        if (detailJson.data.members) {
                            detailJson.data.members.forEach((m) => {
                                if (m.geometry && m.geometry.length > 1) {
                                    const latlngs = m.geometry.map((p) => [p.lat, p.lon]);
                                    const polyline = L.polyline(latlngs, {
                                        color: "red",
                                        weight: 2
                                    }).addTo(map);
                                    borderLayersRef.current.push(polyline);
                                }
                            });
                        }
                        
                        // Extract Population
                        let pop = 0;
                        if (detailJson.data.tags && detailJson.data.tags.population) {
                            const rawPop = detailJson.data.tags.population.toString().replace(/,/g, '');
                            pop = parseInt(rawPop, 10);
                            if (isNaN(pop)) pop = 0;
                        }

                        // Extract Flood Depth
                        let depth = 0;
                        if (detailJson.data.tags && detailJson.data.tags.flood_depth) {
                            depth = parseFloat(detailJson.data.tags.flood_depth);
                            if (isNaN(depth)) depth = 0;
                        }

                        return { pop, depth };
                    }
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        console.error(`Failed to fetch details for ward ${ward.id}`, err);
                    }
                }
                return { pop: 0, depth: 0 };
            });

            // Calculate statistics
            const results = await Promise.all(fetchPromises);
            const totalPopulation = results.reduce((sum, current) => sum + current.pop, 0);
            const totalFloodDepth = results.reduce((sum, current) => sum + current.depth, 0);
            const validDepthsCount = results.filter(r => r.depth > 0).length;
            const denominator = validDepthsCount > 0 ? validDepthsCount : (results.length > 0 ? results.length : 1);
            const avgFloodDepth = (totalFloodDepth / denominator).toFixed(2);

            // Update Stats
            if (onStatsUpdate) {
                onStatsUpdate({
                    population: totalPopulation,
                    avgFloodLevel: avgFloodDepth, 
                    food: (totalPopulation * 0.05 / 1000).toFixed(1),
                    workers: Math.floor(totalPopulation / 500) + 20
                });
            }

            console.log("Finished drawing borders and calculating stats");
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log("Previous API call cancelled");
        } else {
            console.error("Error fetching borders:", error);
        }
    } finally {
        if (abortControllerRef.current === controller) {
            setIsLoadingBorders(false);
            abortControllerRef.current = null;
        }
    }
  };

  // Handle Selection Mode Logic
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (isSelectionMode) {
      map.dragging.disable();
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.dragging.enable();
      map.getContainer().style.cursor = '';
      isDrawingRef.current = false;
      startLatLngRef.current = null;
    }

    const onMouseDown = (e) => {
      if (!isSelectionMode || e.originalEvent.button !== 0) return;
      
      isDrawingRef.current = true;
      startLatLngRef.current = e.latlng;

      if (selectionRectRef.current) {
        selectionRectRef.current.remove();
        selectionRectRef.current = null;
        setSelectionCoords(null);
      }

      const bounds = L.latLngBounds(e.latlng, e.latlng);
      selectionRectRef.current = L.rectangle(bounds, {
        color: "#c20000ff", 
        weight: 2,
        fillColor: "#c25100ff",
        fillOpacity: 0.2,
        dashArray: '5, 5'
      }).addTo(map);
    };

    const onMouseMove = (e) => {
      if (!isSelectionMode || !isDrawingRef.current || !startLatLngRef.current) return;

      const bounds = L.latLngBounds(startLatLngRef.current, e.latlng);
      if (selectionRectRef.current) {
        selectionRectRef.current.setBounds(bounds);
      }
    };

    const onMouseUp = (e) => {
      if (!isSelectionMode || !isDrawingRef.current) return;

      isDrawingRef.current = false;
      
      if (selectionRectRef.current) {
        const bounds = selectionRectRef.current.getBounds();
        const northWest = bounds.getNorthWest();
        const southEast = bounds.getSouthEast();

        setSelectionCoords({
          nw: { lat: northWest.lat.toFixed(5), lng: northWest.lng.toFixed(5) },
          se: { lat: southEast.lat.toFixed(5), lng: southEast.lng.toFixed(5) }
        });

        fetchAndDrawBorders(bounds);
        setIsSelectionMode(false);
      }
    };

    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);

    return () => {
      map.off('mousedown', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
    };
  }, [isSelectionMode]);

  // Handle Markers (Zones)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker: any) => marker.remove());
    markersRef.current = {};

    zones.forEach(zone => {
      const centerLat = 10.762622;
      const centerLng = 106.660172;
      const lat = centerLat - ((zone.y - 50) / 100) * 0.15;
      const lng = centerLng + ((zone.x - 50) / 100) * 0.2;

      let colorClass = 'bg-blue-500';
      let ringClass = 'ring-blue-500';
      if (zone.severity === 'critical') { colorClass = 'bg-red-600'; ringClass = 'ring-red-600'; }
      else if (zone.severity === 'high') { colorClass = 'bg-orange-500'; ringClass = 'ring-orange-500'; }
      else if (zone.severity === 'medium') { colorClass = 'bg-yellow-500'; ringClass = 'ring-yellow-500'; }

      const isSelected = selectedZoneId === zone.id;
      const size = isSelected ? 'w-6 h-6' : 'w-4 h-4';
      const ring = isSelected ? `ring-4 ${ringClass} ring-opacity-30` : 'border-2 border-white shadow-lg';
      
      const html = `
        <div class="relative flex items-center justify-center">
            ${(zone.severity === 'critical' || zone.severity === 'high' || isSelected) ? 
                `<div class="absolute w-full h-full rounded-full animate-ping opacity-75 ${colorClass}"></div>` : ''}
            <div class="relative ${size} rounded-full transition-all duration-300 ${colorClass} ${ring}"></div>
        </div>
      `;

      const icon = L.divIcon({
        html: html,
        className: 'custom-div-icon', 
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([lat, lng], { icon: icon }).addTo(map);
      
      marker.on('click', (e) => {
        if (isSelectionMode) return;
        L.DomEvent.stopPropagation(e);
        onZoneSelect(zone.id);
      });

      const popupContent = `
        <div class="min-w-[200px] font-sans">
            <div class="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                <span class="font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                  zone.severity === 'critical' ? 'bg-red-100 text-red-700' :
                  zone.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                  zone.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                }">${zone.severity}</span>
                <span class="text-gray-400 text-[10px]">${zone.updated}</span>
            </div>
            <p class="font-bold text-gray-800 text-sm mb-1">${zone.location}</p>
            <p class="text-gray-500 text-xs mb-2">${zone.district}</p>
            <div class="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span class="text-gray-600 text-xs">Mực nước:</span>
                <span class="font-bold text-primary text-sm">${zone.level}m</span>
            </div>
        </div>
      `;
      
      marker.bindPopup(popupContent, {
        closeButton: false,
        offset: [0, -10],
        className: 'custom-popup'
      });

      if (isSelected) {
        marker.openPopup();
      }

      markersRef.current[zone.id] = marker;
    });

  }, [zones, selectedZoneId, onZoneSelect, isSelectionMode]);

  // Handle Zoom Controls
  const handleZoom = (type) => {
    if (mapInstanceRef.current) {
      if (type === 'in') mapInstanceRef.current.zoomIn();
      else mapInstanceRef.current.zoomOut();
    }
  };

  const handleLocate = () => {
     if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([10.762622, 106.660172], 12);
     }
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-gray-200">
        {/* Leaflet Map Container */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Flood Depth Overlay Component */}
        <FloodDepthOverlay 
          map={mapInstanceRef.current} 
          isVisible={showFloodOverlay}
          opacity={overlayOpacity}
        />
        
        {/* Loading Indicator for API */}
        {isLoadingBorders && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-600/90 text-white backdrop-blur px-4 py-2 rounded-full shadow-md text-xs font-bold flex items-center gap-2 z-[1000] pointer-events-none animate-bounce">
                <span className="material-symbols-outlined !text-[16px] animate-spin">downloading</span>
                Loading Borders...
            </div>
        )}

        {/* Coordinates Display (Selection Result) */}
        {selectionCoords && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur shadow-xl rounded-lg p-3 border border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-300">
             <div className="flex items-center gap-2 mb-2 border-b border-gray-100 pb-2">
                <span className="material-symbols-outlined text-primary">area_chart</span>
                <span className="font-bold text-gray-800 text-sm">Vùng đã chọn</span>
                <button 
                  onClick={() => {
                    setSelectionCoords(null);
                    if(selectionRectRef.current) {
                      selectionRectRef.current.remove();
                      selectionRectRef.current = null;
                    }
                    borderLayersRef.current.forEach(layer => layer.remove());
                    borderLayersRef.current = [];
                    if (abortControllerRef.current) {
                        abortControllerRef.current.abort();
                    }
                    if (onStatsUpdate) {
                        onStatsUpdate(null);
                    }
                  }}
                  className="ml-auto hover:bg-gray-100 rounded p-0.5 transition-colors"
                >
                  <span className="material-symbols-outlined !text-[16px] text-gray-400">close</span>
                </button>
             </div>
             <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                   <p className="text-gray-500 mb-0.5">Top-Left (NW)</p>
                   <p className="font-bold text-gray-700">{selectionCoords.nw.lat}, {selectionCoords.nw.lng}</p>
                </div>
                <div>
                   <p className="text-gray-500 mb-0.5">Bottom-Right (SE)</p>
                   <p className="font-bold text-gray-700">{selectionCoords.se.lat}, {selectionCoords.se.lng}</p>
                </div>
             </div>
          </div>
        )}

        {/* Map Controls - Top Right */}
        <div className="absolute right-4 top-4 flex flex-col items-end gap-2 z-[1000]">
            {/* Zoom Controls */}
            <div className="flex flex-col rounded-lg bg-white/90 shadow-lg backdrop-blur-sm ring-1 ring-black/5 overflow-hidden">
                <button onClick={() => handleZoom('in')} className="flex h-10 w-10 items-center justify-center hover:bg-gray-100 border-b border-gray-200 transition-colors">
                    <span className="material-symbols-outlined text-gray-700 !text-[20px]">add</span>
                </button>
                <button onClick={() => handleZoom('out')} className="flex h-10 w-10 items-center justify-center hover:bg-gray-100 transition-colors">
                    <span className="material-symbols-outlined text-gray-700 !text-[20px]">remove</span>
                </button>
            </div>
            
            {/* Layer Controls */}
            <div className="flex flex-col rounded-lg bg-white/90 shadow-lg backdrop-blur-sm ring-1 ring-black/5 overflow-hidden">
                {/* Toggle Flood Overlay */}
                <button 
                    onClick={() => setShowFloodOverlay(!showFloodOverlay)}
                    className={`flex h-10 w-10 items-center justify-center transition-colors border-b border-gray-200 ${
                        showFloodOverlay ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                    title="Toggle Flood Layer"
                >
                    <span className="material-symbols-outlined !text-[20px]">water</span>
                </button>
                
                {/* Opacity Control */}
                {showFloodOverlay && (
                    <div className="p-2 w-32 border-b border-gray-200">
                        <input
                            type="range"
                            min="0.1"
                            max="1"
                            step="0.1"
                            value={overlayOpacity}
                            onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none slider"
                            title={`Opacity: ${Math.round(overlayOpacity * 100)}%`}
                        />
                        <div className="text-xs text-gray-500 text-center mt-1">
                            {Math.round(overlayOpacity * 100)}%
                        </div>
                    </div>
                )}
            </div>
            
            {/* Selection Tool Button */}
            <button 
                onClick={() => setIsSelectionMode(!isSelectionMode)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg shadow-lg backdrop-blur-sm ring-1 ring-black/5 transition-all ${
                    isSelectionMode 
                    ? 'bg-primary text-white ring-primary' 
                    : 'bg-white/90 hover:bg-gray-100 text-gray-700'
                }`}
                title="Chọn vùng"
            >
                <span className="material-symbols-outlined !text-[20px]">
                  {isSelectionMode ? 'check_box' : 'select_all'}
                </span>
            </button>

            <button onClick={handleLocate} className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 shadow-lg backdrop-blur-sm hover:bg-gray-100 ring-1 ring-black/5 transition-colors">
                <span className="material-symbols-outlined text-gray-700 !text-[20px]">my_location</span>
            </button>
        </div>
    </div>
  );
};