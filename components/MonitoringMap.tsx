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

// --- CONVEX HULL ALGORITHM (Monotone Chain) ---
// Sorts points to draw a clean polygon without crossing lines
const getConvexHull = (points) => {
    if (points.length < 3) return points;

    // 1. Sort points by longitude (x), then latitude (y)
    const sortedPoints = [...points].sort((a, b) => {
        return a.lon === b.lon ? a.lat - b.lat : a.lon - b.lon;
    });

    // Cross product of vectors OA and OB
    // A positive cross product indicates a "left" turn, zero a straight line, and negative a "right" turn.
    const crossProduct = (o, a, b) => {
        return (a.lon - o.lon) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lon - o.lon);
    };

    // 2. Build lower hull
    const lower = [];
    for (const point of sortedPoints) {
        while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
            lower.pop();
        }
        lower.push(point);
    }

    // 3. Build upper hull
    const upper = [];
    for (let i = sortedPoints.length - 1; i >= 0; i--) {
        const point = sortedPoints[i];
        while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
            upper.pop();
        }
        upper.push(point);
    }

    // 4. Concatenate (remove duplicate start/end points)
    lower.pop();
    upper.pop();
    return lower.concat(upper);
};

// Mock Rescue Teams
const MOCK_RESCUE_TEAMS = [
    { id: 'R1', x: 52, y: 48, name: "Đội CH #01", status: "busy" },
    { id: 'R2', x: 60, y: 38, name: "Đội CH #02", status: "idle" },
    { id: 'R3', x: 45, y: 55, name: "Đội Y Tế #05", status: "busy" },
    { id: 'R4', x: 65, y: 60, name: "Đội Hậu Cần", status: "idle" }
];

// Mock Relief Points (Shelters, Food Distribution)
const MOCK_RELIEF_POINTS = [
    { id: 'P1', x: 50, y: 35, name: "UBND Phường 22", type: "shelter", capacity: "150/200" },
    { id: 'P2', x: 75, y: 45, name: "Trường THPT Thảo Điền", type: "shelter", capacity: "50/500" },
    { id: 'P3', x: 35, y: 65, name: "Điểm phát lương thực Q7", type: "food", capacity: "Còn 500 suất" },
    { id: 'P4', x: 58, y: 25, name: "Trạm Y Tế Phường 15", type: "medical", capacity: "Sẵn sàng" }
];

