import React, { useState, useEffect } from 'react';
import { MonitoringSidebar } from './MonitoringSidebar';
import { MonitoringMap } from './MonitoringMap';
import { MonitoringStats } from './MonitoringStats';

export const MonitoringDashboard = ({ searchLocation, timeFrame, isLoggedIn }) => {
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [currentStats, setCurrentStats] = useState(null);
  const [criticalZones, setCriticalZones] = useState([]);
  
  // State for map layers
  const [activeLayers, setActiveLayers] = useState([]);

  useEffect(() => {
    if (isLoggedIn) {
        setActiveLayers(['Đội cứu hộ', 'Điểm cứu trợ']);
    } else {
        setActiveLayers([]);
        setSelectedZoneId(null); 
    }
  }, [isLoggedIn]);

  const toggleLayer = (layerName) => {
    setActiveLayers(prev => 
      prev.includes(layerName) 
        ? prev.filter(l => l !== layerName) 
        : [...prev, layerName]
    );
  };

  const handleCriticalZonesUpdate = (newZones) => {
      // Merge new zones or replace based on logic. Here we replace/update based on ID
      setCriticalZones(prev => {
          const map = new Map(prev.map(z => [z.id, z]));
          newZones.forEach(z => map.set(z.id, z));
          return Array.from(map.values()).sort((a, b) => parseFloat(b.level) - parseFloat(a.level));
      });
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      <MonitoringSidebar 
        zones={criticalZones} 
        selectedZoneId={selectedZoneId} 
        onZoneSelect={setSelectedZoneId}
        activeLayers={activeLayers}
        onToggleLayer={toggleLayer}
        isLoggedIn={isLoggedIn}
      />
      
      <main className="relative flex flex-1 flex-col bg-gray-100 peer-focus-within:opacity-50 transition-opacity duration-300">
        <div className="relative flex-1 w-full h-full flex flex-col">
            <div className="flex-1 relative min-h-0">
                <MonitoringMap 
                    zones={criticalZones} 
                    selectedZoneId={selectedZoneId} 
                    onZoneSelect={setSelectedZoneId}
                    onStatsUpdate={setCurrentStats}
                    onCriticalZonesUpdate={handleCriticalZonesUpdate}
                    searchLocation={searchLocation}
                    timeFrame={timeFrame}
                    activeLayers={activeLayers}
                    isLoggedIn={isLoggedIn}
                />
            </div>
            {/* Only show Stats if User is Logged In */}
            {isLoggedIn && (
                <div className="flex-shrink-0 bg-background-light border-t border-gray-200 p-4 z-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <MonitoringStats data={currentStats} />
                </div>
            )}
        </div>
      </main>
    </div>
  );
};