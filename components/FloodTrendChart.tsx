import React, { useMemo } from 'react';
import {
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area
} from 'recharts';

const generateDailyData = () =>
  Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    level: Math.floor(Math.random() * 30) + 10,
  }));

const weeklyData = Array.from({ length: 7 }, (_, i) => ({
  date: `Day ${i + 1}`,
  level: Math.floor(Math.random() * 30) + 10,
}));

const monthlyData = Array.from({ length: 31 }, (_, i) => ({
  date: `Ngày ${i + 1}`,
  level: Math.floor(Math.random() * 30) + 10,
}));

export const FloodTrendChart = ({ viewMode }: { viewMode: 'day' | 'week' | 'month' }) => {
  const data = useMemo(() => {
    if (viewMode === 'day') {
      return generateDailyData();
    }

    return viewMode === 'week' ? weeklyData : monthlyData;
  }, [viewMode]);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-text-primary">Theo dõi mực nước</h3>
          <p className="text-xs text-text-muted mt-1">Theo dõi diễn biến mực nước theo khung thời gian.</p>
        </div>
        <span className="text-xs text-text-muted">{viewMode === 'day' ? 'Tổng quan giờ trong ngày' : viewMode === 'week' ? 'Xu hướng tuần' : 'Báo cáo tháng'}</span>
      </div>

      <div className="w-full" style={{ height: 380 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <defs>
              <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0077C2" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#0077C2" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey={viewMode === 'day' ? 'hour' : 'date'}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#718096' }}
              dy={10}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#718096' }}
              label={{ value: 'Mực nước (cm)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#A0AEC0', fontSize: 12 } }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="level"
              name="Mực nước (cm)"
              stroke="#0077C2"
              fill="url(#colorLevel)"
              strokeWidth={3}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};