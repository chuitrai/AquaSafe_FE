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
      setCriticalZones(prev => {
          const map = new Map(prev.map(z => [z.id, z]));
          
          // Update or Add new zones
          newZones.forEach(z => {
              map.set(z.id, z);
          });

          // Convert back to array
          const updatedList = Array.from(map.values());

          // Sort Logic: 
          // 1. Recently Updated (Newest first) - PRIMARY
          // 2. Severity (Critical > High > Medium) - SECONDARY
          return updatedList.sort((a, b) => {
              // Priority 1: Time (Newest on top)
              const timeDiff = b.timestamp - a.timestamp;
              if (timeDiff !== 0) return timeDiff;

              // Priority 2: Severity (Tie-breaker)
              const severityScore = { 'critical': 3, 'high': 2, 'medium': 1, 'low': 0 };
              const scoreA = severityScore[a.severity] || 0;
              const scoreB = severityScore[b.severity] || 0;
              
              return scoreB - scoreA;
          });
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