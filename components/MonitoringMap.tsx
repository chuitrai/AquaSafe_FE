import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { DispatchPanel } from './DispatchPanel';

// API Configuration
const API_BASE_URL = "http://localhost:8220/api";

// --- MOCK DATA FOR HUE REGION ---
const HUE_CENTER = { lat: 16.4637, lng: 107.5909 };

// Helper to generate random coord around Hue
const getRandomCoord = () => {
    const lat = HUE_CENTER.lat + (Math.random() - 0.5) * 0.06; // +/- ~3km
    const lng = HUE_CENTER.lng + (Math.random() - 0.5) * 0.08;
    return [lat, lng];
};

const MOCK_RESCUE_TEAMS = [
    { id: 'RT01', name: 'Đội CH Phường Phú Hội', type: 'boat', status: 'busy', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT02', name: 'Cảnh sát PCCC & CNCH', type: 'truck', status: 'idle', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT03', name: 'Tổ Phản ứng nhanh 115', type: 'ambulance', status: 'busy', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT04', name: 'Đội TNV Chữ Thập Đỏ', type: 'medical', status: 'idle', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT05', name: 'Ban CHQS TP Huế', type: 'boat', status: 'busy', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT06', name: 'Đội CH Vỹ Dạ', type: 'boat', status: 'idle', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT07', name: 'Đội Hậu Cần Quân Khu 4', type: 'truck', status: 'busy', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT08', name: 'Biệt đội Cano 01', type: 'boat', status: 'idle', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT09', name: 'Y tế Phường Xuân Phú', type: 'medical', status: 'busy', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT10', name: 'Đội CH An Cựu', type: 'boat', status: 'idle', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
];

const MOCK_RELIEF_POINTS = [
    { id: 'RP01', name: 'BV Trung Ương Huế', type: 'hospital', capacity: 'Sẵn sàng', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP02', name: 'Trường Quốc Học Huế', type: 'shelter', capacity: '300/500', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP03', name: 'UBND Phường Vỹ Dạ', type: 'food', capacity: 'Còn 200 suất', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP04', name: 'Nhà Văn Hóa Lao Động', type: 'shelter', capacity: '150/300', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP05', name: 'Trung tâm Y tế TP Huế', type: 'hospital', capacity: 'Quá tải nhẹ', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP06', name: 'Kho Gạo Dự Trữ', type: 'food', capacity: 'Đầy kho', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
];

// --- CONVEX HULL ALGORITHM (Monotone Chain) ---
const getConvexHull = (points) => {
    if (points.length < 3) return points;

    const sortedPoints = [...points].sort((a, b) => {
        return a.lon === b.lon ? a.lat - b.lat : a.lon - b.lon;
    });

    const crossProduct = (o, a, b) => {
        return (a.lon - o.lon) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lon - o.lon);
    };

    const lower = [];
    for (const point of sortedPoints) {
        while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
            lower.pop();
        }
        lower.push(point);
    }

    const upper = [];
    for (let i = sortedPoints.length - 1; i >= 0; i--) {
        const point = sortedPoints[i];
        while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
            upper.pop();
        }
        upper.push(point);
    }

    lower.pop();
    upper.pop();
    return lower.concat(upper);
};

