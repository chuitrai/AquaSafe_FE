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
    { id: 'RT11', name: 'CSGT Đường Thủy', type: 'boat', status: 'busy', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT12', name: 'Đội Xe Lội Nước', type: 'truck', status: 'idle', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT13', name: 'TNV Áo Xanh Huế', type: 'medical', status: 'idle', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT14', name: 'Đội CH Phường Đúc', type: 'boat', status: 'busy', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT15', name: 'Trung tâm Cấp cứu 115 #2', type: 'ambulance', status: 'idle', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT16', name: 'Đội CH Kim Long', type: 'boat', status: 'busy', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT17', name: 'Hải Đội 2 Biên Phòng', type: 'boat', status: 'busy', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT18', name: 'Tổ Công Tác Đặc Biệt', type: 'truck', status: 'idle', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT19', name: 'Y Tế Lưu Động Số 3', type: 'medical', status: 'busy', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RT20', name: 'Đội CH Thuận An', type: 'boat', status: 'idle', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
];

const MOCK_RELIEF_POINTS = [
    { id: 'RP01', name: 'BV Trung Ương Huế', type: 'hospital', capacity: 'Sẵn sàng', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP02', name: 'Trường Quốc Học Huế', type: 'shelter', capacity: '300/500', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP03', name: 'UBND Phường Vỹ Dạ', type: 'food', capacity: 'Còn 200 suất', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP04', name: 'Nhà Văn Hóa Lao Động', type: 'shelter', capacity: '150/300', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP05', name: 'Trung tâm Y tế TP Huế', type: 'hospital', capacity: 'Quá tải nhẹ', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP06', name: 'Kho Gạo Dự Trữ', type: 'food', capacity: 'Đầy kho', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP07', name: 'Trường THPT Hai Bà Trưng', type: 'shelter', capacity: '50/400', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP08', name: 'Chùa Thiên Mụ', type: 'shelter', capacity: '100/200', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP09', name: 'BV Đại Học Y Dược', type: 'hospital', capacity: 'Sẵn sàng', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP10', name: 'Siêu thị Go! (Điểm tiếp tế)', type: 'food', capacity: 'Hoạt động', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP11', name: 'UBND Phường Xuân Phú', type: 'shelter', capacity: 'Đầy', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP12', name: 'Trạm Y Tế An Cựu', type: 'hospital', capacity: 'Sẵn sàng', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP13', name: 'Nhà Thờ Phủ Cam', type: 'shelter', capacity: '200/600', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP14', name: 'Kho Hậu Cần QK4', type: 'food', capacity: 'Sẵn sàng', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP15', name: 'Trường ĐH Khoa Học', type: 'shelter', capacity: '10/1000', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP16', name: 'BV Quốc Tế Huế', type: 'hospital', capacity: 'Sẵn sàng', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP17', name: 'Điểm phát mỳ tôm Hương Sơ', type: 'food', capacity: 'Còn 50 thùng', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP18', name: 'Đại Học Sư Phạm', type: 'shelter', capacity: '500/800', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP19', name: 'Trạm Y Tế Kim Long', type: 'hospital', capacity: 'Sẵn sàng', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
    { id: 'RP20', name: 'Chợ Đông Ba (Điểm tập kết)', type: 'food', capacity: 'Đang nhập', ...(() => { const c = getRandomCoord(); return { lat: c[0], lng: c[1] } })() },
];

export const MonitoringMap = ({ zones, selectedZoneId, onZoneSelect, onStatsUpdate, onCriticalZonesUpdate, searchLocation, timeFrame, activeLayers, isLoggedIn, token, onOpenAlertModal }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const rescueMarkersRef = useRef([]);
  const reliefMarkersRef = useRef([]);
  const floodStatusRef = useRef({});
  const populationCacheRef = useRef({});
  
  const [heatmapData, setHeatmapData] = useState(null);
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);

  // Define loadFloodHeatmap
  const loadFloodHeatmap = (map) => {
    // Mock implementation
    console.log("Loading flood heatmap...");
    setHeatmapData(true);
  };

  // Helper for Headers
  const getAuthHeaders = () => {
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
          headers['Authorization'] = `Bearer ${token}`;
      }
      return headers;
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
      let totalDepth = 0;
      let totalPopulation = 0;
      let validDepthCount = 0;
      ids.forEach(id => {
          const depth = statusMap[id] || 0;
          totalDepth += depth;
          validDepthCount++;
          if (popMap[id]) totalPopulation += popMap[id];
      });
      const avgFloodDepth = validDepthCount > 0 ? totalDepth / validDepthCount : 0;
      if (totalPopulation === 0 && validDepthCount > 0) totalPopulation = validDepthCount * 5000;
      onStatsUpdate({
          population: totalPopulation,
          avgFloodLevel: avgFloodDepth.toFixed(2),
          food: (totalPopulation * 0.05 / 1000).toFixed(1),
          workers: Math.floor(totalPopulation / 1000) + 20
      });
  };

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

  // Map Init Effect
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    const map = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false }).setView([16.4637, 107.5909], 12);
    mapInstanceRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    L.control.attribution({ position: 'bottomright', prefix: 'OSM' }).addTo(map);

    map.whenReady(() => {
        if (!heatmapData) loadFloodHeatmap(map);
    });
    
    map.on('click', () => {
         onZoneSelect(null);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Rescue/Relief Effect
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
              const icon = L.divIcon({ html: iconHtml, className: 'custom-div-icon', iconSize: [32, 32], iconAnchor: [16, 16] });
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

  // Polling Effect
  useEffect(() => {
    const fetchFloodStatus = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/flood-depth-status`, { headers: getAuthHeaders() });
            const json = await res.json();
            
            if (json.success && Array.isArray(json.data)) {
                const idsToFetch = [];
                const newZones = [];
                
                json.data.forEach(item => {
                    const id = item.id;
                    const depth = item.depth || 0;
                    floodStatusRef.current[id] = depth;
                    
                    const existingZone = zones.find(z => z.id === id);
                    const isNewAlertCandidate = !existingZone && depth > 0.2;

                    if (populationCacheRef.current[id] === undefined || isNewAlertCandidate) {
                        idsToFetch.push(id);
                    } else if (existingZone && existingZone.level !== depth) {
                         // Update zone details if depth changed
                         newZones.push({
                             ...existingZone,
                             level: depth,
                             status: depth > existingZone.level ? 'rising' : (depth < existingZone.level ? 'falling' : 'stable'),
                             timestamp: Date.now()
                         });
                    }
                });
                
                if (idsToFetch.length > 0) {
                     // Mock fetch details
                     await Promise.all(idsToFetch.map(async (id) => {
                          try {
                               // Simulate fetch
                               const mockPop = Math.floor(Math.random() * 5000 + 1000);
                               populationCacheRef.current[id] = mockPop;
                               
                               const depth = floodStatusRef.current[id];
                               let severity = 'low';
                               if (depth > 1.0) severity = 'critical';
                               else if (depth > 0.5) severity = 'high';
                               else if (depth > 0.2) severity = 'medium';
                               
                               if (depth > 0.2) {
                                   newZones.push({
                                        id: id,
                                        location: `Khu vực ${id}`,
                                        district: 'Thừa Thiên Huế',
                                        level: depth,
                                        severity: severity,
                                        status: 'rising',
                                        updated: new Date().toLocaleTimeString(),
                                        timestamp: Date.now(),
                                        lat: HUE_CENTER.lat + (Math.random() - 0.5) * 0.05,
                                        lng: HUE_CENTER.lng + (Math.random() - 0.5) * 0.05
                                   });
                               }
                          } catch(e) {}
                     }));
                }
                
                if (newZones.length > 0 && onCriticalZonesUpdate) {
                     onCriticalZonesUpdate(newZones);
                }
                
                calculateAndSetGlobalStats();
            }
        } catch (error) {
            console.error("Error polling flood status:", error);
        }
    };
    
    // Initial fetch mock
    fetchFloodStatus();
    const interval = setInterval(fetchFloodStatus, 30000);
    return () => clearInterval(interval);
  }, [zones, onCriticalZonesUpdate, token]);

  // Handle Zones Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    zones.forEach(zone => {
         const lat = zone.lat || (HUE_CENTER.lat + (Math.random()-0.5)*0.05);
         const lng = zone.lng || (HUE_CENTER.lng + (Math.random()-0.5)*0.05);
         
         let colorClass = 'bg-blue-500 ring-blue-500';
         if(zone.severity === 'critical') colorClass = 'bg-red-600 ring-red-600';
         else if(zone.severity === 'high') colorClass = 'bg-orange-500 ring-orange-500';
         else if(zone.severity === 'medium') colorClass = 'bg-yellow-500 ring-yellow-500';
         
         const isSelected = selectedZoneId === zone.id;
         const size = isSelected ? 'w-6 h-6' : 'w-4 h-4';
         const ring = isSelected ? `ring-4 ${colorClass.split(' ')[1]} ring-opacity-30` : 'border-2 border-white shadow-lg';

         const html = `
            <div class="relative flex items-center justify-center">
                ${(zone.severity === 'critical' || zone.severity === 'high' || isSelected) ? 
                    `<div class="absolute w-full h-full rounded-full animate-ping opacity-75 ${colorClass.split(' ')[0]}"></div>` : ''}
                <div class="relative ${size} rounded-full transition-all duration-300 ${colorClass.split(' ')[0]} ${ring}"></div>
            </div>
         `;

         const icon = L.divIcon({ html: html, className: 'custom-div-icon', iconSize: [24, 24], iconAnchor: [12, 12] });
         const marker = L.marker([lat, lng], {icon}).addTo(map);
         
         const popupContent = `
            <div class="min-w-[180px]">
                <div class="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                    <span class="font-bold px-2 py-0.5 rounded text-[10px] uppercase bg-gray-100 text-gray-700">${zone.severity}</span>
                </div>
                <b>${zone.location}</b><br/>
                <span class="text-xs text-gray-500">Mực nước: ${zone.level}m</span>
                ${isLoggedIn ? `<button class="send-alert-btn mt-2 w-full bg-red-600 hover:bg-red-700 text-white px-2 py-1.5 rounded text-xs font-bold transition-colors" data-zone-id="${zone.id}">Gửi Cảnh Báo</button>` : ''}
            </div>
         `;
         marker.bindPopup(popupContent, { closeButton: false, className: 'custom-popup' });
         marker.on('click', (e) => {
               L.DomEvent.stopPropagation(e);
               onZoneSelect(zone.id);
         });
         
         if (isSelected) marker.openPopup();
         markersRef.current[zone.id] = marker;
    });
  }, [zones, selectedZoneId, onZoneSelect, isLoggedIn]);

  // Handle Search Location
  useEffect(() => {
      if (searchLocation && mapInstanceRef.current) {
          mapInstanceRef.current.setView([searchLocation.lat, searchLocation.lon], 16);
          L.marker([searchLocation.lat, searchLocation.lon]).addTo(mapInstanceRef.current).bindPopup(searchLocation.displayName).openPopup();
      }
  }, [searchLocation]);

  return (
      <div className="absolute inset-0 w-full h-full bg-gray-200">
          <div ref={mapContainerRef} className="w-full h-full z-0" />
          
          {/* Controls Overlay */}
          <div className="absolute right-4 top-4 flex flex-col gap-2 z-[1000]">
              <div className="flex flex-col rounded-lg bg-white/90 shadow-lg backdrop-blur-sm ring-1 ring-black/5 overflow-hidden">
                  <button onClick={() => mapInstanceRef.current?.zoomIn()} className="flex h-10 w-10 items-center justify-center hover:bg-gray-100 border-b border-gray-200 transition-colors">
                      <span className="material-symbols-outlined text-gray-700 !text-[20px]">add</span>
                  </button>
                  <button onClick={() => mapInstanceRef.current?.zoomOut()} className="flex h-10 w-10 items-center justify-center hover:bg-gray-100 transition-colors">
                      <span className="material-symbols-outlined text-gray-700 !text-[20px]">remove</span>
                  </button>
              </div>
              
              {isLoggedIn && (
                  <button 
                    onClick={() => setIsDispatchOpen(true)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 shadow-lg backdrop-blur-sm hover:bg-gray-100 ring-1 ring-black/5 transition-colors text-primary"
                    title="Điều phối cứu hộ"
                  >
                      <span className="material-symbols-outlined !text-[20px]">campaign</span>
                  </button>
              )}
          </div>

          <DispatchPanel isOpen={isDispatchOpen} onClose={() => setIsDispatchOpen(false)} />
      </div>
  );
};