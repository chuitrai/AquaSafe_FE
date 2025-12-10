import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

// API Configuration
const API_BASE_URL = "http://localhost:8220/api";

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

export const MonitoringMap = ({ zones, selectedZoneId, onZoneSelect, onStatsUpdate, onCriticalZonesUpdate, searchLocation, timeFrame, activeLayers, isLoggedIn }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const polygonLayersRef = useRef({}); 
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
  
  // Real-time Flood Status
  const floodStatusRef = useRef({});
  const currentMaxFloodIdRef = useRef(null);
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  // Rectangle Selection Tool State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectionCoords, setSelectionCoords] = useState(null);
  const isDrawingRef = useRef(false);
  const startLatLngRef = useRef(null);

  // Point Selection Tool State
  const [isPointSelectionMode, setIsPointSelectionMode] = useState(false);
  const [pointSelectionData, setPointSelectionData] = useState(null);

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

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Polling Flood Depth Status & Auto-Fetch Critical Zones
  useEffect(() => {
    const fetchFloodStatus = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/flood-depth-status`);
            const json = await res.json();
            
            if (json.success && Array.isArray(json.data)) {
                const statusMap = {};
                let totalDepth = 0;
                let validCount = 0;
                
                // Find max depth
                let maxDepthItem = { id: null, depth: -1 };

                json.data.forEach(item => {
                    statusMap[item.id] = item.depth;
                    totalDepth += (item.depth || 0);
                    validCount++;

                    if (item.depth > maxDepthItem.depth) {
                        maxDepthItem = item;
                    }
                });

                floodStatusRef.current = statusMap;
                setLastUpdated(Date.now());

                // Update Global Stats
                if (!selectedZoneId && !selectionCoords && onStatsUpdate) {
                    const globalAvgDepthMm = validCount > 0 ? totalDepth / validCount : 0;
                    const globalAvgDepthM = globalAvgDepthMm / 1000;
                    const estimatedPop = validCount * 12500; 

                    onStatsUpdate({
                        population: estimatedPop,
                        avgFloodLevel: globalAvgDepthM.toFixed(2),
                        food: (estimatedPop * 0.05 / 1000).toFixed(1),
                        workers: Math.floor(estimatedPop / 2000) + 10
                    });
                }

                // Logic to update Critical Zone if Max Depth changes or new high flood detected
                if (maxDepthItem.id && maxDepthItem.depth > 0) {
                     // Check if we need to fetch details for this ward (if it's new or depth changed siginificantly)
                     // For simplicity, we fetch if it's the new max ID or we haven't fetched it yet.
                     if (currentMaxFloodIdRef.current !== maxDepthItem.id) {
                         currentMaxFloodIdRef.current = maxDepthItem.id;
                         fetchCriticalZoneDetails(maxDepthItem.id, maxDepthItem.depth);
                     } else {
                         // Update existing zone level in UI if ID is same but depth changed? 
                         // For now, rely on re-fetch or internal state update.
                         // Optimization: could just update the level in the criticalZones list without re-fetching geometry.
                     }
                }
            }
        } catch (err) {
            console.error("Error polling flood status:", err);
        }
    };

    const fetchCriticalZoneDetails = async (id, depthMm) => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/get-board/${id}`);
            const json = await res.json();
            
            if (json.success && json.data) {
                const { tags, bounds } = json.data;
                const name = tags.name || `Khu vực #${id}`;
                const province = "Thừa Thiên Huế"; // Context is Hue
                const levelM = (depthMm / 1000).toFixed(1);
                
                // Determine severity
                let severity = 'medium';
                if (depthMm > 1000) severity = 'critical'; // > 1m
                else if (depthMm > 500) severity = 'high'; // > 0.5m

                const newZone = {
                    id: id,
                    location: name,
                    district: province,
                    level: levelM,
                    severity: severity,
                    updated: 'Vừa xong',
                    status: 'rising', // Simplified trend
                    bounds: bounds, // Store raw bounds for FlyTo
                    rawData: json.data // Store for drawing
                };
                
                if (onCriticalZonesUpdate) {
                    onCriticalZonesUpdate([newZone]);
                }
            }
        } catch (err) {
            console.error("Error fetching critical zone details:", err);
        }
    };

    fetchFloodStatus();
    const intervalId = setInterval(fetchFloodStatus, 10000); // 10 seconds
    return () => clearInterval(intervalId);
  }, [selectedZoneId, selectionCoords]); 

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
            // Fallback for mock data if still used
             const centerLat = 16.4637;
             const centerLng = 107.5909;
             const lat = centerLat - ((selectedZone.y - 50) / 100) * 0.1;
             const lng = centerLng + ((selectedZone.x - 50) / 100) * 0.1;
             map.flyTo([lat, lng], 14, { animate: true });
        }
        
        const marker = markersRef.current[selectedZoneId];
        if (marker) marker.openPopup();
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
                        
                        let pop = 0;
                        if (detailJson.data.tags && detailJson.data.tags.population) {
                            const rawPop = detailJson.data.tags.population.toString().replace(/,/g, '');
                            pop = parseInt(rawPop, 10);
                            if (isNaN(pop)) pop = 0;
                        }

                        let depthMm = 0;
                        if (floodStatusRef.current && floodStatusRef.current[ward.id] !== undefined) {
                            depthMm = floodStatusRef.current[ward.id];
                        } else if (detailJson.data.tags && detailJson.data.tags.flood_depth) {
                            depthMm = parseFloat(detailJson.data.tags.flood_depth);
                        }
                        if (isNaN(depthMm)) depthMm = 0;

                        return { pop, depthMm };
                    }
                } catch (err) { }
                return { pop: 0, depthMm: 0 };
            });

            const results = await Promise.all(fetchPromises);
            
            const totalPopulation = results.reduce((sum, current) => sum + current.pop, 0);
            const totalDepthMm = results.reduce((sum, curr) => sum + curr.depthMm, 0);
            const avgFloodDepthMm = results.length > 0 ? totalDepthMm / results.length : 0;
            const avgFloodDepthM = avgFloodDepthMm / 1000;

            return { totalPopulation, avgFloodDepth: avgFloodDepthM };
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
              headers: { 'Content-Type': 'application/json' },
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

    // Clear existing
    Object.values(markersRef.current).forEach((marker: any) => marker.remove());
    markersRef.current = {};
    Object.values(polygonLayersRef.current).forEach((layer: any) => layer.remove());
    polygonLayersRef.current = {};

    zones.forEach(zone => {
      // 1. Draw Boundary Polygon if rawData is available
      if (zone.rawData && zone.rawData.members) {
         // Determine color based on severity
         let color = '#3b82f6'; // blue
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
         group.addTo(map);
         polygonLayersRef.current[zone.id] = group;
      }

      // 2. Draw Marker at Center
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
          
          const popupContent = `
            <div class="min-w-[180px] font-sans">
                 <div class="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                    <span class="font-bold px-2 py-0.5 rounded text-[10px] uppercase text-white ${
                        zone.severity === 'critical' ? 'bg-red-500' :
                        zone.severity === 'high' ? 'bg-orange-500' :
                        zone.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                    }">Cảnh báo</span>
                </div>
                <p class="font-bold text-gray-800 text-sm mb-0.5">${zone.location}</p>
                <p class="text-xs text-gray-500 mb-2">${zone.district}</p>
                <div class="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                    <span class="text-gray-600 text-xs font-semibold">Mực nước:</span>
                    <span class="font-bold text-red-600 text-sm">${zone.level}m</span>
                </div>
            </div>
          `;
          marker.bindPopup(popupContent, { closeButton: false, className: 'custom-popup', offset: [0, -10] });
          if (isSelected) marker.openPopup();
          markersRef.current[zone.id] = marker;
      }
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
        mapInstanceRef.current.setView([16.4637, 107.5909], 12);
     }
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-gray-200">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Status */}
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-md text-xs font-bold text-primary flex items-center gap-2 transition-opacity duration-300 z-[1000] pointer-events-none`}>
            <span className="material-symbols-outlined !text-[16px]">history</span>
            Thời gian: <span className="text-blue-600">{timeFrame ? timeFrame.label : "Hiện tại"}</span>
        </div>

        {/* Loading Indicator */}
        {isLoadingBorders && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-primary/90 text-white backdrop-blur px-4 py-2 rounded-full shadow-xl text-xs font-bold flex items-center gap-2 z-[1000] pointer-events-none animate-bounce">
                <span className="material-symbols-outlined !text-[16px] animate-spin">analytics</span>
                Đang phân tích dữ liệu...
            </div>
        )}

        {/* Selection Details Panel */}
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
                    if (onStatsUpdate) {
                         const statusMap = floodStatusRef.current;
                         if (Object.keys(statusMap).length > 0) {
                             let totalDepth = 0;
                             let count = 0;
                             Object.values(statusMap).forEach(d => { totalDepth += (d as number); count++; });
                             const estPop = count * 12500;
                             onStatsUpdate({
                                population: estPop,
                                avgFloodLevel: (count > 0 ? (totalDepth/count)/1000 : 0).toFixed(2),
                                food: (estPop * 0.05 / 1000).toFixed(1),
                                workers: Math.floor(estPop / 2000) + 10
                             });
                         } else {
                             onStatsUpdate(null);
                         }
                    }
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
            
            <button onClick={handleLocate} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/90 shadow-lg backdrop-blur-sm hover:bg-gray-50 ring-1 ring-black/5 transition-colors mt-2">
                <span className="material-symbols-outlined text-gray-700 !text-[20px]">my_location</span>
            </button>
        </div>
    </div>
  );
};