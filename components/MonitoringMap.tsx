
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { DispatchPanel } from './DispatchPanel';
import { MapControls } from './map/MapControls';
import { MapLegend } from './map/MapLegend';
import { SelectionInfo } from './map/SelectionInfo';
import { useFloodHeatmap } from '../hooks/useFloodHeatmap';
import { 
    API_BASE_URL, 
    HUE_CENTER, 
    getAuthHeaders, 
    getConvexHull,
    MOCK_RESCUE_TEAMS, 
    MOCK_RELIEF_POINTS, 
    MOCK_DEMO_ZONES 
} from '../utils/monitoringConstants';

export const MonitoringMap = ({ zones, selectedZoneId, onZoneSelect, onStatsUpdate, onCriticalZonesUpdate, searchLocation, timeFrame, activeLayers, isLoggedIn, token, onOpenAlertModal }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const polygonLayersRef = useRef({}); 
  
  // Layer Refs
  const rescueMarkersRef = useRef([]);
  const reliefMarkersRef = useRef([]);

  // Selection Area Refs
  const selectionRectRef = useRef(null);
  const borderLayersRef = useRef([]); 
  const pointSelectionLayerRef = useRef(L.layerGroup()); 
  
  const abortControllerRef = useRef(null);
  const searchMarkerRef = useRef(null);

  const [isLoadingBorders, setIsLoadingBorders] = useState(false);
  
  // Real-time Flood Status & Population Cache
  const floodStatusRef = useRef({});
  const populationCacheRef = useRef({});
  
  // Selection Tool State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectionCoords, setSelectionCoords] = useState(null);
  const isDrawingRef = useRef(false);
  const startLatLngRef = useRef(null);

  const [isPointSelectionMode, setIsPointSelectionMode] = useState(false);
  const [pointSelectionData, setPointSelectionData] = useState(null);

  const [isDispatchOpen, setIsDispatchOpen] = useState(false);

  // Refs for event listeners
  const isSelectionModeRef = useRef(isSelectionMode);
  const isPointSelectionModeRef = useRef(isPointSelectionMode);

  // Use Custom Hook for Heatmap
  const {
      isLoadingHeatmap,
      heatmapData,
      showHeatmap,
      setShowHeatmap,
      heatmapOpacity,
      setHeatmapOpacity,
      loadFloodHeatmap
  } = useFloodHeatmap(mapInstanceRef.current, timeFrame, token);

  // Sync refs with state
  useEffect(() => {
    isSelectionModeRef.current = isSelectionMode;
  }, [isSelectionMode]);

  useEffect(() => {
    isPointSelectionModeRef.current = isPointSelectionMode;
  }, [isPointSelectionMode]);

  // Handle Event Delegation for Alert Buttons
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

  // Inject Mock Data on Mount
  useEffect(() => {
    if (onCriticalZonesUpdate) {
        onCriticalZonesUpdate(MOCK_DEMO_ZONES);
    }
  }, []); 

  // --- Map Initialization ---
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([HUE_CENTER.lat, HUE_CENTER.lng], 12); 

    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.attribution({ position: 'bottomright', prefix: 'OSM' }).addTo(map);
    pointSelectionLayerRef.current.addTo(map);

    // Initial Heatmap Load handled by Hook when mapInstance changes

    map.on('click', () => {
        if (isSelectionModeRef.current || isPointSelectionModeRef.current) return;
        handleDeselect();
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []); 

  // --- Logic Functions ---

  const handleDeselect = () => {
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
  };

  const calculateAndSetGlobalStats = () => {
      if (!onStatsUpdate) return;
      const statusMap = floodStatusRef.current;
      const popMap = populationCacheRef.current;
      const ids = Object.keys(statusMap);
      
      if (ids.length === 0) {
          onStatsUpdate(null);
          return;
      }

      let totalDepthMm = 0;
      let totalPopulation = 0;
      let validDepthCount = 0;

      ids.forEach(id => {
          const depth = statusMap[id] || 0;
          totalDepthMm += depth;
          validDepthCount++;
          if (popMap[id]) totalPopulation += popMap[id];
      });

      const avgFloodDepthMm = validDepthCount > 0 ? totalDepthMm / validDepthCount : 0;
      if (totalPopulation === 0 && validDepthCount > 0) totalPopulation = validDepthCount * 5000; 

      onStatsUpdate({
          population: totalPopulation,
          avgFloodLevel: (avgFloodDepthMm / 1000).toFixed(2),
          food: (totalPopulation * 0.05 / 1000).toFixed(1),
          workers: Math.floor(totalPopulation / 1000) + 20
      });
  };

  // --- Selection & Border Logic ---

  const fetchAndDrawBorders = async (bounds) => {
    const map = mapInstanceRef.current;
    if (!map) return null;
    if (abortControllerRef.current) abortControllerRef.current.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;
    
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
            headers: getAuthHeaders(token),
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        const json = await res.json();

        if (json.success && json.data.wards) {
            const fetchPromises = json.data.wards.map(async (ward) => {
                try {
                    let pop = populationCacheRef.current[ward.id];
                    let detailJson;

                    const detailRes = await fetch(`${API_BASE_URL}/admin/get-board/${ward.id}`, { 
                        signal: controller.signal,
                        headers: getAuthHeaders(token)
                    });
                    detailJson = await detailRes.json();
                    
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
                        
                        if (pop === undefined && detailJson.data.tags && detailJson.data.tags.population) {
                            const rawPop = detailJson.data.tags.population.toString().replace(/,/g, '');
                            pop = parseInt(rawPop, 10);
                            if (!isNaN(pop)) populationCacheRef.current[ward.id] = pop;
                        }
                    }
                    if (pop === undefined) pop = 0;

                    let depthMm = 0;
                    if (floodStatusRef.current && floodStatusRef.current[ward.id] !== undefined) {
                        depthMm = floodStatusRef.current[ward.id];
                    } else if (detailJson?.data?.tags?.flood_depth) {
                        depthMm = parseFloat(detailJson.data.tags.flood_depth);
                    }
                    if (isNaN(depthMm)) depthMm = 0;
                    return { pop, depthMm };
                } catch (err) { }
                return { pop: 0, depthMm: 0 };
            });

            const results = await Promise.all(fetchPromises);
            const totalPopulation = results.reduce((sum, current) => sum + current.pop, 0);
            const totalDepthMm = results.reduce((sum, curr) => sum + curr.depthMm, 0);
            const validCount = results.filter(r => r.depthMm > 0 || r.pop > 0).length;
            const avgFloodDepthMm = validCount > 0 ? totalDepthMm / validCount : 0;

            return { totalPopulation, avgFloodDepth: avgFloodDepthMm / 1000 };
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
              headers: getAuthHeaders(token),
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
                  html: '<div class="relative flex items-center justify-center -translate-y-1"><span class="material-symbols-outlined text-purple-600 !text-[36px] drop-shadow-md">location_on</span></div>',
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

  // --- Effects: Data Polling & UI Layers ---

  // Handle Rescue & Relief Layers
  useEffect(() => {
      const map = mapInstanceRef.current;
      if (!map) return;

      rescueMarkersRef.current.forEach(m => m.remove());
      rescueMarkersRef.current = [];
      reliefMarkersRef.current.forEach(m => m.remove());
      reliefMarkersRef.current = [];

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
              const icon = L.divIcon({ html: iconHtml, className: 'custom-div-icon', iconSize: [32, 32], iconAnchor: [16, 16] });
              const marker = L.marker([team.lat, team.lng], { icon }).addTo(map);
              const popupContent = `<div class="min-w-[150px]"><h4 class="font-bold text-gray-800 text-sm">${team.name}</h4><p class="text-xs text-gray-500 italic">ID: ${team.id}</p></div>`;
              marker.bindPopup(popupContent, { closeButton: false, className: 'custom-popup', offset: [0, -10] });
              rescueMarkersRef.current.push(marker);
          });
      }

      if (activeLayers && activeLayers.includes('Điểm cứu trợ')) {
          MOCK_RELIEF_POINTS.forEach(point => {
              let iconName = point.type === 'hospital' ? 'local_hospital' : point.type === 'food' ? 'inventory_2' : 'roofing';
              let bgClass = point.type === 'hospital' ? 'bg-red-500' : point.type === 'food' ? 'bg-orange-500' : 'bg-green-600';
              const iconHtml = `
                <div class="relative flex items-center justify-center">
                     <div class="w-8 h-8 rounded-lg shadow-md border-2 border-white ${bgClass} flex items-center justify-center text-white transform rotate-45">
                        <span class="material-symbols-outlined !text-[18px] -rotate-45">${iconName}</span>
                    </div>
                </div>
              `;
              const icon = L.divIcon({ html: iconHtml, className: 'custom-div-icon', iconSize: [32, 32], iconAnchor: [16, 16] });
              const marker = L.marker([point.lat, point.lng], { icon }).addTo(map);
              const popupContent = `<div class="min-w-[160px]"><h4 class="font-bold text-gray-800 text-sm mb-0.5">${point.name}</h4><p class="text-xs font-bold text-gray-800">${point.capacity}</p></div>`;
              marker.bindPopup(popupContent, { closeButton: false, className: 'custom-popup', offset: [0, -12] });
              reliefMarkersRef.current.push(marker);
          });
      }
  }, [activeLayers]); 

  // Polling Flood Depth
  useEffect(() => {
    const fetchFloodStatus = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/flood-depth-status`, { headers: getAuthHeaders(token) });
            const json = await res.json();
            
            if (json.success && Array.isArray(json.data)) {
                const updates = [];
                const idsToFetch = [];
                
                json.data.forEach(item => {
                    const id = item.id;
                    const newDepthMm = item.depth || 0;
                    const oldDepthMm = floodStatusRef.current[id] !== undefined ? floodStatusRef.current[id] : newDepthMm;
                    
                    floodStatusRef.current[id] = newDepthMm;

                    if (populationCacheRef.current[id] === undefined) {
                        idsToFetch.push({ id, depthMm: newDepthMm });
                    }

                    const isRising = newDepthMm > oldDepthMm;
                    const isFalling = newDepthMm < oldDepthMm;
                    let severity = 'low';
                    if (newDepthMm > 1000) severity = 'critical';
                    else if (newDepthMm > 500) severity = 'high';
                    else if (newDepthMm > 200) severity = 'medium';

                    const existingZone = zones.find(z => z.id === id);

                    if (existingZone) {
                        if (isRising || isFalling || existingZone.level !== (newDepthMm / 1000).toFixed(1)) {
                            updates.push({
                                ...existingZone,
                                level: (newDepthMm / 1000).toFixed(1),
                                severity: severity,
                                status: isRising ? 'rising' : (isFalling ? 'falling' : 'stable'),
                                timestamp: Date.now() 
                            });
                        }
                    } 
                });

                if (updates.length > 0 && onCriticalZonesUpdate) {
                    onCriticalZonesUpdate(updates);
                }

                if (idsToFetch.length > 0) {
                    Promise.all(idsToFetch.map(item => fetchZoneDetails(item.id, item.depthMm)));
                }
            }
        } catch (err) {
            console.error("Error polling flood status:", err);
        }
    };

    const fetchZoneDetails = async (id, depthMm) => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/get-board/${id}`, { headers: getAuthHeaders(token) });
            const json = await res.json();
            
            if (json.success && json.data) {
                const { tags, bounds } = json.data;
                const name = tags.name || `Khu vực #${id}`;
                const levelM = (depthMm / 1000).toFixed(1);
                
                let pop = 0;
                if (tags && tags.population) {
                    pop = parseInt(tags.population.toString().replace(/,/g, ''), 10);
                }
                if (isNaN(pop)) pop = 0;
                populationCacheRef.current[id] = pop;

                let severity = 'low';
                if (depthMm > 1000) severity = 'critical';
                else if (depthMm > 500) severity = 'high';
                else if (depthMm > 200) severity = 'medium';

                if (severity !== 'low') {
                    const newZone = {
                        id: id,
                        location: name,
                        district: "Thừa Thiên Huế",
                        level: levelM,
                        severity: severity,
                        timestamp: Date.now(), 
                        status: 'rising', 
                        bounds: bounds,
                        rawData: json.data 
                    };
                    if (onCriticalZonesUpdate) onCriticalZonesUpdate([newZone]);
                }
                if (!selectedZoneId && !selectionCoords) calculateAndSetGlobalStats();
            }
        } catch (err) { }
    };

    fetchFloodStatus();
    const intervalId = setInterval(fetchFloodStatus, 10000);
    return () => clearInterval(intervalId);
  }, [zones, selectedZoneId, selectionCoords, onCriticalZonesUpdate, onStatsUpdate, token]); 

  // Handle Rectangle & Point Selection Interaction
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (isSelectionMode) {
      map.dragging.disable();
      map.getContainer().style.cursor = 'crosshair';
    } else if (isPointSelectionMode) {
      map.getContainer().style.cursor = 'help';
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
      selectionRectRef.current = L.rectangle(bounds, { color: "#0077C2", weight: 2, fillColor: "#0077C2", fillOpacity: 0.1 }).addTo(map);
    };

    const onMouseMove = (e) => {
      if (!isSelectionMode || !isDrawingRef.current || !startLatLngRef.current) return;
      const bounds = L.latLngBounds(startLatLngRef.current, e.latlng);
      if (selectionRectRef.current) selectionRectRef.current.setBounds(bounds);
    };

    const onMouseUp = async (e) => {
      if (!isSelectionMode || !isDrawingRef.current) return;
      isDrawingRef.current = false;
      if (selectionRectRef.current) {
        const bounds = selectionRectRef.current.getBounds();
        const nw = bounds.getNorthWest();
        const se = bounds.getSouthEast();
        setIsLoadingBorders(true);
        try {
            const wardStats = await fetchAndDrawBorders(bounds);
            setSelectionCoords({
                nw: { lat: nw.lat.toFixed(5), lng: nw.lng.toFixed(5) },
                se: { lat: se.lat.toFixed(5), lng: se.lng.toFixed(5) },
            });
            if (onStatsUpdate && wardStats) {
                onStatsUpdate({
                    population: wardStats.totalPopulation,
                    avgFloodLevel: wardStats.avgFloodDepth.toFixed(2),
                    food: (wardStats.totalPopulation * 0.05 / 1000).toFixed(1),
                    workers: Math.floor(wardStats.totalPopulation / 500) + 20
                });
            }
        } catch (err) { console.error(err); } 
        finally { setIsLoadingBorders(false); setIsSelectionMode(false); }
      }
    };

    const onClick = (e) => {
       if (isPointSelectionMode) fetchDistrictByPoint(e.latlng.lat, e.latlng.lng);
    };

    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);
    map.on('click', onClick);

    return () => {
      map.off('mousedown', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
      map.off('click', onClick);
    };
  }, [isSelectionMode, isPointSelectionMode]);

  // Handle Zone Markers & Polygons
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    Object.values(markersRef.current).forEach((marker: any) => marker.remove());
    markersRef.current = {};
    Object.values(polygonLayersRef.current).forEach((layer: any) => layer.remove());
    polygonLayersRef.current = {};

    zones.forEach(zone => {
      if (zone.rawData && zone.rawData.members) {
         let color = zone.severity === 'critical' ? '#dc2626' : zone.severity === 'high' ? '#f97316' : zone.severity === 'medium' ? '#eab308' : '#3b82f6';
         const group = L.featureGroup();
         zone.rawData.members.forEach((m) => {
            if (m.geometry && m.geometry.length > 1) {
                const latlngs = m.geometry.map((p) => [p.lat, p.lon]);
                L.polyline(latlngs, { color: color, weight: 3, opacity: 0.8 }).addTo(group);
            }
         });
         polygonLayersRef.current[zone.id] = group;
      }

      let lat, lng;
      if (zone.bounds) {
          lat = (zone.bounds.minlat + zone.bounds.maxlat) / 2;
          lng = (zone.bounds.minlon + zone.bounds.maxlon) / 2;
      } else if (zone.x && zone.y) {
          lat = 16.4637 - ((zone.y - 50) / 100) * 0.1;
          lng = 107.5909 + ((zone.x - 50) / 100) * 0.1;
      }

      if (lat && lng) {
          let colorClass = 'bg-[#3b82f6]';
          let ringClass = 'ring-[#3b82f6]'; 
          if (zone.severity === 'critical') { colorClass = 'bg-[#dc2626]'; ringClass = 'ring-[#dc2626]'; }
          else if (zone.severity === 'high') { colorClass = 'bg-[#f97316]'; ringClass = 'ring-[#f97316]'; }
          else if (zone.severity === 'medium') { colorClass = 'bg-[#eab308]'; ringClass = 'ring-[#eab308]'; }

          const isSelected = selectedZoneId === zone.id;
          const size = isSelected ? 'w-6 h-6' : 'w-4 h-4';
          const ring = isSelected ? `ring-4 ${ringClass} ring-opacity-30` : 'border-2 border-white shadow-lg';
          
          const icon = L.divIcon({
            html: `<div class="relative flex items-center justify-center">${(zone.severity === 'critical' || zone.severity === 'high' || isSelected) ? `<div class="absolute w-full h-full rounded-full animate-ping opacity-75 ${colorClass}"></div>` : ''}<div class="relative ${size} rounded-full transition-all duration-300 ${colorClass} ${ring}"></div></div>`,
            className: 'custom-div-icon', 
            iconSize: [24, 24], iconAnchor: [12, 12]
          });
          
          const marker = L.marker([lat, lng], { icon: icon }).addTo(map);
          marker.on('click', (e) => {
            if (isSelectionModeRef.current || isPointSelectionModeRef.current) return;
            L.DomEvent.stopPropagation(e);
            onZoneSelect(zone.id);
          });
          
          const popupContent = `
            <div class="min-w-[180px] font-sans">
                 <div class="flex items-center justify-between border-b border-gray-100 pb-2 mb-2"><span class="font-bold px-2 py-0.5 rounded text-[10px] uppercase text-white ${zone.severity === 'critical' ? 'bg-[#dc2626]' : zone.severity === 'high' ? 'bg-[#f97316]' : zone.severity === 'medium' ? 'bg-[#eab308]' : 'bg-[#3b82f6]'}">Cảnh báo</span></div>
                <p class="font-bold text-gray-800 text-sm mb-0.5">${zone.location}</p>
                <p class="text-xs text-gray-500 mb-2">${zone.district}</p>
                <div class="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200"><span class="text-gray-600 text-xs font-semibold">Mực nước:</span><span class="font-bold text-red-600 text-sm">${zone.level}m</span></div>
                ${isLoggedIn ? `<button class="send-alert-btn w-full mt-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold py-1.5 px-2 rounded border border-red-200 flex items-center justify-center gap-1 transition-colors" data-zone-id="${zone.id}"><span class="material-symbols-outlined !text-[14px] pointer-events-none">campaign</span>Gửi cảnh báo tới UBND</button>` : ''}
            </div>
          `;
          marker.bindPopup(popupContent, { closeButton: false, className: 'custom-popup', offset: [0, -10] });
          if (isSelected) marker.openPopup();
          markersRef.current[zone.id] = marker;
      }
    });

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

        {/* Dispatch Panel */}
        {isLoggedIn && (
            <DispatchPanel isOpen={isDispatchOpen} onClose={() => setIsDispatchOpen(false)} />
        )}

        {/* Selection Info */}
        <SelectionInfo selectionCoords={selectionCoords} onClear={handleDeselect} />

        {/* Map Legend */}
        <MapLegend 
            showHeatmap={showHeatmap}
            heatmapData={heatmapData}
            isLoadingHeatmap={isLoadingHeatmap}
            loadFloodHeatmap={loadFloodHeatmap}
            setShowHeatmap={setShowHeatmap}
            heatmapOpacity={heatmapOpacity}
            setHeatmapOpacity={setHeatmapOpacity}
        />

        {/* Map Controls */}
        <MapControls 
            mapInstance={mapInstanceRef.current}
            isLoggedIn={isLoggedIn}
            isDispatchOpen={isDispatchOpen}
            setIsDispatchOpen={setIsDispatchOpen}
            isSelectionMode={isSelectionMode}
            setIsSelectionMode={setIsSelectionMode}
            setIsPointSelectionMode={setIsPointSelectionMode}
            resetSelection={handleDeselect}
            showHeatmap={showHeatmap}
            setShowHeatmap={setShowHeatmap}
        />
    </div>
  );
};
