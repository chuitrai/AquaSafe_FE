import React, { useState } from 'react';
import { StatCard } from './StatCard';
import { FloodTrendChart } from './FloodTrendChart';
import { ReliefGroupChart, TimeFrame } from './ReliefGroupChart';

type ViewMode = 'day' | 'week' | 'month';

interface DashboardStat {
  title: string;
  value: string;
  unit?: string;
  icon: string;
}

const statsByMode: Record<ViewMode, DashboardStat[]> = {
  day: [
    {
      title: 'Mức độ ngập trung bình',
      value: '25.4',
      unit: 'cm',
      icon: 'water'
    },
    {
      title: 'Dân số trong vùng ngập',
      value: '1,283',
      icon: 'groups'
    },
    {
      title: 'Nhân viên cứu hộ',
      value: '200',
      icon: 'health_and_safety'
    },
    {
      title: 'Người được cứu trợ',
      value: '312',
      icon: 'volunteer_activism'
    },
    {
      title: 'Lương thực đã phát',
      value: '2,000',
      unit: 'kg',
      icon: 'restaurant'
    }
  ],
  week: [
    {
      title: 'Mức độ ngập trung bình',
      value: '22.1',
      unit: 'cm',
      icon: 'water'
    },
    {
      title: 'Dân số trong vùng ngập',
      value: '8,920',
      icon: 'groups'
    },
    {
      title: 'Nhân viên cứu hộ',
      value: '970',
      icon: 'health_and_safety'
    },
    {
      title: 'Người được cứu trợ',
      value: '1,420',
      icon: 'volunteer_activism'
    },
    {
      title: 'Lương thực đã phát',
      value: '14,500',
      unit: 'kg',
      icon: 'restaurant'
    }
  ],
  month: [
    {
      title: 'Mức độ ngập trung bình',
      value: '18.7',
      unit: 'cm',
      icon: 'water'
    },
    {
      title: 'Dân số trong vùng ngập',
      value: '30,210',
      icon: 'groups'
    },
    {
      title: 'Nhân viên cứu hộ',
      value: '4,100',
      icon: 'health_and_safety'
    },
    {
      title: 'Người được cứu trợ',
      value: '5,800',
      icon: 'volunteer_activism'
    },
    {
      title: 'Lương thực đã phát',
      value: '64,000',
      unit: 'kg',
      icon: 'restaurant'
    }
  ]
};
const viewModes: ViewMode[] = ['day', 'week', 'month'];

const mapViewModeToTimeFrame = (mode: ViewMode): TimeFrame => {
  switch (mode) {
    case 'day':
      return 'day';
    case 'week':
      return 'month';
    default:
      return 'year';
  }
};

export const AnalysisDashboard = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const stats = statsByMode[viewMode];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Dashboard Toolbar */}
        <div className="flex flex-wrap justify-between items-center gap-4 px-6 py-4 border-b border-border-color bg-card-bg shrink-0">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Phân Tích Dữ Liệu Ngập Lụt</h1>
            <p className="text-xs text-text-muted">Theo dõi các xu hướng nước và cứu trợ trong vùng.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-1 rounded-lg bg-background p-1 border border-border-color">
              {viewModes.map(mode => (
                <button
                  key={mode}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    viewMode === mode
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-text-secondary hover:bg-white hover:shadow-sm'
                  }`}
                  onClick={() => setViewMode(mode)}
                >
                  {mode === 'day' ? 'Ngày' : mode === 'week' ? 'Tuần' : 'Tháng'}
                </button>
              ))}
            </div>
            <button className="flex h-9 items-center justify-center gap-x-2 rounded-md bg-primary text-white px-4 text-sm font-bold hover:bg-primary-dark transition-colors shadow-sm">
              <span className="material-symbols-outlined !text-[20px]">download</span>
              <span className="truncate">Xuất Báo cáo</span>
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

          {/* Flood Trend full width */}
          <div className="rounded-xl border border-border-color bg-card-bg p-6 shadow-sm min-h-[450px] flex flex-col mb-6">
            <FloodTrendChart viewMode={viewMode} />
          </div>

          {/* Relief chart full width */}
          <div className="rounded-xl border border-border-color bg-card-bg p-6 shadow-sm min-h-[500px]">
            <ReliefGroupChart timeFrame={mapViewModeToTimeFrame(viewMode)} />
          </div>
        </div>
    </div>
  );
};