export const MonitoringMap = ({ zones, selectedZoneId, onZoneSelect, onStatsUpdate, searchLocation, timeFrame, activeLayers }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const rescueMarkersRef = useRef([]); 
  const reliefMarkersRef = useRef([]); 
  
  // Selection Area Refs
  const selectionRectRef = useRef(null);
  const borderLayersRef = useRef([]); 
  
  // Point Selection Refs
  const pointSelectionLayerRef = useRef(L.layerGroup()); 
  
  const abortControllerRef = useRef(null);
  const searchMarkerRef = useRef(null);

  const [isLoadingBorders, setIsLoadingBorders] = useState(false);
  
  // Heatmap State
  const [isLoadingHeatmap, setIsLoadingHeatmap] = useState(false);
  const [heatmapData, setHeatmapData] = useState(null);
  const [heatmapError, setHeatmapError] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.7);
  const heatmapOverlayRef = useRef(null);
  
  // Rectangle Selection Tool State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectionCoords, setSelectionCoords] = useState(null);
  const isDrawingRef = useRef(false);
  const startLatLngRef = useRef(null);

  // Point Selection Tool State
  const [isPointSelectionMode, setIsPointSelectionMode] = useState(false);
  const [pointSelectionData, setPointSelectionData] = useState(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([10.762622, 106.660172], 12);

    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.attribution({
      position: 'bottomright',
      prefix: 'OSM'
    }).addTo(map);

    pointSelectionLayerRef.current.addTo(map);

    map.whenReady(() => {
        if (!heatmapData) {
            loadFloodHeatmap(map);
        }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Handle FlyTo Zone
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedZoneId) return;

    const selectedZone = zones.find(z => z.id === selectedZoneId);
    if (selectedZone) {
        const [lat, lng] = getZoneLatLng(selectedZone.x, selectedZone.y);
        
        map.flyTo([lat, lng], 15, {
            animate: true,
            duration: 1.2
        });

        const marker = markersRef.current[selectedZoneId];
        if (marker) {
            marker.openPopup();
        }
    }
  }, [selectedZoneId, zones]);

  // Handle Rescue Team & Relief Point Layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

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

    reliefMarkersRef.current.forEach(m => m.remove());
    reliefMarkersRef.current = [];

    if (activeLayers && activeLayers.includes('Điểm cứu trợ')) {
        MOCK_RELIEF_POINTS.forEach(point => {
            const [lat, lng] = getZoneLatLng(point.x, point.y);
            let iconName = 'home';
            let bgClass = 'bg-blue-600';
            if (point.type === 'food') { iconName = 'inventory_2'; bgClass = 'bg-green-600'; }
            if (point.type === 'medical') { iconName = 'medical_services'; bgClass = 'bg-red-500'; }
            const iconHtml = `
                <div class="relative flex items-center justify-center">
                     <div class="w-7 h-7 rounded-full shadow-lg border-2 border-white ${bgClass} flex items-center justify-center">
                        <span class="material-symbols-outlined !text-[16px] text-white">${iconName}</span>
                    </div>
                    <div class="absolute -bottom-1 w-2 h-2 bg-white rotate-45 border-r border-b border-gray-200"></div>
                </div>
            `;
            const icon = L.divIcon({
                html: iconHtml,
                className: 'custom-div-icon',
                iconSize: [28, 28],
                iconAnchor: [14, 30]
            });
            const marker = L.marker([lat, lng], { icon }).addTo(map);
            const popupContent = `
                <div class="font-sans min-w-[140px]">
                    <div class="flex items-center gap-1 mb-1">
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase text-white ${bgClass}">
                            ${point.type === 'shelter' ? 'Lưu trú' : point.type === 'food' ? 'Lương thực' : 'Y tế'}
                        </span>
                    </div>
                    <h4 class="font-bold text-sm text-gray-800 mb-0.5">${point.name}</h4>
                    <p class="text-xs text-gray-600 font-medium">Sức chứa/Tình trạng:</p>
                    <p class="text-xs font-bold text-gray-800">${point.capacity}</p>
                </div>
            `;
            marker.bindPopup(popupContent, { closeButton: false, className: 'custom-popup' });
            reliefMarkersRef.current.push(marker);
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

  const loadFloodHeatmap = async (map, retryCount = 0) => {
    if (!map) return;
    setIsLoadingHeatmap(true);
    setHeatmapError(null);
    try {
      const timeParam = timeFrame ? `&time=${timeFrame.id}` : '';
      const response = await fetch(`${API_BASE_URL}/flood-depth/map?t=${Date.now()}${timeParam}`);
      const result = await response.json();

      if (!result.success) throw new Error(result.error || 'Failed to load heatmap');

      setHeatmapData(result.data);
      const bounds = L.latLngBounds(
        [result.data.bounds.south, result.data.bounds.west],
        [result.data.bounds.north, result.data.bounds.east]
      );

      if (heatmapOverlayRef.current) heatmapOverlayRef.current.remove();

      const imagePath = result.data.image_url.startsWith('http') 
        ? result.data.image_url 
        : `${API_BASE_URL.replace('/api', '')}${result.data.image_url}`;

      const uniqueImagePath = `${imagePath}?t=${Date.now()}`;

      heatmapOverlayRef.current = L.imageOverlay(uniqueImagePath, bounds, {
        opacity: heatmapOpacity,
        interactive: false,
        crossOrigin: true
      });

      if (showHeatmap) heatmapOverlayRef.current.addTo(map);

    } catch (err) {
      console.error('Error loading flood heatmap:', err);
      if (retryCount < 2) setTimeout(() => loadFloodHeatmap(map, retryCount + 1), 2000);
      else setHeatmapError('Không thể tải bản đồ nhiệt');
    } finally {
      setIsLoadingHeatmap(false);
    }
  };

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
      if (result.success && result.data) return result.data;
    } catch (error) {
      console.error('Error calculating region flood depth:', error);
    }
    return null;
  };

  const fetchAndDrawBorders = async (bounds) => {
    const map = mapInstanceRef.current;
    if (!map) return null;

    if (abortControllerRef.current) abortControllerRef.current.abort();

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
                                if (m.geometry && m.geometry.length > 2) {
                                    // Use Convex Hull for Rectangle Selection borders as well
                                    const hullPoints = getConvexHull(m.geometry);
                                    const latlngs = hullPoints.map((p) => [p.lat, p.lon]);
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
                } catch (err) { }
                return { pop: 0 };
            });

            const results = await Promise.all(fetchPromises);
            const totalPopulation = results.reduce((sum, current) => sum + current.pop, 0);
            return { totalPopulation };
        }
    } catch (error) {
        if (error.name !== 'AbortError') console.error("Error fetching borders:", error);
    }
    return null;
  };

  // Function to fetch district by point
  const fetchDistrictByPoint = async (lat, lng) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      setIsLoadingBorders(true);
      pointSelectionLayerRef.current.clearLayers();

      try {
          const payload = { lat, lng };
          
          const response = await fetch(`${API_BASE_URL}/admin/point-district`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          const result = await response.json();

          if (result.success && result.data) {
              const { geometry, point } = result.data;

              // 1. Draw Polygon - Clean Style with Convex Hull
              if (geometry && geometry.length > 2) {
                  // Apply Convex Hull Algorithm here
                  const hullPoints = getConvexHull(geometry);
                  const latlngs = hullPoints.map(p => [p.lat, p.lon]);
                  
                  L.polygon(latlngs, {
                      color: "#9333ea", // Purple-600
                      weight: 4,        // Thicker outline
                      opacity: 1,
                      fillColor: "#9333ea", 
                      fillOpacity: 0.15, // Very light fill
                      lineCap: 'round',
                      lineJoin: 'round',
                      smoothFactor: 1.0
                  }).addTo(pointSelectionLayerRef.current);
                  
                  // Zoom to polygon
                  const bounds = L.latLngBounds(latlngs);
                  map.flyToBounds(bounds, { padding: [80, 80], duration: 1.2 });
              }

              // 2. Draw Point Marker
              const icon = L.divIcon({
                  html: `
                    <div class="relative flex items-center justify-center -translate-y-1">
                        <span class="material-symbols-outlined text-purple-600 !text-[36px] drop-shadow-md">location_on</span>
                    </div>
                  `,
                  className: 'custom-div-icon',
                  iconSize: [36, 36],
                  iconAnchor: [18, 34]
              });
              L.marker([point.lat, point.lng], { icon }).addTo(pointSelectionLayerRef.current);

              setPointSelectionData(result.data);
          } else {
             console.error("Failed to get district info:", result.error);
             setPointSelectionData(null);
          }
      } catch (error) {
          console.error("Error fetching district by point:", error);
      } finally {
          setIsLoadingBorders(false);
          setIsPointSelectionMode(false);
      }
  };

  // Effect to toggle heatmap visibility
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !heatmapOverlayRef.current) return;
    
    if (showHeatmap) {
      if (!map.hasLayer(heatmapOverlayRef.current)) heatmapOverlayRef.current.addTo(map);
    } else {
      if (map.hasLayer(heatmapOverlayRef.current)) heatmapOverlayRef.current.remove();
    }
  }, [showHeatmap]);

  useEffect(() => {
    if (heatmapOverlayRef.current) {
      heatmapOverlayRef.current.setOpacity(heatmapOpacity);
    }
  }, [heatmapOpacity]);

  // Handle Rectangle Selection Mode Interactions
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (isSelectionMode) {
      map.dragging.disable();
      map.getContainer().style.cursor = 'crosshair';
    } else if (!isPointSelectionMode) {
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

  // Handle Point Selection Mode Interactions
  useEffect(() => {
      const map = mapInstanceRef.current;
      if (!map) return;

      if (isPointSelectionMode) {
          map.getContainer().style.cursor = 'help';
      } else if (!isSelectionMode) {
          map.getContainer().style.cursor = '';
      }

      const onClick = (e) => {
          if (!isPointSelectionMode) return;
          fetchDistrictByPoint(e.latlng.lat, e.latlng.lng);
      };

      map.on('click', onClick);

      return () => {
          map.off('click', onClick);
      };
  }, [isPointSelectionMode]);

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
        if (isSelectionMode || isPointSelectionMode) return;
        L.DomEvent.stopPropagation(e);
        onZoneSelect(zone.id);
      });
      const popupContent = `<div class="font-bold text-sm">${zone.location}</div>`;
      marker.bindPopup(popupContent, { closeButton: false, className: 'custom-popup' });
      if (isSelected) marker.openPopup();
      markersRef.current[zone.id] = marker;
    });
  }, [zones, selectedZoneId, onZoneSelect, isSelectionMode, isPointSelectionMode]);

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
                Đang phân tích dữ liệu...
            </div>
        )}

        {/* RECTANGLE Selection Details Panel */}
        {selectionCoords && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur shadow-2xl rounded-xl p-4 border border-white/50 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-lg w-full">
             <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
                <span className="material-symbols-outlined text-primary">area_chart</span>
                <span className="font-bold text-gray-800 text-sm">Kết Quả Phân Tích Vùng</span>
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

        {/* POINT Selection Details Panel */}
        {pointSelectionData && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur shadow-2xl rounded-xl p-4 border border-purple-200 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-lg w-full ring-1 ring-purple-100">
             <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
                <span className="material-symbols-outlined text-purple-600">location_on</span>
                <div className="flex flex-col">
                    <span className="font-bold text-gray-800 text-sm leading-tight">
                        {pointSelectionData.nominatim_info?.display_name?.split(',')[0] || pointSelectionData.district.name}
                    </span>
                    <span className="text-[10px] text-gray-500">
                        {pointSelectionData.nominatim_info?.address?.city_district || pointSelectionData.district.type}
                    </span>
                </div>
                <button 
                  onClick={() => {
                    setPointSelectionData(null);
                    pointSelectionLayerRef.current.clearLayers();
                  }}
                  className="ml-auto hover:bg-gray-100 rounded-full p-1 transition-colors"
                >
                  <span className="material-symbols-outlined !text-[18px] text-gray-400">close</span>
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {/* Left Column: Stats */}
                 <div className="space-y-2">
                     <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                            <p className="text-[10px] text-gray-500 uppercase">Dân số</p>
                            <p className="font-bold text-gray-800">
                                {pointSelectionData.properties.population.toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                             <p className="text-[10px] text-gray-500 uppercase">Diện tích</p>
                             <p className="font-bold text-gray-800">
                                 {pointSelectionData.properties.area_km2} km²
                             </p>
                        </div>
                     </div>
                     
                     <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-blue-500 uppercase font-bold">Độ ngập trung bình</span>
                            <span className="font-bold text-blue-700 text-lg">
                                {pointSelectionData.flood_analysis?.average_depth 
                                  ? `${pointSelectionData.flood_analysis.average_depth.toFixed(3)}m`
                                  : 'N/A'}
                            </span>
                        </div>
                        <div className="flex gap-2 text-[10px] text-gray-500">
                             <span>Max: {pointSelectionData.flood_analysis?.max_depth || 0}m</span>
                             <span>•</span>
                             <span>Phủ: {pointSelectionData.flood_analysis?.coverage_percentage || 0}%</span>
                        </div>
                     </div>
                 </div>

                 {/* Right Column: Flood Distribution Bar Chart */}
                 <div className="flex flex-col h-full justify-between">
                     <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Phân bố ngập lụt</p>
                     
                     <div className="flex items-end justify-between gap-1 h-24 w-full pr-1">
                        {[
                            { 
                                id: 'no_flood', 
                                label: 'Không', 
                                color: 'bg-gray-300', 
                                value: pointSelectionData.flood_analysis?.flood_distribution?.no_flood?.percentage || 0 
                            },
                            { 
                                id: 'shallow', 
                                label: 'Nhẹ', 
                                color: 'bg-blue-300', 
                                value: pointSelectionData.flood_analysis?.flood_distribution?.shallow?.percentage || 0 
                            },
                            { 
                                id: 'moderate', 
                                label: 'Vừa', 
                                color: 'bg-blue-500', 
                                value: pointSelectionData.flood_analysis?.flood_distribution?.moderate?.percentage || 0 
                            },
                            { 
                                id: 'deep', 
                                label: 'Sâu', 
                                color: 'bg-blue-700', 
                                value: pointSelectionData.flood_analysis?.flood_distribution?.deep?.percentage || 0 
                            },
                            { 
                                id: 'very_deep', 
                                label: 'R.Sâu', 
                                color: 'bg-purple-800', 
                                value: pointSelectionData.flood_analysis?.flood_distribution?.very_deep?.percentage || 0 
                            }
                        ].map((item) => (
                            <div key={item.id} className="flex flex-col items-center flex-1 group relative">
                                <div className="absolute -top-8 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                    {item.value.toFixed(1)}%
                                </div>
                                <div className="w-full bg-gray-100 rounded-t-sm relative h-20 overflow-hidden">
                                    <div 
                                        className={`absolute bottom-0 left-0 w-full transition-all duration-500 ease-out ${item.color}`}
                                        style={{ height: `${item.value}%` }}
                                    ></div>
                                </div>
                                <span className="text-[9px] text-gray-500 mt-1 font-medium">{item.label}</span>
                            </div>
                        ))}
                     </div>
                 </div>
             </div>
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
                    <div 
                        className="h-3 rounded-full border border-gray-200 shadow-inner w-full"
                        style={{
                            background: `linear-gradient(to right, ${heatmapData.legend?.colors?.join(', ') || '#ccc'})`
                        }}
                    ></div>
                    <div className="flex justify-between text-[10px] font-medium text-gray-600">
                        <span>{heatmapData.legend?.values[0]?.toFixed(1)}m</span>
                        <span>{(heatmapData.legend?.values[2] || 0.5).toFixed(1)}m</span>
                        <span>{(heatmapData.legend?.values[4] || 1.5).toFixed(1)}m</span>
                    </div>

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
                onClick={() => {
                    setIsSelectionMode(!isSelectionMode);
                    setIsPointSelectionMode(false);
                    setPointSelectionData(null);
                    pointSelectionLayerRef.current.clearLayers();
                }}
                className={`h-10 w-10 flex items-center justify-center rounded-xl shadow-lg backdrop-blur-sm ring-1 ring-black/5 transition-all mt-2 ${
                    isSelectionMode 
                    ? 'bg-primary text-white ring-primary' 
                    : 'bg-white/90 hover:bg-gray-50 text-gray-700'
                }`}
                title="Chọn vùng (Hình chữ nhật)"
            >
                <span className="material-symbols-outlined !text-[20px]">
                  {isSelectionMode ? 'check_box' : 'crop_free'}
                </span>
            </button>

            <button 
                onClick={() => {
                    setIsPointSelectionMode(!isPointSelectionMode);
                    setIsSelectionMode(false);
                    setSelectionCoords(null);
                    if (selectionRectRef.current) {
                        selectionRectRef.current.remove();
                        selectionRectRef.current = null;
                    }
                }}
                className={`h-10 w-10 flex items-center justify-center rounded-xl shadow-lg backdrop-blur-sm ring-1 ring-black/5 transition-all mt-2 ${
                    isPointSelectionMode 
                    ? 'bg-purple-600 text-white ring-purple-600' 
                    : 'bg-white/90 hover:bg-gray-50 text-gray-700'
                }`}
                title="Chọn điểm (Quận/Phường)"
            >
                <span className="material-symbols-outlined !text-[20px]">
                  {isPointSelectionMode ? 'location_on' : 'pin_drop'}
                </span>
            </button>
            
            <button onClick={handleLocate} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/90 shadow-lg backdrop-blur-sm hover:bg-gray-50 ring-1 ring-black/5 transition-colors mt-2">
                <span className="material-symbols-outlined text-gray-700 !text-[20px]">my_location</span>
            </button>
        </div>
    </div>
  );
};