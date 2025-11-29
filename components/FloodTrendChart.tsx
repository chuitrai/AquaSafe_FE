import React from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area
} from 'recharts';

const data = Array.from({ length: 14 }, (_, i) => ({
  date: `Day ${i + 1}`,
  level: Math.floor(Math.random() * 30) + 10, // 10-40 cm
  reports: Math.floor(Math.random() * 50) + 10, // 10-60 reports
}));

export const FloodTrendChart = () => {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-text-primary">Dân số bị ảnh hưởng & Báo cáo</h3>
          <p className="text-xs text-text-muted mt-1">Tương quan giữa mức nước (cm) và số lượng báo cáo từ người dân.</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-background p-1 border border-border-color">
          <button className="px-3 py-1 text-xs font-bold rounded-md text-text-secondary hover:bg-white hover:shadow-sm transition-all">Ngày</button>
          <button className="px-3 py-1 text-xs font-bold rounded-md bg-white text-primary shadow-sm transition-all">Tuần</button>
          <button className="px-3 py-1 text-xs font-bold rounded-md text-text-secondary hover:bg-white hover:shadow-sm transition-all">Tháng</button>
        </div>
      </div>
      
      <div className="flex-1 min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <defs>
              <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0077C2" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#0077C2" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#f3f4f6" vertical={false} />
            <XAxis 
              dataKey="date" 
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
              label={{ value: 'Mức nước (cm)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#A0AEC0', fontSize: 12 } }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#718096' }}
              label={{ value: 'Số báo cáo', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: '#A0AEC0', fontSize: 12 } }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            
            {/* Reports Bar */}
            <Bar 
              yAxisId="right" 
              dataKey="reports" 
              name="Số lượng báo cáo" 
              barSize={20} 
              fill="#E6F4FF" 
              radius={[4, 4, 0, 0]} 
            />
            
            {/* Water Level Area/Line */}
            <Area 
              yAxisId="left" 
              type="monotone" 
              dataKey="level" 
              name="Mức nước (cm)" 
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