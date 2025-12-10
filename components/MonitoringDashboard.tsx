import React, { useState, useEffect } from 'react';
import { MonitoringSidebar } from './MonitoringSidebar';
import { MonitoringMap } from './MonitoringMap';
import { MonitoringStats } from './MonitoringStats';

const initialZones = [
  { id: 1, x: 55, y: 40, severity: 'critical', location: 'Nguyễn Hữu Cảnh', district: 'Bình Thạnh', level: 1.5, updated: '5p trước', status: 'rising' },
  { id: 2, x: 62, y: 65, severity: 'high', location: 'Trần Xuân Soạn', district: 'Quận 7', level: 1.1, updated: '15p trước', status: 'stable' },
  { id: 3, x: 70, y: 35, severity: 'high', location: 'Thảo Điền', district: 'Quận 2', level: 0.9, updated: '10p trước', status: 'rising' },
  { id: 4, x: 30, y: 55, severity: 'medium', location: 'Quốc Lộ 50', district: 'Bình Chánh', level: 0.6, updated: '30p trước', status: 'falling' },
  { id: 5, x: 80, y: 25, severity: 'medium', location: 'Đường số 10', district: 'TP. Thủ Đức', level: 0.4, updated: '1h trước', status: 'falling' },
];

export const MonitoringDashboard = ({ searchLocation, timeFrame, isLoggedIn }) => {
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [currentStats, setCurrentStats] = useState(null);
  
  // State for map layers
  // Default: Hide operational layers for guests, Show them for logged-in users
  const [activeLayers, setActiveLayers] = useState([]);

  useEffect(() => {
    if (isLoggedIn) {
        setActiveLayers(['Đội cứu hộ', 'Điểm cứu trợ']);
    } else {
        setActiveLayers([]);
        setSelectedZoneId(null); // Clear selection when logged out
    }
  }, [isLoggedIn]);

  const toggleLayer = (layerName) => {
    setActiveLayers(prev => 
      prev.includes(layerName) 
        ? prev.filter(l => l !== layerName) 
        : [...prev, layerName]
    );
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      <MonitoringSidebar 
        zones={initialZones} 
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
                    zones={isLoggedIn ? initialZones : []} 
                    selectedZoneId={selectedZoneId} 
                    onZoneSelect={setSelectedZoneId}
                    onStatsUpdate={setCurrentStats}
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