import React, { useState } from 'react';
import { Header } from './components/Header';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { MonitoringDashboard } from './components/MonitoringDashboard';
import { LoginPage } from './components/LoginPage';

const App = () => {
  // Views: 'monitoring', 'analysis', 'login'
  const [currentView, setCurrentView] = useState('monitoring');
  
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(null);
  
  // State to hold the coordinates selected from the search bar
  const [searchLocation, setSearchLocation] = useState(null);
  // State to hold selected timeframe
  const [timeFrame, setTimeFrame] = useState({ id: 'now', label: 'Hiện tại' });

  const handleLocationSelect = (location) => {
    setSearchLocation(location);
    if (currentView !== 'monitoring') {
        setCurrentView('monitoring');
    }
  };

  const handleLoginToggle = () => {
    if (isLoggedIn) {
      // Logout logic: Reset ALL states
      setIsLoggedIn(false);
      setToken(null);
      setSearchLocation(null);
      setTimeFrame({ id: 'now', label: 'Hiện tại' });
      setCurrentView('monitoring');
    } else {
      // Go to Login Page
      setCurrentView('login');
    }
  };

  const handleLoginSubmit = async (username, password, callback) => {
      try {
          const response = await fetch('http://localhost:8220/api/auth/login', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ username, password }),
          });

          if (response.ok) {
              const data = await response.json();
              // Store token
              setToken(data.token);
              
              setIsLoggedIn(true);
              setCurrentView('analysis'); // Redirect to analysis dashboard on success
              callback(true);
          } else {
              callback(false);
          }
      } catch (error) {
          console.error("Login API error:", error);
          callback(false);
      }
  };

  // If in Login View, render full page Login
  if (currentView === 'login') {
      return (
          <LoginPage 
            onLogin={handleLoginSubmit} 
            onBack={() => setCurrentView('monitoring')} 
          />
      );
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
    </div>
  );
};

export default App;