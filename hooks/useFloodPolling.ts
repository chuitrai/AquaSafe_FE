import { useEffect, useRef } from 'react';
import { API_BASE_URL, getAuthHeaders, HUE_CENTER } from '../utils/monitoringConstants';

export const useFloodPolling = (zones, token, onCriticalZonesUpdate, calculateStats) => {
    const floodStatusRef = useRef({});
    const populationCacheRef = useRef({});

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

                        // Identify missing population data or new rising zones
                        if (populationCacheRef.current[id] === undefined) {
                            idsToFetch.push({ id, depthMm: newDepthMm });
                        }

                        // Determine status change
                        const isRising = newDepthMm > oldDepthMm;
                        const isFalling = newDepthMm < oldDepthMm;
                        
                        // Calculate Severity
                        let severity = 'low';
                        if (newDepthMm > 1000) severity = 'critical';
                        else if (newDepthMm > 500) severity = 'high';
                        else if (newDepthMm > 200) severity = 'medium';

                        const existingZone = zones.find(z => z.id === id);

                        if (existingZone) {
                            // Update existing zone if changed
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

                    // Batch update zones
                    if (updates.length > 0 && onCriticalZonesUpdate) {
                        onCriticalZonesUpdate(updates);
                    }

                    // Fetch details for new IDs
                    if (idsToFetch.length > 0) {
                        Promise.all(idsToFetch.map(item => fetchZoneDetails(item.id, item.depthMm)));
                    }
                    
                    // Trigger global stat recalculation
                    if (calculateStats) calculateStats();
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
                    if (calculateStats) calculateStats();
                }
            } catch (err) { }
        };

        fetchFloodStatus();
        const intervalId = setInterval(fetchFloodStatus, 10000); // 10s polling
        return () => clearInterval(intervalId);
    }, [zones, token]); // Re-run if token changes

    return { floodStatusRef, populationCacheRef };
};