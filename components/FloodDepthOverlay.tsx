import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

interface FloodDepthOverlayProps {
  map: L.Map | null;
  isVisible: boolean;
  opacity?: number;
}

interface FloodDepthData {
  image_url: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  timestamp: string;
  max_depth: number;
  min_depth: number;
  legend: {
    colors: string[];
    values: number[];
  };
}

export const FloodDepthOverlay: React.FC<FloodDepthOverlayProps> = ({ 
  map, 
  isVisible, 
  opacity = 0.7 
}) => {
  const overlayRef = useRef<L.ImageOverlay | null>(null);
  const [depthData, setDepthData] = useState<FloodDepthData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const API_BASE_URL = "http://localhost:8220/api";

  // Auto-load on mount
  useEffect(() => {
    if (map && isVisible) {
      console.log('FloodDepthOverlay: Loading flood depth map...');
      loadFloodDepthMap();
    }
  }, [map, isVisible]);

  // Load flood depth map từ API mới
  const loadFloodDepthMap = async () => {
    if (!map) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/flood-depth/map`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to load flood depth map');
      }

      setDepthData(result.data);
      
      // Tạo image overlay với bounds từ API
      const bounds = L.latLngBounds(
        [result.data.bounds.south, result.data.bounds.west],
        [result.data.bounds.north, result.data.bounds.east]
      );

      // Remove existing overlay
      if (overlayRef.current && map.hasLayer(overlayRef.current)) {
        try {
          map.removeLayer(overlayRef.current);
        } catch (err) {
          console.warn('Error removing existing overlay:', err);
        }
      }

      // Create new overlay using image URL từ server
      const imageUrl = `${API_BASE_URL.replace('/api', '')}${result.data.image_url}`;
      overlayRef.current = L.imageOverlay(imageUrl, bounds, {
        opacity: opacity,
        interactive: false,
        crossOrigin: true
      });

      // Wait for map to be ready before adding overlay
      if (isVisible) {
        setTimeout(() => {
          try {
            if (overlayRef.current && map && map.getContainer()) {
              overlayRef.current.addTo(map);
            }
          } catch (err) {
            console.error('Error adding overlay to map:', err);
            throw new Error('Failed to add overlay to map');
          }
        }, 100);
      }

      console.log('Flood depth map loaded successfully:', result.data);

    } catch (err: any) {
      console.error('Error loading flood depth map:', err);
      setError(err.message || 'Failed to load flood depth map');
    } finally {
      setIsLoading(false);
    }
  };

  // Effect để show/hide overlay
  useEffect(() => {
    if (!map || !overlayRef.current) return;
    
    try {
      if (isVisible && !map.hasLayer(overlayRef.current)) {
        overlayRef.current.addTo(map);
      } else if (!isVisible && map.hasLayer(overlayRef.current)) {
        map.removeLayer(overlayRef.current);
      }
    } catch (err) {
      console.error('Error toggling overlay visibility:', err);
    }
  }, [isVisible, map]);

  // Effect để update opacity
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.setOpacity(opacity);
    }
  }, [opacity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (overlayRef.current && map && map.hasLayer(overlayRef.current)) {
        try {
          map.removeLayer(overlayRef.current);
        } catch (err) {
          console.warn('Error cleaning up overlay:', err);
        }
      }
    };
  }, [map]);

  return (
    <>
      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-blue-600/90 text-white backdrop-blur px-4 py-2 rounded-full shadow-md text-xs font-bold flex items-center gap-2 z-[1000] pointer-events-none">
          <span className="material-symbols-outlined !text-[16px] animate-spin">sync</span>
          Loading Flood Depth Map...
        </div>
      )}

      {/* Error Indicator */}
      {error && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-600/90 text-white backdrop-blur px-4 py-2 rounded-full shadow-md text-xs font-bold flex items-center gap-2 z-[1000]">
          <span className="material-symbols-outlined !text-[16px]">error</span>
          {error}
          <button 
            onClick={loadFloodDepthMap}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Legend */}
      {isVisible && depthData && !isLoading && (
        <div className="absolute bottom-20 left-6 z-[1000] bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-xl border border-blue-100 max-w-sm">
          <div className="mb-3">
            <h3 className="font-bold text-blue-900 text-base mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 !text-[20px]">water</span>
              Độ Sâu Ngập Lụt
            </h3>
            <div className="text-sm text-gray-600 font-medium">
              {depthData.min_depth?.toFixed(1) || '0.0'}m - {depthData.max_depth?.toFixed(1) || '0.0'}m
            </div>
          </div>
          
          {/* Color Legend từ API */}
          <div className="space-y-3">
            <div 
              className="h-6 rounded-lg border-2 border-gray-200 shadow-inner"
              style={{
                background: `linear-gradient(to right, ${depthData.legend.colors.join(', ')})`
              }}
            ></div>
            
            <div className="flex justify-between text-xs font-semibold text-gray-700">
              <div className="text-center">
                <div className="bg-gray-100 px-2 py-1 rounded-md border">
                  {depthData.legend.values[0]?.toFixed(1) || '0.0'}m
                </div>
              </div>
              <div className="text-center">
                <div className="bg-gray-100 px-2 py-1 rounded-md border">
                  {depthData.legend.values[2]?.toFixed(1) || '0.0'}m
                </div>
              </div>
              <div className="text-center">
                <div className="bg-gray-100 px-2 py-1 rounded-md border">
                  {depthData.legend.values[4]?.toFixed(1) || '0.0'}m
                </div>
              </div>
            </div>
            
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Thấp</span>
              <span className="text-center">Trung Bình</span>
              <span>Cao</span>
            </div>
            
            <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-200">
              Cập nhật: {new Date(depthData.timestamp).toLocaleString('vi-VN')}
            </div>

            {/* Refresh Button */}
            <button
              onClick={loadFloodDepthMap}
              disabled={isLoading}
              className="w-full mt-2 px-3 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined !text-[14px]">refresh</span>
              Cập nhật
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default FloodDepthOverlay;