export const MonitoringMap = ({ zones, selectedZoneId, onZoneSelect, onStatsUpdate, onCriticalZonesUpdate, searchLocation, timeFrame, activeLayers, isLoggedIn, token, onOpenAlertModal }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const polygonLayersRef = useRef({}); 
  
  // New Refs for Rescue & Relief
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
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.7);
  const heatmapOverlayRef = useRef(null);
  
  // Real-time Flood Status & Population Cache
  const floodStatusRef = useRef({});
  const populationCacheRef = useRef({}); // Cache population data to avoid re-fetching
  
  // Rectangle Selection Tool State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectionCoords, setSelectionCoords] = useState(null);
  const isDrawingRef = useRef(false);
  const startLatLngRef = useRef(null);

  // Point Selection Tool State
  const [isPointSelectionMode, setIsPointSelectionMode] = useState(false);
  const [pointSelectionData, setPointSelectionData] = useState(null);

  // Dispatch Panel State
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);

  // Refs to track state inside event listeners without re-binding
  const isSelectionModeRef = useRef(isSelectionMode);
  const isPointSelectionModeRef = useRef(isPointSelectionMode);

  // Sync refs with state
  useEffect(() => {
    isSelectionModeRef.current = isSelectionMode;
  }, [isSelectionMode]);

  useEffect(() => {
    isPointSelectionModeRef.current = isPointSelectionMode;
  }, [isPointSelectionMode]);

  // Handle Event Delegation for Alert Buttons in Popups
  useEffect(() => {
    const handleAlertClick = (e) => {
      const btn = e.target.closest('.send-alert-btn');
      if (btn) {
        const zoneId = btn.getAttribute('data-zone-id');
        const zone = zones.find(z => z.id.toString() === zoneId);
        if (zone && onOpenAlertModal) {
          onOpenAlertModal(zone);
        }
      }
    };

    document.addEventListener('click', handleAlertClick);
    return () => document.removeEventListener('click', handleAlertClick);
  }, [zones, onOpenAlertModal]);

  // Helper to get headers
  const getAuthHeaders = () => {
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
          headers['Authorization'] = `Bearer ${token}`;
      }
      return headers;
  };

  // Helper to calculate and set global stats based on all available data
  const calculateAndSetGlobalStats = () => {
      if (!onStatsUpdate) return;

      const statusMap = floodStatusRef.current;
      const popMap = populationCacheRef.current;
      
      const ids = Object.keys(statusMap);
      if (ids.length === 0) {
          onStatsUpdate(null);
          return;
      }

      let totalDepth = 0;
      let totalPopulation = 0;
      let validDepthCount = 0;

      ids.forEach(id => {
          const depth = statusMap[id] || 0;
          totalDepth += depth;
          validDepthCount++;
          
          if (popMap[id]) {
              totalPopulation += popMap[id];
          }
      });

      const avgFloodDepth = validDepthCount > 0 ? totalDepth / validDepthCount : 0;
      
      if (totalPopulation === 0 && validDepthCount > 0) {
          totalPopulation = validDepthCount * 5000; 
      }

      onStatsUpdate({
          population: totalPopulation,
          avgFloodLevel: avgFloodDepth.toFixed(2),
          food: (totalPopulation * 0.05 / 1000).toFixed(1),
          workers: Math.floor(totalPopulation / 1000) + 20
      });
  };

  // Initialize Map - Center on Hue
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Hue City Coordinates
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([16.4637, 107.5909], 12); 

    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.attribution({
      position: 'bottomright',
      prefix: 'OSM'
    }).addTo(map);

    pointSelectionLayerRef.current.addTo(map);

    // Load flood heatmap when map is ready
    map.whenReady(() => {
        if (!heatmapData) {
            loadFloodHeatmap(map);
        }
    });

    // Click handler for deselection
    map.on('click', (e) => {
        if (isSelectionModeRef.current || isPointSelectionModeRef.current) return;

        onZoneSelect(null);

        setSelectionCoords(null);
        if (selectionRectRef.current) {
            selectionRectRef.current.remove();
            selectionRectRef.current = null;
        }
        borderLayersRef.current.forEach(layer => layer.remove());
        borderLayersRef.current = [];

        setPointSelectionData(null);
        pointSelectionLayerRef.current.clearLayers();

        calculateAndSetGlobalStats();
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []); 

  // --- NEW EFFECT: Handle Rescue & Relief Layers ---
  useEffect(() => {
      const map = mapInstanceRef.current;
      if (!map) return;

      // 1. Clear existing layer markers
      rescueMarkersRef.current.forEach(m => m.remove());
      rescueMarkersRef.current = [];
      
      reliefMarkersRef.current.forEach(m => m.remove());
      reliefMarkersRef.current = [];

      // 2. Render Rescue Teams if Active
      if (activeLayers && activeLayers.includes('Đội cứu hộ')) {
          MOCK_RESCUE_TEAMS.forEach(team => {
              let iconName = 'groups';
              if (team.type === 'boat') iconName = 'sailing';
              if (team.type === 'truck') iconName = 'local_shipping';
              if (team.type === 'ambulance') iconName = 'ambulance';
              if (team.type === 'medical') iconName = 'medical_services';

              const colorClass = team.status === 'busy' ? 'bg-red-500 border-red-600' : 'bg-blue-600 border-blue-700';

              const iconHtml = `
                <div class="relative flex items-center justify-center">
                    <div class="w-8 h-8 rounded-full shadow-lg border-2 border-white ${colorClass} flex items-center justify-center text-white">
                        <span class="material-symbols-outlined !text-[18px]">${iconName}</span>
                    </div>
                    ${team.status === 'busy' ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>' : ''}
                </div>
              `;
              
              const icon = L.divIcon({
                  html: iconHtml,
                  className: 'custom-div-icon',
                  iconSize: [32, 32],
                  iconAnchor: [16, 16]
              });

              const marker = L.marker([team.lat, team.lng], { icon }).addTo(map);
              const popupContent = `
                <div class="min-w-[150px]">
                    <div class="flex items-center gap-2 mb-1">
                         <span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase text-white ${team.status === 'busy' ? 'bg-red-500' : 'bg-blue-600'}">
                            ${team.status === 'busy' ? 'Đang bận' : 'Sẵn sàng'}
                         </span>
                    </div>
                    <h4 class="font-bold text-gray-800 text-sm">${team.name}</h4>
                    <p class="text-xs text-gray-500 italic">ID: ${team.id}</p>
                </div>
              `;
              marker.bindPopup(popupContent, { closeButton: false, className: 'custom-popup', offset: [0, -10] });
              rescueMarkersRef.current.push(marker);
          });
      }

      // 3. Render Relief Points if Active
      if (activeLayers && activeLayers.includes('Điểm cứu trợ')) {
          MOCK_RELIEF_POINTS.forEach(point => {
              let iconName = 'home';
              let bgClass = 'bg-green-600';
              if (point.type === 'hospital') { iconName = 'local_hospital'; bgClass = 'bg-red-500'; }
              if (point.type === 'food') { iconName = 'inventory_2'; bgClass = 'bg-orange-500'; }
              if (point.type === 'shelter') { iconName = 'roofing'; bgClass = 'bg-green-600'; }

              const iconHtml = `
                <div class="relative flex items-center justify-center">
                     <div class="w-8 h-8 rounded-lg shadow-md border-2 border-white ${bgClass} flex items-center justify-center text-white transform rotate-45">
                        <span class="material-symbols-outlined !text-[18px] -rotate-45">${iconName}</span>
                    </div>
                </div>
              `;
              
              const icon = L.divIcon({
                  html: iconHtml,
                  className: 'custom-div-icon',
                  iconSize: [32, 32],
                  iconAnchor: [16, 16]
              });

              const marker = L.marker([point.lat, point.lng], { icon }).addTo(map);
              const popupContent = `
                <div class="min-w-[160px]">
                    <div class="flex items-center gap-1 mb-1">
                        <span class="material-symbols-outlined !text-[14px] text-gray-500">${iconName}</span>
                        <span class="text-[10px] font-bold uppercase text-gray-500">
                            ${point.type === 'hospital' ? 'Y tế' : point.type === 'food' ? 'Lương thực' : 'Trú ẩn'}
                        </span>
                    </div>
                    <h4 class="font-bold text-gray-800 text-sm mb-0.5">${point.name}</h4>
                    <div class="bg-gray-50 p-1.5 rounded border border-gray-100 mt-1">
                        <p class="text-[10px] text-gray-500">Trạng thái/Sức chứa:</p>
                        <p class="text-xs font-bold text-gray-800">${point.capacity}</p>
                    </div>
                </div>
              `;
              marker.bindPopup(popupContent, { closeButton: false, className: 'custom-popup', offset: [0, -12] });
              reliefMarkersRef.current.push(marker);
          });
      }

  }, [activeLayers]); 

  // Polling Flood Depth Status & Update Zones
  useEffect(() => {
    const fetchFloodStatus = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/flood-depth-status`, {
                headers: getAuthHeaders()
            });
            const json = await res.json();
            
            if (json.success && Array.isArray(json.data)) {
                const updates = [];
                const idsToFetch = [];
                
                json.data.forEach(item => {
                    const id = item.id;
                    // The API returns meters directly (e.g. 0.5 for 0.5m)
                    const newDepth = item.depth || 0;
                    const oldDepth = floodStatusRef.current[id] !== undefined ? floodStatusRef.current[id] : newDepth;
                    
                    // Update Flood Status Ref
                    floodStatusRef.current[id] = newDepth;

                    // If we don't have population data for this ID, mark it for fetching
                    if (populationCacheRef.current[id] === undefined) {
                        idsToFetch.push({ id, depth: newDepth });
                    }

                    // Logic to detect changes for Critical Zones
                    const isRising = newDepth > oldDepth;
                    const isFalling = newDepth < oldDepth;
                    
                    // Determine Severity - Update thresholds for meters
                    let severity = 'low';
                    if (newDepth > 1.0) severity = 'critical'; // > 1m
                    else if (newDepth > 0.5) severity = 'high'; // > 0.5m
                    else if (newDepth > 0.2) severity = 'medium'; // > 0.2m

                    // Check if this zone is already being tracked
                    const existingZone = zones.find(z => z.id === id);

                    if (existingZone) {
                        // Only update if there is a change in depth or status
                        if (isRising || isFalling || existingZone.level !== newDepth.toFixed(1)) {
                            updates.push({
                                ...existingZone,
                                level: newDepth.toFixed(1),
                                severity: severity,
                                status: isRising ? 'rising' : (isFalling ? 'falling' : 'stable'),
                                timestamp: Date.now() 
                            });
                        }
                    } else if (newDepth > 0.2) {
                        // New potential zone (> 0.2m)
                    }
                });

                // Send updates for existing zones immediately
                if (updates.length > 0 && onCriticalZonesUpdate) {
                    onCriticalZonesUpdate(updates);
                }

                // Fetch details for ALL new IDs (to get population for global stats)
                if (idsToFetch.length > 0) {
                    Promise.all(idsToFetch.map(item => fetchZoneDetails(item.id, item.depth)));
                }
            }
        } catch (err) {
            console.error("Error polling flood status:", err);
        }
    };

    const fetchZoneDetails = async (id, depth) => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/get-board/${id}`, {
                headers: getAuthHeaders()
            });
            const json = await res.json();
            
            if (json.success && json.data) {
                const { tags, bounds } = json.data;
                const name = tags.name || `Khu vực #${id}`;
                const province = "Thừa Thiên Huế"; 
                // Depth is already in meters
                const levelM = depth.toFixed(1);
                
                // 1. Cache Population
                let pop = 0;
                if (tags && tags.population) {
                    const rawPop = tags.population.toString().replace(/,/g, '');
                    pop = parseInt(rawPop, 10);
                }
                if (isNaN(pop)) pop = 0;
                populationCacheRef.current[id] = pop;

                // 2. Create Critical Zone if severity matches (Meters thresholds)
                let severity = 'low';
                if (depth > 1.0) severity = 'critical';
                else if (depth > 0.5) severity = 'high';
                else if (depth > 0.2) severity = 'medium';

                if (severity !== 'low') {
                    const newZone = {
                        id: id,
                        location: name,
                        district: province,
                        level: levelM,
                        severity: severity,
                        timestamp: Date.now(), 
                        status: 'rising', 
                        bounds: bounds,
                        rawData: json.data 
                    };
                    if (onCriticalZonesUpdate) {
                        onCriticalZonesUpdate([newZone]);
                    }
                }

                // 3. Update global stats after fetching (if idle)
                if (!selectedZoneId && !selectionCoords) {
                    calculateAndSetGlobalStats();
                }
            }
        } catch (err) {
            console.error("Error fetching zone details:", err);
        }
    };

    fetchFloodStatus();
    const intervalId = setInterval(fetchFloodStatus, 10000); // Poll every 10s
    return () => clearInterval(intervalId);
  }, [zones, selectedZoneId, selectionCoords, onCriticalZonesUpdate, onStatsUpdate, token]); 

  // Handle FlyTo Zone (Bounds or Lat/Lng)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedZoneId) return;

    const selectedZone = zones.find(z => z.id === selectedZoneId);
    if (selectedZone) {
        if (selectedZone.bounds) {
            const { minlat, minlon, maxlat, maxlon } = selectedZone.bounds;
            const bounds = L.latLngBounds([minlat, minlon], [maxlat, maxlon]);
            map.flyToBounds(bounds, { animate: true, duration: 1.2, padding: [50, 50] });
        } else if (selectedZone.x && selectedZone.y) {
             const centerLat = 16.4637;
             const centerLng = 107.5909;
             const lat = centerLat - ((selectedZone.y - 50) / 100) * 0.1;
             const lng = centerLng + ((selectedZone.x - 50) / 100) * 0.1;
             map.flyTo([lat, lng], 14, { animate: true });
        }
        
        const marker = markersRef.current[selectedZoneId];
        if (marker) marker.openPopup();
        
        // Update stats for the specific zone
        const pop = populationCacheRef.current[selectedZoneId] || 0;
        const depth = floodStatusRef.current[selectedZoneId] || parseFloat(selectedZone.level);
        
        if (onStatsUpdate) {
             onStatsUpdate({
                population: pop,
                avgFloodLevel: depth.toFixed(2),
                food: (pop * 0.05 / 1000).toFixed(1),
                workers: Math.floor(pop / 1000) + 5
            });
        }
    }
  }, [selectedZoneId, zones]);


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

    try {
      // Map the selected timeframe directly to supported API params
      const supportedTimes = ['now', 'future-5', 'future-30'];
      const timeParam = supportedTimes.includes(timeFrame?.id) ? timeFrame.id : 'now';

      const response = await fetch(`${API_BASE_URL}/flood-depth/map?time=${timeParam}&t=${Date.now()}`, {
        headers: getAuthHeaders()
      });
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
      }
    } finally {
      setIsLoadingHeatmap(false);
    }
  };

  // Reload heatmap when timeFrame changes
  useEffect(() => {
    if (mapInstanceRef.current && timeFrame) {
        loadFloodHeatmap(mapInstanceRef.current);
    }
  }, [timeFrame]);

  // Toggle heatmap visibility
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

  // Update heatmap opacity
  useEffect(() => {
    if (heatmapOverlayRef.current) {
      heatmapOverlayRef.current.setOpacity(heatmapOpacity);
    }
  }, [heatmapOpacity]);

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
            headers: getAuthHeaders(),
            body: JSON.stringify(payload),
            signal
        });
        const json = await res.json();

        if (json.success && json.data.wards) {
            const fetchPromises = json.data.wards.map(async (ward) => {
                try {
                    // Check cache first for population
                    let pop = populationCacheRef.current[ward.id];
                    let detailJson;

                    // If not in cache or we need geometry anyway, fetch it
                    const detailRes = await fetch(`${API_BASE_URL}/admin/get-board/${ward.id}`, { 
                        signal,
                        headers: getAuthHeaders()
                    });
                    detailJson = await detailRes.json();
                    
                    if (detailJson.success && detailJson.data) {
                        // Draw borders
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
                        
                        // Parse Population if not cached
                        if (pop === undefined && detailJson.data.tags && detailJson.data.tags.population) {
                            const rawPop = detailJson.data.tags.population.toString().replace(/,/g, '');
                            pop = parseInt(rawPop, 10);
                            if (!isNaN(pop)) {
                                populationCacheRef.current[ward.id] = pop; // Update Cache
                            }
                        }
                    }
                    
                    if (pop === undefined) pop = 0;

                    let depth = 0;
                    if (floodStatusRef.current && floodStatusRef.current[ward.id] !== undefined) {
                        depth = floodStatusRef.current[ward.id];
                    } else if (detailJson?.data?.tags?.flood_depth) {
                        depth = parseFloat(detailJson.data.tags.flood_depth);
                    }
                    if (isNaN(depth)) depth = 0;

                    return { pop, depth };
                } catch (err) { }
                return { pop: 0, depth: 0 };
            });

            const results = await Promise.all(fetchPromises);
            
            const totalPopulation = results.reduce((sum, current) => sum + current.pop, 0);
            const totalDepth = results.reduce((sum, curr) => sum + curr.depth, 0);
            const validCount = results.filter(r => r.depth > 0 || r.pop > 0).length;
            const avgFloodDepth = validCount > 0 ? totalDepth / validCount : 0;

            return { totalPopulation, avgFloodDepth: avgFloodDepth };
        }
    } catch (error) {
        if (error.name !== 'AbortError') console.error("Error fetching borders:", error);
    }
    return null;
  };

  const fetchDistrictByPoint = async (lat, lng) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      setIsLoadingBorders(true);
      pointSelectionLayerRef.current.clearLayers();

      try {
          const payload = { lat, lng };
          
          const response = await fetch(`${API_BASE_URL}/admin/point-district`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify(payload)
          });
          const result = await response.json();

          if (result.success && result.data) {
              const { geometry, point } = result.data;

              if (geometry && geometry.length > 2) {
                  const hullPoints = getConvexHull(geometry);
                  const latlngs = hullPoints.map(p => [p.lat, p.lon]);
                  
                  L.polygon(latlngs, {
                      color: "#9333ea",
                      weight: 4,
                      opacity: 1,
                      fillColor: "#9333ea", 
                      fillOpacity: 0.15,
                      lineCap: 'round',
                      lineJoin: 'round',
                      smoothFactor: 1.0
                  }).addTo(pointSelectionLayerRef.current);
                  
                  const bounds = L.latLngBounds(latlngs);
                  map.flyToBounds(bounds, { padding: [80, 80], duration: 1.2 });
              }

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
             setPointSelectionData(null);
          }
      } catch (error) {
          console.error("Error fetching district by point:", error);
      } finally {
          setIsLoadingBorders(false);
          setIsPointSelectionMode(false);
      }
  };

  // Handle Rectangle Selection
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
            const wardStats = await fetchAndDrawBorders(bounds);
           
            setSelectionCoords({
                nw: { lat: northWest.lat.toFixed(5), lng: northWest.lng.toFixed(5) },
                se: { lat: southEast.lat.toFixed(5), lng: southEast.lng.toFixed(5) },
            });

            if (onStatsUpdate) {
                const population = wardStats?.totalPopulation || 0;
                const avgDepth = wardStats?.avgFloodDepth || 0;

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

  // Handle Point Selection
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

  // Handle Markers & Polygons for Critical Zones
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers from map
    Object.values(markersRef.current).forEach((marker: any) => marker.remove());
    markersRef.current = {};
    
    // Clear existing polygons from map
    Object.values(polygonLayersRef.current).forEach((layer: any) => layer.remove());
    polygonLayersRef.current = {};

    zones.forEach(zone => {
      // 1. Prepare Boundary Polygon if rawData is available (BUT DO NOT ADD TO MAP YET)
      if (zone.rawData && zone.rawData.members) {
         // Determine color based on severity
         let color = '#3b82f6'; // blue (Low)
         if (zone.severity === 'critical') color = '#dc2626'; // red
         else if (zone.severity === 'high') color = '#f97316'; // orange
         else if (zone.severity === 'medium') color = '#eab308'; // yellow

         const group = L.featureGroup();
         zone.rawData.members.forEach((m) => {
            if (m.geometry && m.geometry.length > 1) {
                const latlngs = m.geometry.map((p) => [p.lat, p.lon]);
                L.polyline(latlngs, {
                    color: color,
                    weight: 3,
                    opacity: 0.8
                }).addTo(group);
            }
         });
         
         // Store in ref, don't add to map unless selected
         polygonLayersRef.current[zone.id] = group;
      }

      // 2. Draw Marker at Center (Always Visible)
      let lat, lng;
      if (zone.bounds) {
          lat = (zone.bounds.minlat + zone.bounds.maxlat) / 2;
          lng = (zone.bounds.minlon + zone.bounds.maxlon) / 2;
      } else if (zone.x && zone.y) {
          // Fallback
          lat = 16.4637 - ((zone.y - 50) / 100) * 0.1;
          lng = 107.5909 + ((zone.x - 50) / 100) * 0.1;
      }

      if (lat && lng) {
          let colorClass = 'bg-[#3b82f6]'; // blue
          let ringClass = 'ring-[#3b82f6]'; 
          if (zone.severity === 'critical') { colorClass = 'bg-[#dc2626]'; ringClass = 'ring-[#dc2626]'; }
          else if (zone.severity === 'high') { colorClass = 'bg-[#f97316]'; ringClass = 'ring-[#f97316]'; }
          else if (zone.severity === 'medium') { colorClass = 'bg-[#eab308]'; ringClass = 'ring-[#eab308]'; }

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
            // Check refs instead of state
            if (isSelectionModeRef.current || isPointSelectionModeRef.current) return;
            L.DomEvent.stopPropagation(e);
            onZoneSelect(zone.id);
          });
          
          const popupContent = `
            <div class="min-w-[180px] font-sans">
                 <div class="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                    <span class="font-bold px-2 py-0.5 rounded text-[10px] uppercase text-white ${
                        zone.severity === 'critical' ? 'bg-[#dc2626]' :
                        zone.severity === 'high' ? 'bg-[#f97316]' :
                        zone.severity === 'medium' ? 'bg-[#eab308]' : 'bg-[#3b82f6]'
                    }">Cảnh báo</span>
                </div>
                <p class="font-bold text-gray-800 text-sm mb-0.5">${zone.location}</p>
                <p class="text-xs text-gray-500 mb-2">${zone.district}</p>
                <div class="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                    <span class="text-gray-600 text-xs font-semibold">Mực nước:</span>
                    <span class="font-bold text-red-600 text-sm">${zone.level}m</span>
                </div>
                ${isLoggedIn ? `
                <button class="send-alert-btn w-full mt-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold py-1.5 px-2 rounded border border-red-200 flex items-center justify-center gap-1 transition-colors" data-zone-id="${zone.id}">
                    <span class="material-symbols-outlined !text-[14px] pointer-events-none">campaign</span>
                    Gửi cảnh báo tới UBND
                </button>
                ` : ''}
            </div>
          `;
          marker.bindPopup(popupContent, { closeButton: false, className: 'custom-popup', offset: [0, -10] });
          if (isSelected) marker.openPopup();
          markersRef.current[zone.id] = marker;
      }
    });

    // 3. Only add the polygon layer for the SELECTED zone to the map
    if (selectedZoneId && polygonLayersRef.current[selectedZoneId]) {
        polygonLayersRef.current[selectedZoneId].addTo(map);
    }

  }, [zones, selectedZoneId, onZoneSelect, isLoggedIn]); 

  return (
    <div className="absolute inset-0 w-full h-full bg-gray-200">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Status & Timestamp */}
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-md text-xs font-bold text-primary flex items-center gap-2 transition-opacity duration-300 z-[1000] pointer-events-none`}>
            {isLoadingHeatmap ? (
                <>
                    <span className="material-symbols-outlined !text-[16px] animate-spin">sync</span>
                    {timeFrame ? `Đang tải: ${timeFrame.label}...` : "Đang tải bản đồ ngập..."}
                </>
            ) : (
                <>
                    <span className="material-symbols-outlined !text-[16px]">history</span>
                    Thời gian: <span className="text-blue-600">{timeFrame ? timeFrame.label : "Hiện tại"}</span>
                </>
            )}
        </div>

        {/* Loading Indicator */}
        {isLoadingBorders && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-primary/90 text-white backdrop-blur px-4 py-2 rounded-full shadow-xl text-xs font-bold flex items-center gap-2 z-[1000] pointer-events-none animate-bounce">
                <span className="material-symbols-outlined !text-[16px] animate-spin">analytics</span>
                Đang phân tích dữ liệu...
            </div>
        )}

        {/* Dispatch Panel Integration - Only when logged in */}
        {isLoggedIn && (
            <DispatchPanel isOpen={isDispatchOpen} onClose={() => setIsDispatchOpen(false)} />
        )}

        {/* Selection Details Panel */}
        {selectionCoords && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur shadow-2xl rounded-xl p-4 border border-white/50 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-lg w-full">
             <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
                <span className="material-symbols-outlined text-primary">area_chart</span>
                <span className="font-bold text-gray-800 text-sm">Kết Quả Phân Tích Vùng</span>
                <button 
                  type="button"
                  onClick={() => {
                    setSelectionCoords(null);
                    if(selectionRectRef.current) {
                      selectionRectRef.current.remove();
                      selectionRectRef.current = null;
                    }
                    borderLayersRef.current.forEach(layer => layer.remove());
                    borderLayersRef.current = [];
                    // Recalculate global stats on deselect
                    calculateAndSetGlobalStats();
                  }}
                  className="ml-auto hover:bg-gray-100 rounded-full p-1 transition-colors"
                >
                  <span className="material-symbols-outlined !text-[18px] text-gray-400">close</span>
                </button>
             </div>
             <div className="text-center py-2 text-gray-500 text-xs italic">
                Đã chọn vùng: {selectionCoords.nw.lat}, {selectionCoords.nw.lng}
             </div>
          </div>
        )}

        {/* Heatmap Controls & Legend */}
        {showHeatmap && heatmapData && !isLoadingHeatmap && (
            <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50 w-64">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="font-bold text-gray-800 text-sm">Bản đồ ngập lụt</h3>
                        <p className="text-[10px] text-gray-500">Độ sâu ngập (mét)</p>
                    </div>
                    <div className="flex gap-1">
                        <button 
                          type="button"
                          onClick={() => loadFloodHeatmap(mapInstanceRef.current)} 
                          className="p-1 hover:bg-gray-100 rounded text-gray-500" 
                          title="Làm mới"
                        >
                            <span className="material-symbols-outlined !text-[16px]">refresh</span>
                        </button>
                        <button 
                          type="button"
                          onClick={() => setShowHeatmap(false)} 
                          className="p-1 hover:bg-gray-100 rounded text-gray-500" 
                          title="Ẩn"
                        >
                            <span className="material-symbols-outlined !text-[16px]">visibility_off</span>
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
            {/* Zoom Controls */}
            <div className="flex flex-col rounded-xl bg-white/90 shadow-lg backdrop-blur-sm ring-1 ring-black/5 overflow-hidden">
                <button 
                  type="button"
                  onClick={() => { if(mapInstanceRef.current) mapInstanceRef.current.zoomIn(); }} 
                  className="h-10 w-10 flex items-center justify-center hover:bg-gray-50 border-b border-gray-100 transition-colors">
                    <span className="material-symbols-outlined text-gray-700 !text-[20px]">add</span>
                </button>
                <button 
                  type="button"
                  onClick={() => { if(mapInstanceRef.current) mapInstanceRef.current.zoomOut(); }} 
                  className="h-10 w-10 flex items-center justify-center hover:bg-gray-50 transition-colors">
                    <span className="material-symbols-outlined text-gray-700 !text-[20px]">remove</span>
                </button>
            </div>

            {/* Heatmap Toggle */}
            <div className="flex flex-col rounded-xl bg-white/90 shadow-lg backdrop-blur-sm ring-1 ring-black/5 overflow-hidden mt-2">
                 <button 
                    type="button"
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className={`h-10 w-10 flex items-center justify-center transition-colors ${showHeatmap ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-600'}`}
                    title="Bật/Tắt bản đồ ngập"
                >
                    <span className="material-symbols-outlined !text-[20px]">layers</span>
                </button>
            </div>

            {/* Toggle Dispatch Panel Button - Only when logged in */}
            {isLoggedIn && (
                <button
                    type="button"
                    onClick={() => setIsDispatchOpen(!isDispatchOpen)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-lg backdrop-blur-sm ring-1 ring-black/5 transition-all mt-2 ${
                        isDispatchOpen 
                        ? 'bg-primary text-white ring-primary' 
                        : 'bg-white/90 hover:bg-gray-100 text-gray-700'
                    }`}
                    title="Gửi tin nhắn điều phối"
                >
                    <span className="material-symbols-outlined !text-[20px]">{isDispatchOpen ? 'chat' : 'campaign'}</span>
                </button>
            )}

            {/* Selection Tool Button */}
            <button 
                type="button"
                onClick={() => {
                    setIsSelectionMode(!isSelectionMode);
                    setIsPointSelectionMode(false);
                    setPointSelectionData(null);
                    pointSelectionLayerRef.current.clearLayers();
                }}
                className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-lg backdrop-blur-sm ring-1 ring-black/5 transition-all mt-2 ${
                    isSelectionMode 
                    ? 'bg-primary text-white ring-primary' 
                    : 'bg-white/90 hover:bg-gray-100 text-gray-700'
                }`}
                title="Chọn vùng (Hình chữ nhật)"
            >
                <span className="material-symbols-outlined !text-[20px]">
                  {isSelectionMode ? 'check_box' : 'crop_free'}
                </span>
            </button>
            
            <button 
               type="button"
               onClick={() => { if(mapInstanceRef.current) mapInstanceRef.current.setView([16.4637, 107.5909], 12); }}
               className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/90 shadow-lg backdrop-blur-sm hover:bg-gray-100 ring-1 ring-black/5 transition-colors mt-2">
                <span className="material-symbols-outlined text-gray-700 !text-[20px]">my_location</span>
            </button>
        </div>
    </div>
  );
};