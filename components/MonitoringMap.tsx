import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

// API Configuration
const API_BASE_URL = "http://localhost:8220/api";

export const MonitoringMap = ({ zones, selectedZoneId, onZoneSelect, onStatsUpdate }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const overlayRef = useRef(null);
  const markersRef = useRef({});
  const selectionRectRef = useRef(null); // Ref for the rectangle layer
  const borderLayersRef = useRef([]); // Ref to store drawn API border layers
  const abortControllerRef = useRef(null); // Ref to manage API cancellation

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
      // Wait for next tick and additional delay for DOM readiness
      setTimeout(() => {
        // Ensure DOM is fully loaded before attempting overlay
        if (document.readyState === 'complete') {
          loadFloodHeatmap(map);
        } else {
          // If DOM not ready, wait for load event
          window.addEventListener('load', () => {
            setTimeout(() => loadFloodHeatmap(map), 500);
          }, { once: true });
        }
      }, 1500); // Increased delay for first load
    });

    // 5. Store map reference
    overlayRef.current = null;

    // Cleanup
    return () => {
      map.remove();
      mapInstanceRef.current = null;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Load flood depth heatmap from API
  const loadFloodHeatmap = async (map, retryCount = 0) => {
    if (!map) {
      console.warn('Map not available');
      return;
    }

    // Check if DOM is ready for overlay operations
    const container = map.getContainer();
    if (!container || !container.offsetParent) {
      if (retryCount < 3) {
        console.log(`Map container not ready, retry ${retryCount + 1}/3`);
        setTimeout(() => loadFloodHeatmap(map, retryCount + 1), 1000);
        return;
      }
    }

    setIsLoadingHeatmap(true);
    setHeatmapError(null);

    try {
      console.log('Loading flood depth heatmap from API...');
      
      const response = await fetch(`${API_BASE_URL}/flood-depth/map`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to load heatmap');
      }

      setHeatmapData(result.data);
      
      // Create image overlay with bounds from API
      const bounds = L.latLngBounds(
        [result.data.bounds.south, result.data.bounds.west],
        [result.data.bounds.north, result.data.bounds.east]
      );

      // Remove existing heatmap overlay
      if (heatmapOverlayRef.current && map.hasLayer(heatmapOverlayRef.current)) {
        try {
          map.removeLayer(heatmapOverlayRef.current);
        } catch (err) {
          console.warn('Error removing existing heatmap overlay:', err);
        }
      }

      // Create new overlay using image URL from server
      const imageUrl = `${API_BASE_URL.replace('/api', '')}${result.data.image_url}`;
      heatmapOverlayRef.current = L.imageOverlay(imageUrl, bounds, {
        opacity: heatmapOpacity,
        interactive: false,
        crossOrigin: true
      });

      // Add overlay if visible
      if (showHeatmap && heatmapOverlayRef.current) {
        try {
          // Final check for DOM readiness before adding overlay
          const container = map.getContainer();
          const overlayPane = map.getPane('overlayPane');
          
          if (container && overlayPane && container.offsetParent) {
            heatmapOverlayRef.current.addTo(map);
            console.log('Heatmap overlay added successfully');
          } else {
            throw new Error('Map panes not ready yet');
          }
        } catch (err) {
          console.error('Error adding heatmap overlay:', err);
          if (retryCount < 2) {
            console.log('Retrying overlay addition...');
            setTimeout(() => loadFloodHeatmap(map, retryCount + 1), 1000);
            return;
          } else {
            setHeatmapError('Failed to add heatmap overlay after retries');
          }
        }
      }

      // Also store in overlayRef for backward compatibility
      overlayRef.current = heatmapOverlayRef.current;

      console.log('Flood heatmap loaded successfully:', result.data);

    } catch (err: any) {
      console.error('Error loading flood heatmap:', err);
      setHeatmapError(err.message || 'Failed to load heatmap');
    } finally {
      setIsLoadingHeatmap(false);
    }
  };

  // Function to calculate region flood depth
  const calculateRegionFloodDepth = async (bounds) => {
    try {
      console.log('Calculating region flood depth for bounds:', bounds);
      
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
        console.log('Region flood depth analysis:', result.data);
        
        // Update stats với dữ liệu từ GeoTIFF thay vì mock data
        if (onStatsUpdate) {
          onStatsUpdate({
            population: Math.floor(result.data.valid_pixels * 0.5), // Mock: 0.5 người/pixel
            avgFloodLevel: result.data.average_depth.toFixed(2),
            food: (result.data.valid_pixels * 0.01 / 1000).toFixed(1), // Mock calculation
            workers: Math.floor(result.data.valid_pixels / 100) + 10, // Mock calculation
            regionAnalysis: {
              totalPixels: result.data.total_pixels,
              validPixels: result.data.valid_pixels,
              coverage: result.data.coverage_percentage.toFixed(1) + '%',
              maxDepth: result.data.max_depth,
              minDepth: result.data.min_depth,
              distribution: result.data.flood_distribution
            }
          });
        }

        // Hiển thị thông tin chi tiết
        setSelectionCoords(prev => ({
          ...prev,
          floodAnalysis: result.data
        }));

      } else {
        console.error('Failed to analyze region:', result.error);
      }

    } catch (error) {
      console.error('Error calculating region flood depth:', error);
    }
  };

  // Function to fetch and draw borders based on bounds
  const fetchAndDrawBorders = async (bounds) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    setIsLoadingBorders(true);
    // Reset stats to loading state or keep previous until loaded?
    // Let's reset to null to indicate loading new area if desired, 
    // but typically we wait for data. For now, let's keep it null until success.
    
    try {
        // Clear previous border layers immediately when starting new fetch
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
            body: JSON.stringify(payload),
            signal // Pass signal
        });
        const json = await res.json();

        if (json.success && json.data.wards) {
            // 2. Loop through IDs and fetch details for each
            const fetchPromises = json.data.wards.map(async (ward) => {
                try {
                    const detailRes = await fetch(`${API_BASE_URL}/admin/get-board/${ward.id}`, { signal });
                    const detailJson = await detailRes.json();
                    
                    if (detailJson.success && detailJson.data) {
                        // Draw Polygon
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
                            // Clean string (e.g., remove commas if any) and parse
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
                return { pop: 0, depth: 0 }; // Return 0s if failed
            });

            // Wait for all requests
            const results = await Promise.all(fetchPromises);
            
            // Calculate Total Population
            const totalPopulation = results.reduce((sum, current) => sum + current.pop, 0);

            // Calculate Flood Depth (Accumulate for Average)
            const totalFloodDepth = results.reduce((sum, current) => sum + current.depth, 0);
            
            // Calculate Average Flood Depth for the selected area
            // If we have wards, we average the depth. If user meant sum of depths, we can just use totalFloodDepth.
            // Given "Độ ngập TB" (Average Flood Level) in UI, we should divide by count.
            const validDepthsCount = results.filter(r => r.depth > 0).length;
            const denominator = validDepthsCount > 0 ? validDepthsCount : (results.length > 0 ? results.length : 1);
            
            // NOTE: If the requirement is STRICTLY "cộng lại" (sum up) for the dashboard value, use totalFloodDepth.
            // But usually "Level" implies a height, so sum of heights across area is weird. 
            // I will use Average for the "TB" (Trung Bình) label in stats.
            const avgFloodDepth = (totalFloodDepth / denominator).toFixed(2);

            // Update Stats with Real Population + Real Flood Depth + Mock Data for others
            if (onStatsUpdate) {
                onStatsUpdate({
                    population: totalPopulation,
                    avgFloodLevel: avgFloodDepth, 
                    food: (totalPopulation * 0.05 / 1000).toFixed(1), // Mock: ~0.05kg per person, converted to tons
                    workers: Math.floor(totalPopulation / 500) + 20 // Mock: 1 worker per 500 people + base team
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
        // Only turn off loading if this is the latest request
        if (abortControllerRef.current === controller) {
            setIsLoadingBorders(false);
            abortControllerRef.current = null;
        }
    }
  };

  // Effect to toggle heatmap visibility
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !heatmapOverlayRef.current) return;

    try {
      if (showHeatmap && !map.hasLayer(heatmapOverlayRef.current)) {
        heatmapOverlayRef.current.addTo(map);
      } else if (!showHeatmap && map.hasLayer(heatmapOverlayRef.current)) {
        map.removeLayer(heatmapOverlayRef.current);
      }
    } catch (err) {
      console.error('Error toggling heatmap visibility:', err);
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
        color: "#c20000ff", 
        weight: 2,
        fillColor: "#c22400ff",
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

        // Trigger both API calls
        fetchAndDrawBorders(bounds);
        calculateRegionFloodDepth(bounds);
        
        // EXIT SELECTION MODE IMMEDIATELY
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

        {/* Loading Indicator for Heatmap */}
        {isLoadingHeatmap && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600/90 text-white backdrop-blur px-4 py-2 rounded-full shadow-md text-xs font-bold flex items-center gap-2 z-[1000] pointer-events-none">
                <span className="material-symbols-outlined !text-[16px] animate-spin">sync</span>
                Loading Flood Heatmap...
            </div>
        )}
        
        {/* Error Indicator for Heatmap */}
        {heatmapError && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600/90 text-white backdrop-blur px-4 py-2 rounded-full shadow-md text-xs font-bold flex items-center gap-2 z-[1000]">
                <span className="material-symbols-outlined !text-[16px]">error</span>
                {heatmapError}
                <button 
                    onClick={() => loadFloodHeatmap(mapInstanceRef.current)}
                    className="ml-2 underline hover:no-underline"
                >
                    Retry
                </button>
            </div>
        )}
        
        {/* Loading Indicator for API */}
        {isLoadingBorders && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-600/90 text-white backdrop-blur px-4 py-2 rounded-full shadow-md text-xs font-bold flex items-center gap-2 z-[1000] pointer-events-none animate-bounce">
                <span className="material-symbols-outlined !text-[16px] animate-spin">downloading</span>
                Loading Boarders...
            </div>
        )}

        {/* Coordinates Display (Selection Result) */}
        {selectionCoords && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur shadow-xl rounded-lg p-4 border border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-lg">
             <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
                <span className="material-symbols-outlined text-primary">water</span>
                <span className="font-bold text-gray-800 text-sm">Phân Tích Vùng Ngập Lụt</span>
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
                    // Abort any ongoing calls
                    if (abortControllerRef.current) {
                        abortControllerRef.current.abort();
                    }
                    // Reset stats
                    if (onStatsUpdate) {
                        onStatsUpdate(null);
                    }
                  }}
                  className="ml-auto hover:bg-gray-100 rounded p-0.5 transition-colors"
                >
                  <span className="material-symbols-outlined !text-[16px] text-gray-400">close</span>
                </button>
             </div>

             {/* Coordinates */}
             <div className="grid grid-cols-2 gap-3 text-xs font-mono mb-3">
                <div>
                   <p className="text-gray-500 mb-0.5">Top-Left (NW)</p>
                   <p className="font-bold text-gray-700">{selectionCoords.nw.lat}, {selectionCoords.nw.lng}</p>
                </div>
                <div>
                   <p className="text-gray-500 mb-0.5">Bottom-Right (SE)</p>
                   <p className="font-bold text-gray-700">{selectionCoords.se.lat}, {selectionCoords.se.lng}</p>
                </div>
             </div>

             {/* Flood Analysis Results */}
             {selectionCoords.floodAnalysis && (
               <div className="border-t border-gray-100 pt-3">
                 <h4 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-1">
                   <span className="material-symbols-outlined !text-[16px] text-blue-600">analytics</span>
                   Kết Quả Phân Tích GeoTIFF
                 </h4>
                 
                 {/* Main Stats */}
                 <div className="grid grid-cols-3 gap-2 mb-3">
                   <div className="bg-blue-50 p-2 rounded text-center">
                     <p className="text-xs text-gray-500">Độ Ngập TB</p>
                     <p className="font-bold text-blue-600">{selectionCoords.floodAnalysis.average_depth}m</p>
                   </div>
                   <div className="bg-red-50 p-2 rounded text-center">
                     <p className="text-xs text-gray-500">Cao Nhất</p>
                     <p className="font-bold text-red-600">{selectionCoords.floodAnalysis.max_depth}m</p>
                   </div>
                   <div className="bg-green-50 p-2 rounded text-center">
                     <p className="text-xs text-gray-500">Thấp Nhất</p>
                     <p className="font-bold text-green-600">{selectionCoords.floodAnalysis.min_depth}m</p>
                   </div>
                 </div>

                 {/* Coverage Info */}
                 <div className="bg-gray-50 p-2 rounded mb-2">
                   <p className="text-xs text-gray-600">
                     Độ phủ: <span className="font-semibold">{selectionCoords.floodAnalysis.coverage_percentage.toFixed(1)}%</span>
                     <span className="text-gray-500"> ({selectionCoords.floodAnalysis.valid_pixels}/{selectionCoords.floodAnalysis.total_pixels} pixels)</span>
                   </p>
                 </div>

                 {/* Flood Distribution */}
                 {selectionCoords.floodAnalysis.flood_distribution && (
                   <div>
                     <p className="text-xs font-semibold text-gray-700 mb-1">Phân Bố Độ Ngập:</p>
                     <div className="space-y-1 text-xs">
                       <div className="flex justify-between">
                         <span className="text-gray-600">🔵 Không ngập:</span>
                         <span className="font-semibold">{selectionCoords.floodAnalysis.flood_distribution.no_flood.percentage.toFixed(1)}%</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-gray-600">🟡 Nông (≤0.5m):</span>
                         <span className="font-semibold">{selectionCoords.floodAnalysis.flood_distribution.shallow.percentage.toFixed(1)}%</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-gray-600">🟠 Trung bình (0.5-1m):</span>
                         <span className="font-semibold">{selectionCoords.floodAnalysis.flood_distribution.moderate.percentage.toFixed(1)}%</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-gray-600">🔴 Sâu (1-2m):</span>
                         <span className="font-semibold">{selectionCoords.floodAnalysis.flood_distribution.deep.percentage.toFixed(1)}%</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-gray-600">⚫ Rất sâu (&gt;2m):</span>
                         <span className="font-semibold">{selectionCoords.floodAnalysis.flood_distribution.very_deep.percentage.toFixed(1)}%</span>
                       </div>
                     </div>
                   </div>
                 )}
               </div>
             )}
          </div>
        )}

        {/* Weather Widget */}
        <div className="absolute left-4 top-4 group z-[1000]">
            <button className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm transition hover:bg-white text-primary ring-1 ring-black/5">
                <span className="material-symbols-outlined !text-[28px]">partly_cloudy_day</span>
            </button>
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

        {/* Heatmap Legend */}
        {showHeatmap && heatmapData && !isLoadingHeatmap && (
            <div className="absolute bottom-20 left-6 z-[1000] bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-xl border border-blue-100 max-w-sm">
                <div className="mb-3">
                    <h3 className="font-bold text-blue-900 text-base mb-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-600 !text-[20px]">water</span>
                        Độ Sâu Ngập Lụt
                    </h3>
                    <div className="text-sm text-gray-600 font-medium">
                        {heatmapData.min_depth?.toFixed(1) || '0.0'}m - {heatmapData.max_depth?.toFixed(1) || '0.0'}m
                    </div>
                </div>
                
                <div className="space-y-3">
                    <div 
                        className="h-6 rounded-lg border-2 border-gray-200 shadow-inner"
                        style={{
                            background: `linear-gradient(to right, ${heatmapData.legend.colors.join(', ')})`
                        }}
                    ></div>
                    
                    <div className="flex justify-between text-xs font-semibold text-gray-700">
                        <div className="text-center">
                            <div className="bg-gray-100 px-2 py-1 rounded-md border">
                                {heatmapData.legend.values[0]?.toFixed(1) || '0.0'}m
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="bg-gray-100 px-2 py-1 rounded-md border">
                                {heatmapData.legend.values[2]?.toFixed(1) || '0.0'}m
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="bg-gray-100 px-2 py-1 rounded-md border">
                                {heatmapData.legend.values[4]?.toFixed(1) || '0.0'}m
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>Thấp</span>
                        <span className="text-center">Trung Bình</span>
                        <span>Cao</span>
                    </div>
                    
                    <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-200">
                        Cập nhật: {new Date(heatmapData.timestamp).toLocaleString('vi-VN')}
                    </div>

                    <button
                        onClick={() => loadFloodHeatmap(mapInstanceRef.current)}
                        disabled={isLoadingHeatmap}
                        className="w-full mt-2 px-3 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors flex items-center justify-center gap-1"
                    >
                        <span className="material-symbols-outlined !text-[14px]">refresh</span>
                        Cập nhật
                    </button>
                </div>
            </div>
        )}

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
            
            {/* Heatmap Controls */}
            <div className="flex flex-col rounded-lg bg-white/90 shadow-lg backdrop-blur-sm ring-1 ring-black/5 overflow-hidden">
                {/* Toggle Heatmap */}
                <button 
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className={`flex h-10 w-10 items-center justify-center transition-colors border-b border-gray-200 ${
                        showHeatmap ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                    title="Toggle Heatmap"
                >
                    <span className="material-symbols-outlined !text-[20px]">water</span>
                </button>
                
                {/* Opacity Control */}
                {showHeatmap && (
                    <div className="p-2 w-32">
                        <input
                            type="range"
                            min="0.1"
                            max="1"
                            step="0.1"
                            value={heatmapOpacity}
                            onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none slider"
                            title={`Opacity: ${Math.round(heatmapOpacity * 100)}%`}
                        />
                        <div className="text-xs text-gray-500 text-center mt-1">
                            {Math.round(heatmapOpacity * 100)}%
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