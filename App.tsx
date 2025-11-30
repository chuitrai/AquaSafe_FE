import React, { useState } from 'react';
import { Header } from './components/Header';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { MonitoringDashboard } from './components/MonitoringDashboard';

const App = () => {
  const [currentView, setCurrentView] = useState('monitoring');
  // State to hold the coordinates selected from the search bar
  const [searchLocation, setSearchLocation] = useState(null);
  // State to hold selected timeframe
  const [timeFrame, setTimeFrame] = useState({ id: 'now', label: 'Hiện tại' });

  const handleLocationSelect = (location) => {
    setSearchLocation(location);
    // Switch to monitoring view if not already there so user can see the map
    if (currentView !== 'monitoring') {
        setCurrentView('monitoring');
    }
  };

  return (
    <div className={`flex flex-col h-screen w-full ${currentView === 'monitoring' ? 'bg-background-light' : 'bg-background'}`}>
      <Header 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        onLocationSelect={handleLocationSelect}
        timeFrame={timeFrame}
        onTimeFrameChange={setTimeFrame}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {currentView === 'analysis' ? (
            <AnalysisDashboard /> 
        ) : (
            <MonitoringDashboard 
                searchLocation={searchLocation} 
                timeFrame={timeFrame}
            />
        )}
      </main>
    </div>
  );
};

export default App;