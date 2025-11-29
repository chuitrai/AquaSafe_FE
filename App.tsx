import React, { useState } from 'react';
import { Header } from './components/Header';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { MonitoringDashboard } from './components/MonitoringDashboard';

const App = () => {
  const [currentView, setCurrentView] = useState('monitoring');

  return (
    <div className={`flex flex-col h-screen w-full ${currentView === 'monitoring' ? 'bg-background-light' : 'bg-background'}`}>
      <Header currentView={currentView} onViewChange={setCurrentView} />
      
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {currentView === 'analysis' ? <AnalysisDashboard /> : <MonitoringDashboard />}
      </main>
    </div>
  );
};

export default App;