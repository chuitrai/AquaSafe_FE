
import { useState, useRef, useEffect } from 'react';
import L from 'leaflet';
import { API_BASE_URL, getAuthHeaders } from '../utils/monitoringConstants';

export const useFloodHeatmap = (mapInstance, timeFrame, token) => {
    const [isLoadingHeatmap, setIsLoadingHeatmap] = useState(false);
    const [heatmapData, setHeatmapData] = useState(null);
    const [showHeatmap, setShowHeatmap] = useState(true);
    const [heatmapOpacity, setHeatmapOpacity] = useState(0.7);
    const heatmapOverlayRef = useRef(null);

    const loadFloodHeatmap = async (retryCount = 0) => {
        if (!mapInstance) return;

        setIsLoadingHeatmap(true);

        try {
            const supportedTimes = ['now', 'future-5', 'future-30'];
            const timeParam = supportedTimes.includes(timeFrame?.id) ? timeFrame.id : 'now';

            const response = await fetch(`${API_BASE_URL}/flood-depth/map?time=${timeParam}&t=${Date.now()}`, {
                headers: getAuthHeaders(token)
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
                heatmapOverlayRef.current.addTo(mapInstance);
            }

        } catch (err) {
            console.error('Error loading flood heatmap:', err);
            if (retryCount < 2) {
                setTimeout(() => loadFloodHeatmap(retryCount + 1), 2000);
            }
        } finally {
            setIsLoadingHeatmap(false);
        }
    };

    // Reload when timeFrame changes
    useEffect(() => {
        if (mapInstance && timeFrame) {
            loadFloodHeatmap();
        }
    }, [mapInstance, timeFrame]);

    // Toggle visibility
    useEffect(() => {
        if (!mapInstance || !heatmapOverlayRef.current) return;

        if (showHeatmap) {
            if (!mapInstance.hasLayer(heatmapOverlayRef.current)) {
                heatmapOverlayRef.current.addTo(mapInstance);
            }
        } else {
            if (mapInstance.hasLayer(heatmapOverlayRef.current)) {
                heatmapOverlayRef.current.remove();
            }
        }
    }, [showHeatmap, mapInstance]);

    // Update opacity
    useEffect(() => {
        if (heatmapOverlayRef.current) {
            heatmapOverlayRef.current.setOpacity(heatmapOpacity);
        }
    }, [heatmapOpacity]);

    return {
        isLoadingHeatmap,
        heatmapData,
        showHeatmap,
        setShowHeatmap,
        heatmapOpacity,
        setHeatmapOpacity,
        loadFloodHeatmap
    };
};
