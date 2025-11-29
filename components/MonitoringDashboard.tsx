import React, { useState } from 'react';
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

export const MonitoringDashboard = () => {
  const [selectedZoneId, setSelectedZoneId] = useState(null);

  return (
    <div className="flex flex-1 overflow-hidden">
      <MonitoringSidebar 
        zones={initialZones} 
        selectedZoneId={selectedZoneId} 
        onZoneSelect={setSelectedZoneId}
      />
      
      <main className="relative flex flex-1 flex-col bg-gray-100 peer-focus-within:opacity-50 transition-opacity duration-300">
        <div className="relative flex-1 w-full h-full flex flex-col">
            <div className="flex-1 relative min-h-0">
                <MonitoringMap 
                    zones={[]} 
                    selectedZoneId={selectedZoneId} 
                    onZoneSelect={setSelectedZoneId}
                />
            </div>
            <div className="flex-shrink-0 bg-background-light border-t border-gray-200 p-4 z-10">
                <MonitoringStats />
            </div>
        </div>
      </main>
    </div>
  );
};