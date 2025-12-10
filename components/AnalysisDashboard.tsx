import React from 'react';
import { StatCard } from './StatCard';
import { FloodTrendChart } from './FloodTrendChart';
import { MapSection } from './MapSection';
import { SensorChart } from './SensorChart';
import { ReliefGroupChart } from './ReliefGroupChart';

export const AnalysisDashboard = () => {
  const stats = [
    {
      title: 'Mức độ ngập trung bình',
      value: '25.4',
      unit: 'cm',
      change: 5.2,
      trend: 'down',
      icon: 'water'
    },
    {
      title: 'Dân số trong vùng ngập',
      value: '1,283',
      change: 15,
      trend: 'up',
      icon: 'groups'
    },
    {
      title: 'Người cứu trợ (Online)',
      value: '125',
      change: 8,
      trend: 'up',
      icon: 'health_and_safety'
    },
    {
      title: 'Người được cứu trợ',
      value: '312',
      change: 20,
      trend: 'up',
      icon: 'volunteer_activism'
    },
    {
      title: 'Lương thực đã phát',
      value: '1,500',
      unit: 'kg',
      change: 10,
      trend: 'up',
      icon: 'restaurant'
    }
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Dashboard Toolbar */}
        <div className="flex flex-wrap justify-between items-center gap-4 px-6 py-4 border-b border-border-color bg-card-bg shrink-0">
          <h1 className="text-xl font-bold text-text-primary">Phân Tích Dữ Liệu Ngập Lụt</h1>
          
          <div className="flex items-center gap-3">
            <button type="button" className="flex h-9 items-center justify-center gap-x-2 rounded-md border border-border-color bg-white px-3 text-sm font-medium text-text-secondary hover:bg-gray-50 transition-colors shadow-sm">
              <span className="material-symbols-outlined !text-[20px]">calendar_today</span>
              <span>Last 30 days</span>
              <span className="material-symbols-outlined !text-[20px]">arrow_drop_down</span>
            </button>
            
            <button type="button" className="flex h-9 items-center justify-center gap-x-2 rounded-md border border-border-color bg-white px-3 text-sm font-medium text-text-secondary hover:bg-gray-50 transition-colors shadow-sm">
              <span className="material-symbols-outlined !text-[20px]">filter_list</span>
              <span>Bộ lọc nâng cao</span>
            </button>
            
            <button type="button" className="flex h-9 items-center justify-center gap-x-2 rounded-md bg-primary text-white px-4 text-sm font-bold hover:bg-primary-dark transition-colors shadow-sm">
              <span className="material-symbols-outlined !text-[20px]">download</span>
              <span className="truncate">Xuất Báo cáo</span>
            </button>
            
            <button type="button" className="flex h-9 w-9 items-center justify-center rounded-md border border-border-color bg-white text-text-secondary hover:bg-gray-50 shadow-sm" title="Thời tiết">
              <span className="material-symbols-outlined !text-[20px]">thermostat</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Top Stats Row - Grid System */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {stats.map((stat, index) => (
              <StatCard key={index} data={stat} />
            ))}
          </div>

          {/* Main Grid: 2x2 Layout for Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
            {/* Chart 1: Flood Trend */}
            <div className="rounded-xl border border-border-color bg-card-bg p-6 shadow-sm min-h-[400px]">
              <FloodTrendChart />
            </div>
            
            {/* Chart 2: Map */}
            <div className="rounded-xl border border-border-color bg-card-bg p-6 shadow-sm min-h-[400px] flex flex-col">
              <MapSection />
            </div>

            {/* Chart 3: Sensor Trends */}
            <div className="rounded-xl border border-border-color bg-card-bg p-6 shadow-sm min-h-[400px]">
              <SensorChart />
            </div>

            {/* Chart 4: Relief Efficiency */}
            <div className="rounded-xl border border-border-color bg-card-bg p-6 shadow-sm min-h-[400px] flex flex-col">
              <ReliefGroupChart />
            </div>
          </div>
        </div>
    </div>
  );
};