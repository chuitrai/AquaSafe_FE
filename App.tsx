import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { MonitoringDashboard } from './components/MonitoringDashboard';
import { LoginPage } from './components/LoginPage';
import { ResourceResponseModal } from './components/ResourceResponseModal';
import { useAuth } from './hooks/useAuth';

const App = () => {
  const [currentView, setCurrentView] = useState('monitoring');
  
  // Use Auth Hook for persistence
  const { isLoggedIn, token, user, login, logout, isLoading: isAuthLoading } = useAuth();
  
  const [searchLocation, setSearchLocation] = useState(null);
  const [timeFrame, setTimeFrame] = useState({ id: 'now', label: 'Hiện tại' });
  const [resourceModalData, setResourceModalData] = useState({ isOpen: false, request: null });

  // Redirect to analysis if already logged in and view is login
  useEffect(() => {
      if (isLoggedIn && currentView === 'login') {
          setCurrentView('analysis');
      }
  }, [isLoggedIn, currentView]);

  const handleLocationSelect = (location) => {
    setSearchLocation(location);
    if (currentView !== 'monitoring') setCurrentView('monitoring');
  };

  const handleLoginToggle = () => {
    if (isLoggedIn) {
      logout();
      setCurrentView('monitoring');
    } else {
      setCurrentView('login');
    }
  };

  const handleLoginSubmit = async (username, password, callback) => {
      const result = await login(username, password);
      callback(result.success);
      if(result.success) setCurrentView('analysis');
  };

  // Prevent flash of content while checking localstorage
  if (isAuthLoading) return null;

  if (currentView === 'login') {
      return <LoginPage onLogin={handleLoginSubmit} onBack={() => setCurrentView('monitoring')} />;
  }

  return (
    <div className={`flex flex-col h-screen w-full ${currentView === 'monitoring' ? 'bg-background-light' : 'bg-background'}`}>
      <Header 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        onLocationSelect={handleLocationSelect}
        timeFrame={timeFrame}
        onTimeFrameChange={setTimeFrame}
        isLoggedIn={isLoggedIn}
        onLoginToggle={handleLoginToggle}
        onOpenResourceResponse={(item) => setResourceModalData({ isOpen: true, request: item })}
        user={user}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {currentView === 'analysis' && isLoggedIn ? (
            <AnalysisDashboard /> 
        ) : (
            <MonitoringDashboard 
                searchLocation={searchLocation} 
                timeFrame={timeFrame}
                isLoggedIn={isLoggedIn}
                token={token}
            />
        )}
      </main>

      {isLoggedIn && (
        <ResourceResponseModal 
            isOpen={resourceModalData.isOpen}
            onClose={() => setResourceModalData({ ...resourceModalData, isOpen: false })}
            request={resourceModalData.request}
        />
      )}
    </div>
  );
};

export default App;