import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

// API Configuration
const API_BASE_URL = "http://localhost:8220/api";

// Helper to calculate lat/lng from x/y (0-100 relative to center)
const getZoneLatLng = (x, y) => {
  const centerLat = 10.762622;
  const centerLng = 106.660172;
  const lat = centerLat - ((y - 50) / 100) * 0.15;
  const lng = centerLng + ((x - 50) / 100) * 0.2;
  return [lat, lng];
};

// Mock Rescue Teams
const MOCK_RESCUE_TEAMS = [
    { id: 'R1', x: 52, y: 48, name: "Đội CH #01", status: "busy" },
    { id: 'R2', x: 60, y: 38, name: "Đội CH #02", status: "idle" },
    { id: 'R3', x: 45, y: 55, name: "Đội Y Tế #05", status: "busy" },
    { id: 'R4', x: 65, y: 60, name: "Đội Hậu Cần", status: "idle" }
];

export const MonitoringMap = ({ zones, selectedZoneId, onZoneSelect, onStatsUpdate, searchLocation, timeFrame, activeLayers }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const overlayRef = useRef(null);
  const markersRef = useRef({});
  const rescueMarkersRef = useRef([]); // Store rescue team markers
  const selectionRectRef = useRef(null); // Ref for the rectangle layer
  const borderLayersRef = useRef([]); // Ref to store drawn API border layers
  const abortControllerRef = useRef(null); // Ref to manage API cancellation
  const searchMarkerRef = useRef(null); // Ref specifically for the search result pin

  const [isInteracting, setIsInteracting] = useState(false);
  const [isLoadingBorders, setIsLoadingBorders] = useState(false);
  
  // Heatmap State
  const [isLoadingHeatmap, setIsLoadingHeatmap] = useState(false);
  const [heatmapData, setHeatmapData] = useState(null);
  const [heatmapError, setHeatmapError] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.7);
  const heatmapOverlayRef = useRef(null);
  
  // Selection Tool State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectionCoords, setSelectionCoords] = useState(null);
  const isDrawingRef = useRef(false);
  const startLatLngRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

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

    // 4. Wait for map to be fully ready before loading heatmap
    map.whenReady(() => {
        if (!heatmapData) {
            loadFloodHeatmap(map);
        }
    });

    // Cleanup
    return () => {
      map.remove();
      mapInstanceRef.current = null;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Handle FlyTo Zone when selectedZoneId changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedZoneId) return;

    const selectedZone = zones.find(z => z.id === selectedZoneId);
    if (selectedZone) {
        const [lat, lng] = getZoneLatLng(selectedZone.x, selectedZone.y);
        
        // Fly to location
        map.flyTo([lat, lng], 15, {
            animate: true,
            duration: 1.2
        });

        // Open Popup for the specific marker
        const marker = markersRef.current[selectedZoneId];
        if (marker) {
            marker.openPopup();
        }
    }
  }, [selectedZoneId, zones]);

  // Handle Rescue Team Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing rescue markers
    rescueMarkersRef.current.forEach(m => m.remove());
    rescueMarkersRef.current = [];

    if (activeLayers && activeLayers.includes('Đội cứu hộ')) {
        MOCK_RESCUE_TEAMS.forEach(team => {
            const [lat, lng] = getZoneLatLng(team.x, team.y);
            
            const colorClass = team.status === 'busy' ? 'bg-red-500' : 'bg-green-500';
            const iconHtml = `
                <div class="relative flex items-center justify-center">
                    <div class="w-6 h-6 rounded-md shadow-md border-2 border-white ${colorClass} flex items-center justify-center">
                        <span class="material-symbols-outlined !text-[16px] text-white">ambulance</span>
                    </div>
                </div>
            `;

            const icon = L.divIcon({
                html: iconHtml,
                className: 'custom-div-icon',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            const marker = L.marker([lat, lng], { icon }).addTo(map);
            
            const popupContent = `
                <div class="font-sans min-w-[120px]">
                    <h4 class="font-bold text-sm text-gray-800">${team.name}</h4>
                    <p class="text-xs ${team.status === 'busy' ? 'text-red-500 font-bold' : 'text-green-600'}">
                        ${team.status === 'busy' ? 'Đang làm nhiệm vụ' : 'Sẵn sàng'}
                    </p>
                </div>
            `;
            marker.bindPopup(popupContent, { closeButton: false, className: 'custom-popup' });
            
            rescueMarkersRef.current.push(marker);
        });
    }

  }, [activeLayers]);

  // Handle Timeframe Change
  useEffect(() => {
    if (mapInstanceRef.current && timeFrame) {
        loadFloodHeatmap(mapInstanceRef.current);
    }
  }, [timeFrame]);

  // Handle Search Location Update
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !searchLocation) return;

    map.flyTo([searchLocation.lat, searchLocation.lon], 16, {
      animate: true,
      duration: 1.5
    });

    if (searchMarkerRef.current) {
      searchMarkerRef.current.remove();
    }

    const searchIcon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center -translate-y-1/2">
            <span class="material-symbols-outlined text-red-600 !text-[36px] drop-shadow-md">location_on</span>
            <div class="absolute w-3 h-3 bg-red-600 rounded-full animate-ping opacity-75 top-6"></div>
        </div>
      `,
      className: 'custom-div-icon',
      iconSize: [36, 36],
      iconAnchor: [18, 36]
    });

    const marker = L.marker([searchLocation.lat, searchLocation.lon], { icon: searchIcon })
      .addTo(map)
      .bindPopup(`<div class="font-bold text-sm text-center p-1">${searchLocation.displayName}</div>`)
      .openPopup();

    searchMarkerRef.current = marker;

  }, [searchLocation]);

  // Load flood depth heatmap from API
  const loadFloodHeatmap = async (map, retryCount = 0) => {
    if (!map) return;

    setIsLoadingHeatmap(true);
    setHeatmapError(null);

    try {
      const timeParam = timeFrame ? `&time=${timeFrame.id}` : '';
      const response = await fetch(`${API_BASE_URL}/flood-depth/map?t=${Date.now()}${timeParam}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to load heatmap');
      }

      setHeatmapData(result.data);
      
      const bounds = L.latLngBounds(
        [result.data.bounds.south, result.data.bounds.west],
        [result.data.bounds.north, result.data.bounds.east]
      );

      if (heatmapOverlayRef.current) {
        heatmapOverlayRef.current.remove();
      }

      const imagePath = result.data.image_url.startsWith('http') 
        ? result.data.image_url 
        : `${API_BASE_URL.replace('/api', '')}${result.data.image_url}`;

      const uniqueImagePath = `${imagePath}?t=${Date.now()}`;

      heatmapOverlayRef.current = L.imageOverlay(uniqueImagePath, bounds, {
        opacity: heatmapOpacity,
        interactive: false,
        crossOrigin: true
      });

      if (showHeatmap) {
        heatmapOverlayRef.current.addTo(map);
      }

    } catch (err) {
      console.error('Error loading flood heatmap:', err);
      if (retryCount < 2) {
          setTimeout(() => loadFloodHeatmap(map, retryCount + 1), 2000);
      } else {
          setHeatmapError('Không thể tải bản đồ nhiệt');
      }
    } finally {
      setIsLoadingHeatmap(false);
    }
  };

  // Function to calculate region flood depth (Returns data, does NOT set state directly)
  const calculateRegionFloodDepth = async (bounds) => {
    try {
      const payload = {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      };

      const response = await fetch(`${API_BASE_URL}/flood-depth/region`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.success && result.data) {
        return result.data;
      }
    } catch (error) {
      console.error('Error calculating region flood depth:', error);
    }
    return null;
  };

  // Function to fetch and draw borders
  const fetchAndDrawBorders = async (bounds) => {
    const map = mapInstanceRef.current;
    if (!map) return null;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;
    
    try {
        borderLayersRef.current.forEach(layer => layer.remove());
        borderLayersRef.current = [];

        const payload = {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
        };

        const res = await fetch(`${API_BASE_URL}/admin/selected-area`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal
        });
        const json = await res.json();

        if (json.success && json.data.wards) {
            const fetchPromises = json.data.wards.map(async (ward) => {
                try {
                    const detailRes = await fetch(`${API_BASE_URL}/admin/get-board/${ward.id}`, { signal });
                    const detailJson = await detailRes.json();
                    
                    if (detailJson.success && detailJson.data) {
                        if (detailJson.data.members) {
                            detailJson.data.members.forEach((m) => {
                                if (m.geometry && m.geometry.length > 1) {
                                    const latlngs = m.geometry.map((p) => [p.lat, p.lon]);
                                    const polyline = L.polyline(latlngs, {
                                        color: "#ef4444",
                                        weight: 2,
                                        dashArray: "5, 5"
                                    }).addTo(map);
                                    borderLayersRef.current.push(polyline);
                                }
                            });
                        }
                        
                        let pop = 0;
                        if (detailJson.data.tags && detailJson.data.tags.population) {
                            const rawPop = detailJson.data.tags.population.toString().replace(/,/g, '');
                            pop = parseInt(rawPop, 10);
                            if (isNaN(pop)) pop = 0;
                        }

                        return { pop };
                    }
                } catch (err) {
                   // silent fail
                }
                return { pop: 0 };
            });

            const results = await Promise.all(fetchPromises);
            const totalPopulation = results.reduce((sum, current) => sum + current.pop, 0);

            return { totalPopulation };
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error("Error fetching borders:", error);
        }
    }
    return null;
  };

  // Effect to toggle heatmap visibility
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !heatmapOverlayRef.current) return;
    
    if (showHeatmap) {
      if (!map.hasLayer(heatmapOverlayRef.current)) {
        heatmapOverlayRef.current.addTo(map);
      }
    } else {
      if (map.hasLayer(heatmapOverlayRef.current)) {
        heatmapOverlayRef.current.remove();
      }
    }
  }, [showHeatmap]);

  // Effect to update heatmap opacity
  useEffect(() => {
    if (heatmapOverlayRef.current) {
      heatmapOverlayRef.current.setOpacity(heatmapOpacity);
    }
  }, [heatmapOpacity]);

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
        color: "#0077C2", 
        weight: 2,
        fillColor: "#0077C2",
        fillOpacity: 0.1,
      }).addTo(map);
    };

    const onMouseMove = (e) => {
      if (!isSelectionMode || !isDrawingRef.current || !startLatLngRef.current) return;
      const bounds = L.latLngBounds(startLatLngRef.current, e.latlng);
      if (selectionRectRef.current) {
        selectionRectRef.current.setBounds(bounds);
      }
    };

    const onMouseUp = async (e) => {
      if (!isSelectionMode || !isDrawingRef.current) return;

      isDrawingRef.current = false;
      
      if (selectionRectRef.current) {
        const bounds = selectionRectRef.current.getBounds();
        const northWest = bounds.getNorthWest();
        const southEast = bounds.getSouthEast();

        setIsLoadingBorders(true);

        try {
            const [wardStats, floodAnalysis] = await Promise.all([
                fetchAndDrawBorders(bounds),
                calculateRegionFloodDepth(bounds)
            ]);

            setSelectionCoords({
                nw: { lat: northWest.lat.toFixed(5), lng: northWest.lng.toFixed(5) },
                se: { lat: southEast.lat.toFixed(5), lng: southEast.lng.toFixed(5) },
                floodAnalysis: floodAnalysis
            });

            if (onStatsUpdate) {
                const population = wardStats?.totalPopulation || 0;
                const avgDepth = floodAnalysis?.average_depth || 0;

                onStatsUpdate({
                    population: population,
                    avgFloodLevel: avgDepth.toFixed(2),
                    food: (population * 0.05 / 1000).toFixed(1),
                    workers: Math.floor(population / 500) + 20
                });
            }

        } catch (err) {
            console.error("Analysis failed", err);
        } finally {
            setIsLoadingBorders(false);
            setIsSelectionMode(false);
        }
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

    Object.values(markersRef.current).forEach((marker: any) => marker.remove());
    markersRef.current = {};

    zones.forEach(zone => {
      const [lat, lng] = getZoneLatLng(zone.x, zone.y);

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

      const popupContent = `<div class="font-bold text-sm">${zone.location}</div>`;
      marker.bindPopup(popupContent, { closeButton: false, className: 'custom-popup' });
      if (isSelected) marker.openPopup();

      markersRef.current[zone.id] = marker;
    });
  }, [zones, selectedZoneId, onZoneSelect, isSelectionMode]);

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
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Status & Timestamp */}
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-md text-xs font-bold text-primary flex items-center gap-2 transition-opacity duration-300 z-[1000] pointer-events-none`}>
            {isLoadingHeatmap ? (
                <>
                    <span className="material-symbols-outlined !text-[16px] animate-spin">sync</span>
                    {timeFrame ? `Đang tải: ${timeFrame.label}...` : "Đang tải dữ liệu ngập..."}
                </>
            ) : (
                <>
                    <span className="material-symbols-outlined !text-[16px]">history</span>
                    Thời gian: <span className="text-blue-600">{timeFrame ? timeFrame.label : "Hiện tại"}</span>
                </>
            )}
        </div>

        {/* Analysis Loading */}
        {isLoadingBorders && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-primary/90 text-white backdrop-blur px-4 py-2 rounded-full shadow-xl text-xs font-bold flex items-center gap-2 z-[1000] pointer-events-none animate-bounce">
                <span className="material-symbols-outlined !text-[16px] animate-spin">analytics</span>
                Đang phân tích dữ liệu vùng...
            </div>
        )}

        {/* Selection Details Panel */}
        {selectionCoords && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur shadow-2xl rounded-xl p-4 border border-white/50 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-lg w-full">
             <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
                <span className="material-symbols-outlined text-primary">area_chart</span>
                <span className="font-bold text-gray-800 text-sm">Kết Quả Phân Tích</span>
                <button 
                  onClick={() => {
                    setSelectionCoords(null);
                    if(selectionRectRef.current) {
                      selectionRectRef.current.remove();
                      selectionRectRef.current = null;
                    }
                    borderLayersRef.current.forEach(layer => layer.remove());
                    borderLayersRef.current = [];
                    if (onStatsUpdate) onStatsUpdate(null);
                  }}
                  className="ml-auto hover:bg-gray-100 rounded-full p-1 transition-colors"
                >
                  <span className="material-symbols-outlined !text-[18px] text-gray-400">close</span>
                </button>
             </div>

             {selectionCoords.floodAnalysis ? (
               <div className="space-y-3">
                 <div className="grid grid-cols-3 gap-3">
                   <div className="bg-blue-50 p-2.5 rounded-lg text-center border border-blue-100">
                     <p className="text-[10px] text-gray-500 font-semibold uppercase">Trung Bình</p>
                     <p className="font-bold text-blue-700 text-lg">{selectionCoords.floodAnalysis.average_depth?.toFixed(2)}m</p>
                   </div>
                   <div className="bg-red-50 p-2.5 rounded-lg text-center border border-red-100">
                     <p className="text-[10px] text-gray-500 font-semibold uppercase">Cao Nhất</p>
                     <p className="font-bold text-red-700 text-lg">{selectionCoords.floodAnalysis.max_depth?.toFixed(2)}m</p>
                   </div>
                   <div className="bg-green-50 p-2.5 rounded-lg text-center border border-green-100">
                     <p className="text-[10px] text-gray-500 font-semibold uppercase">Thấp Nhất</p>
                     <p className="font-bold text-green-700 text-lg">{selectionCoords.floodAnalysis.min_depth?.toFixed(2)}m</p>
                   </div>
                 </div>
                 
                 <div className="bg-gray-50 rounded-lg p-2.5 text-xs border border-gray-100">
                    <div className="flex justify-between mb-1">
                        <span className="text-gray-600">Độ phủ ngập:</span>
                        <span className="font-bold text-gray-800">{selectionCoords.floodAnalysis.coverage_percentage?.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${selectionCoords.floodAnalysis.coverage_percentage}%` }}></div>
                    </div>
                 </div>
               </div>
             ) : (
                <div className="text-center py-2 text-gray-500 text-xs italic">Không có dữ liệu ngập cho vùng này</div>
             )}
          </div>
        )}

        {/* Heatmap Controls & Legend */}
        {showHeatmap && heatmapData && !isLoadingHeatmap && (
            <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50 w-64">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="font-bold text-gray-800 text-sm">Bản đồ nhiệt</h3>
                        <p className="text-[10px] text-gray-500">Độ sâu ngập lụt (m)</p>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => loadFloodHeatmap(mapInstanceRef.current)} className="p-1 hover:bg-gray-100 rounded text-gray-500" title="Làm mới">
                            <span className="material-symbols-outlined !text-[16px]">refresh</span>
                        </button>
                    </div>
                </div>
                
                <div className="space-y-2">
                    {/* Gradient Bar */}
                    <div 
                        className="h-3 rounded-full border border-gray-200 shadow-inner w-full"
                        style={{
                            background: `linear-gradient(to right, ${heatmapData.legend?.colors?.join(', ') || '#ccc'})`
                        }}
                    ></div>
                    
                    {/* Values */}
                    <div className="flex justify-between text-[10px] font-medium text-gray-600">
                        <span>{heatmapData.legend?.values[0]?.toFixed(1)}m</span>
                        <span>{(heatmapData.legend?.values[2] || 0.5).toFixed(1)}m</span>
                        <span>{(heatmapData.legend?.values[4] || 1.5).toFixed(1)}m</span>
                    </div>

                    {/* Opacity Slider */}
                    <div className="pt-2 mt-2 border-t border-gray-100">
                         <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                            <span>Độ mờ</span>
                            <span>{Math.round(heatmapOpacity * 100)}%</span>
                         </div>
                         <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={heatmapOpacity}
                            onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>
                </div>
            </div>
        )}

        {/* Map Controls */}
        <div className="absolute right-4 top-4 flex flex-col items-end gap-2 z-[1000]">
            <div className="flex flex-col rounded-xl bg-white/90 shadow-lg backdrop-blur-sm ring-1 ring-black/5 overflow-hidden">
                <button onClick={() => handleZoom('in')} className="h-10 w-10 flex items-center justify-center hover:bg-gray-50 border-b border-gray-100 transition-colors">
                    <span className="material-symbols-outlined text-gray-700 !text-[20px]">add</span>
                </button>
                <button onClick={() => handleZoom('out')} className="h-10 w-10 flex items-center justify-center hover:bg-gray-50 transition-colors">
                    <span className="material-symbols-outlined text-gray-700 !text-[20px]">remove</span>
                </button>
            </div>
            
            <div className="flex flex-col rounded-xl bg-white/90 shadow-lg backdrop-blur-sm ring-1 ring-black/5 overflow-hidden mt-2">
                 <button 
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className={`h-10 w-10 flex items-center justify-center transition-colors ${showHeatmap ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-600'}`}
                    title="Bật/Tắt Heatmap"
                >
                    <span className="material-symbols-outlined !text-[20px]">layers</span>
                </button>
            </div>

            <button 
                onClick={() => setIsSelectionMode(!isSelectionMode)}
                className={`h-10 w-10 flex items-center justify-center rounded-xl shadow-lg backdrop-blur-sm ring-1 ring-black/5 transition-all mt-2 ${
                    isSelectionMode 
                    ? 'bg-primary text-white ring-primary' 
                    : 'bg-white/90 hover:bg-gray-50 text-gray-700'
                }`}
                title="Chọn vùng phân tích"
            >
                <span className="material-symbols-outlined !text-[20px]">
                  {isSelectionMode ? 'check_box' : 'crop_free'}
                </span>
            </button>
            
            <button onClick={handleLocate} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/90 shadow-lg backdrop-blur-sm hover:bg-gray-50 ring-1 ring-black/5 transition-colors mt-2">
                <span className="material-symbols-outlined text-gray-700 !text-[20px]">my_location</span>
            </button>
        </div>
    </div>
  );
};