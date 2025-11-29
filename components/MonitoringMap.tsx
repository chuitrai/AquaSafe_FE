
import React, { useEffect, useRef, useState } from 'react';

// Declare global Leaflet type to avoid TS errors without installing types
declare global {
  interface Window {
    L: any;
  }
}

export const MonitoringMap = ({ zones, selectedZoneId, onZoneSelect }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const overlayRef = useRef(null);
  const markersRef = useRef({});
  const [isInteracting, setIsInteracting] = useState(false);

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
    // Coordinates representing the bounds of our "TFW" file (approx HCMC area)
    const imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Red_hot_heatmap.png/640px-Red_hot_heatmap.png'; // Placeholder heatmap
    const imageBounds = [[10.68, 106.55], [10.88, 106.80]];
    
    // Create overlay but don't set opacity yet
    const overlay = L.imageOverlay(imageUrl, imageBounds, {
      opacity: 0.2, // Default target opacity
      interactive: false
    }).addTo(map);
    
    overlayRef.current = overlay;

    // 5. Add Event Listeners for Lazy Rendering
    const handleInteractionStart = () => {
      setIsInteracting(true);
      if (overlayRef.current) {
        overlayRef.current.setOpacity(0); // Hide during interaction
      }
    };

    const handleInteractionEnd = () => {
      setIsInteracting(false);
      // Simulate "processing" delay or just render when idle
      setTimeout(() => {
        if (overlayRef.current) {
            overlayRef.current.setOpacity(0.2); // Restore opacity when idle
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

  // Handle Markers (Zones)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const L = window.L;

    // Clear existing markers if zones change drastically (naive approach)
    // For better performance we would update positions, but creating/removing is fine for small count.
    Object.values(markersRef.current).forEach((marker: any) => marker.remove());
    markersRef.current = {};

    zones.forEach(zone => {
      // Map percentage coordinates (from mock) to Lat/Lng (approx HCMC)
      // Mock logic: 50% x, 50% y is center. Spread is approx 0.15 degrees.
      const centerLat = 10.762622;
      const centerLng = 106.660172;
      const lat = centerLat - ((zone.y - 50) / 100) * 0.15;
      const lng = centerLng + ((zone.x - 50) / 100) * 0.2;

      // Determine color based on severity
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
        className: 'custom-div-icon', // defined in index.html
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([lat, lng], { icon: icon }).addTo(map);
      
      // Click handler
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onZoneSelect(zone.id);
      });

      // Bind Popup (Custom Tooltip)
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

  }, [zones, selectedZoneId, onZoneSelect]);

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

        {/* Weather Widget - Floating Top Left */}
        <div className="absolute left-4 top-4 group z-[1000]">
            <button className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm transition hover:bg-white text-primary ring-1 ring-black/5">
                <span className="material-symbols-outlined !text-[28px]">partly_cloudy_day</span>
            </button>
            
            {/* Expandable Panel */}
            <div className="absolute left-0 top-0 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 group-hover:translate-x-14 pt-0">
                <div className="flex w-72 flex-col gap-3 rounded-xl bg-white/95 p-4 text-gray-800 shadow-xl backdrop-blur-sm ring-1 ring-black/5">
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
                    
                    <div className="grid grid-cols-3 gap-2 text-xs mt-1">
                        <div className="flex flex-col items-center gap-1 text-center p-2 bg-blue-50 rounded-lg">
                            <span className="material-symbols-outlined text-blue-500 !text-[18px]">water_drop</span>
                            <p className="font-medium text-gray-600">Độ ẩm</p>
                            <p className="font-bold text-gray-800">85%</p>
                        </div>
                        <div className="flex flex-col items-center gap-1 text-center p-2 bg-gray-50 rounded-lg">
                            <span className="material-symbols-outlined text-gray-500 !text-[18px]">air</span>
                            <p className="font-medium text-gray-600">Gió</p>
                            <p className="font-bold text-gray-800">15 km/h</p>
                        </div>
                        <div className="flex flex-col items-center gap-1 text-center p-2 bg-blue-50 rounded-lg">
                            <span className="material-symbols-outlined text-blue-500 !text-[18px]">umbrella</span>
                            <p className="font-medium text-gray-600">Mưa</p>
                            <p className="font-bold text-gray-800">5 mm</p>
                        </div>
                    </div>
                    <hr className="border-gray-200 my-1"/>
                    <div>
                        <p className="mb-3 text-xs font-bold text-gray-700 uppercase tracking-wide">Dự báo mưa (6h tới)</p>
                        <div className="flex justify-between items-end gap-2 text-center text-[10px] text-gray-500 h-20">
                            {[
                                { time: '11:00', h: '30%', o: 'bg-blue-500/20' },
                                { time: '12:00', h: '50%', o: 'bg-blue-500/40' },
                                { time: '13:00', h: '70%', o: 'bg-blue-500/70' },
                                { time: '14:00', h: '40%', o: 'bg-blue-500/50' },
                                { time: '15:00', h: '20%', o: 'bg-blue-500/20' },
                                { time: '16:00', h: '10%', o: 'bg-blue-500/10' },
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col items-center gap-1 w-full h-full justify-end">
                                    <div className={`w-full rounded-t-sm ${item.o}`} style={{ height: item.h }}></div>
                                    <p>{item.time}</p>
                                </div>
                            ))}
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
            <button onClick={handleLocate} className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 shadow-lg backdrop-blur-sm hover:bg-gray-100 ring-1 ring-black/5 transition-colors">
                <span className="material-symbols-outlined text-gray-700 !text-[20px]">my_location</span>
            </button>
        </div>
    </div>
  );
};
