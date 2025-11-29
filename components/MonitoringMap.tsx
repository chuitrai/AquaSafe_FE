import React, { useEffect, useRef, useState } from 'react';

// Declare global Leaflet type to avoid TS errors without installing types
declare global {
  interface Window {
    L: any;
  }
}

// API Configuration
const API_BASE_URL = "http://localhost:8220/api";

export const MonitoringMap = ({ zones, selectedZoneId, onZoneSelect }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const overlayRef = useRef(null);
  const markersRef = useRef({});
  const selectionRectRef = useRef(null); // Ref for the rectangle layer
  const borderLayersRef = useRef([]); // Ref to store drawn API border layers
  
  const [isInteracting, setIsInteracting] = useState(false);
  const [isLoadingBorders, setIsLoadingBorders] = useState(false);
  
  // Selection Tool State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectionCoords, setSelectionCoords] = useState(null);
  const isDrawingRef = useRef(false);
  const startLatLngRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const L = window.L;

    // 1. Create Map Instance centered on Ho Chi Minh City
    const map = L.map(mapContainerRef.current, {
      zoomControl: false, // We use custom buttons
      attributionControl: false
    }).setView([10.762622, 106.660172], 12);

    mapInstanceRef.current = map;

    // 2. Add OpenStreetMap Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // 3. Add Attribution (Clean look)
    L.control.attribution({
      position: 'bottomright',
      prefix: 'OSM'
    }).addTo(map);

    // 4. Implement "Lazy Render" Overlay for TFT/TFW simulation
    const imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Red_hot_heatmap.png/640px-Red_hot_heatmap.png'; 
    const imageBounds = [[10.68, 106.55], [10.88, 106.80]];
    
    const overlay = L.imageOverlay(imageUrl, imageBounds, {
      opacity: 0.2, 
      interactive: false
    }).addTo(map);
    
    overlayRef.current = overlay;

    // 5. Add Event Listeners for Lazy Rendering
    const handleInteractionStart = () => {
      // Only hide overlay if we are NOT selecting (to keep context while drawing)
      if (!isDrawingRef.current) {
        setIsInteracting(true);
        if (overlayRef.current) {
          overlayRef.current.setOpacity(0); 
        }
      }
    };

    const handleInteractionEnd = () => {
      setIsInteracting(false);
      setTimeout(() => {
        if (overlayRef.current) {
            overlayRef.current.setOpacity(0.2); 
        }
      }, 100);
    };

    map.on('movestart', handleInteractionStart);
    map.on('zoomstart', handleInteractionStart);
    map.on('moveend', handleInteractionEnd);
    map.on('zoomend', handleInteractionEnd);

    // Cleanup
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Function to fetch and draw borders based on bounds
  const fetchAndDrawBorders = async (bounds) => {
    const L = window.L;
    const map = mapInstanceRef.current;
    if (!map) return;

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

        // 1. Call API to get IDs
        const res = await fetch(`${API_BASE_URL}/admin/selected-area`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await res.json();

        if (json.success && json.data.wards) {
            // 2. Loop through IDs and fetch details for each
            const fetchPromises = json.data.wards.map(async (ward) => {
                try {
                    const detailRes = await fetch(`${API_BASE_URL}/admin/get-board/${ward.id}`);
                    const detailJson = await detailRes.json();
                    
                    if (detailJson.success && detailJson.data.members) {
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
                } catch (err) {
                    console.error(`Failed to fetch details for ward ${ward.id}`, err);
                }
            });

            await Promise.all(fetchPromises);
            console.log("Finished drawing borders");
        }
    } catch (error) {
        console.error("Error fetching borders:", error);
    } finally {
        setIsLoadingBorders(false);
    }
  };

  // Handle Selection Mode Logic
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const L = window.L;

    if (isSelectionMode) {
      map.dragging.disable(); // Disable panning while selecting
      map.getContainer().style.cursor = 'crosshair';
    } else {
      map.dragging.enable();
      map.getContainer().style.cursor = '';
      isDrawingRef.current = false;
      startLatLngRef.current = null;
    }

    const onMouseDown = (e) => {
      if (!isSelectionMode) return;
      
      // Right click or other buttons should not trigger
      if (e.originalEvent.button !== 0) return;

      isDrawingRef.current = true;
      startLatLngRef.current = e.latlng;

      // Remove previous rectangle if exists
      if (selectionRectRef.current) {
        selectionRectRef.current.remove();
        selectionRectRef.current = null;
        setSelectionCoords(null);
      }

      // Create new rectangle with zero size initially
      const bounds = L.latLngBounds(e.latlng, e.latlng);
      selectionRectRef.current = L.rectangle(bounds, {
        color: "#0077C2", 
        weight: 2,
        fillColor: "#0077C2",
        fillOpacity: 0.2,
        dashArray: '5, 5'
      }).addTo(map);
    };

    const onMouseMove = (e) => {
      if (!isSelectionMode || !isDrawingRef.current || !startLatLngRef.current) return;

      const currentLatLng = e.latlng;
      const bounds = L.latLngBounds(startLatLngRef.current, currentLatLng);
      
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

        // Trigger API Call
        fetchAndDrawBorders(bounds);
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
    const L = window.L;

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
        // If selecting, don't trigger marker click
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
        mapInstanceRef.current.setView([10.762622, 106.660172], 14);
     }
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-gray-200">
        {/* Leaflet Map Container */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Loading Indicator for Lazy Render */}
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-md text-xs font-bold text-primary flex items-center gap-2 transition-opacity duration-300 z-[1000] pointer-events-none ${isInteracting ? 'opacity-0' : 'opacity-100'}`}>
            <span className="material-symbols-outlined !text-[16px] animate-spin">sync</span>
            Rendering Flood Layer (TFT/TFW)
        </div>
        
        {/* Loading Indicator for API */}
        {isLoadingBorders && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-600/90 text-white backdrop-blur px-4 py-2 rounded-full shadow-md text-xs font-bold flex items-center gap-2 z-[1000] pointer-events-none animate-bounce">
                <span className="material-symbols-outlined !text-[16px] animate-spin">downloading</span>
                Loading Boarders...
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
                    // Clear rectangle
                    if(selectionRectRef.current) {
                      selectionRectRef.current.remove();
                      selectionRectRef.current = null;
                    }
                    // Clear borders
                    borderLayersRef.current.forEach(layer => layer.remove());
                    borderLayersRef.current = [];
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

        {/* Weather Widget */}
        <div className="absolute left-4 top-4 group z-[1000]">
            <button className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm transition hover:bg-white text-primary ring-1 ring-black/5">
                <span className="material-symbols-outlined !text-[28px]">partly_cloudy_day</span>
            </button>
            <div className="absolute left-0 top-0 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 group-hover:translate-x-14 pt-0">
                <div className="flex w-72 flex-col gap-3 rounded-xl bg-white/95 p-4 text-gray-800 shadow-xl backdrop-blur-sm ring-1 ring-black/5">
                    {/* ... Weather content same as before ... */}
                     <div className="flex items-start justify-between">
                        <div>
                            <p className="font-bold text-lg leading-tight">Quận 7, TP.HCM</p>
                            <p className="text-xs text-gray-500 mt-1">Thứ Hai, 10:00</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-500 !text-[32px]">cloudy</span>
                            <p className="text-3xl font-bold text-gray-800">28°C</p>
                        </div>
                    </div>
                    {/* Simplified for brevity in this update, keeping layout intact */}
                     <div className="grid grid-cols-3 gap-2 text-xs mt-1">
                        <div className="flex flex-col items-center gap-1 text-center p-2 bg-blue-50 rounded-lg">
                            <span className="material-symbols-outlined text-blue-500 !text-[18px]">water_drop</span>
                            <p className="font-bold text-gray-800">85%</p>
                        </div>
                        <div className="flex flex-col items-center gap-1 text-center p-2 bg-gray-50 rounded-lg">
                            <span className="material-symbols-outlined text-gray-500 !text-[18px]">air</span>
                            <p className="font-bold text-gray-800">15km/h</p>
                        </div>
                        <div className="flex flex-col items-center gap-1 text-center p-2 bg-blue-50 rounded-lg">
                            <span className="material-symbols-outlined text-blue-500 !text-[18px]">umbrella</span>
                            <p className="font-bold text-gray-800">5mm</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Map Controls - Top Right */}
        <div className="absolute right-4 top-4 flex flex-col items-end gap-2 z-[1000]">
            <div className="flex flex-col rounded-lg bg-white/90 shadow-lg backdrop-blur-sm ring-1 ring-black/5 overflow-hidden">
                <button onClick={() => handleZoom('in')} className="flex h-10 w-10 items-center justify-center hover:bg-gray-100 border-b border-gray-200 transition-colors">
                    <span className="material-symbols-outlined text-gray-700 !text-[20px]">add</span>
                </button>
                <button onClick={() => handleZoom('out')} className="flex h-10 w-10 items-center justify-center hover:bg-gray-100 transition-colors">
                    <span className="material-symbols-outlined text-gray-700 !text-[20px]">remove</span>
                </button>
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