import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { time: '00:00', sensor2: 30, sensor5: 15, sensor8: 25 },
  { time: '04:00', sensor2: 35, sensor5: 18, sensor8: 28 },
  { time: '08:00', sensor2: 45, sensor5: 22, sensor8: 38 },
  { time: '12:00', sensor2: 42, sensor5: 20, sensor8: 35 },
  { time: '16:00', sensor2: 48, sensor5: 25, sensor8: 40 },
  { time: '20:00', sensor2: 40, sensor5: 21, sensor8: 32 },
];

export const SensorChart = () => {
  return (
    <div className="flex flex-col h-full">
      <h3 className="text-lg font-bold text-text-primary mb-4">Xu hướng mực nước từ Cảm biến</h3>
      
      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis 
              dataKey="time" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#718096' }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#718096' }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <Line type="monotone" dataKey="sensor2" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="sensor5" stroke="#16a34a" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="sensor8" stroke="#ef4444" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-border-color pt-4">
        <div className="flex items-center justify-between text-sm hover:bg-gray-50 p-2 rounded-md transition-colors cursor-default">
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-[#3b82f6]"></div>
            <span className="text-text-secondary">Cảm biến #CS02 (Bình Thạnh)</span>
          </div>
          <span className="font-bold text-text-primary">45 cm</span>
        </div>
        <div className="flex items-center justify-between text-sm hover:bg-gray-50 p-2 rounded-md transition-colors cursor-default">
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-[#16a34a]"></div>
            <span className="text-text-secondary">Cảm biến #CS05 (Quận 2)</span>
          </div>
          <span className="font-bold text-text-primary">22 cm</span>
        </div>
        <div className="flex items-center justify-between text-sm hover:bg-gray-50 p-2 rounded-md transition-colors cursor-default">
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-[#ef4444]"></div>
            <span className="text-text-secondary">Cảm biến #CS08 (Thủ Đức)</span>
          </div>
          <span className="font-bold text-text-primary">38 cm</span>
        </div>
      </div>
    </div>
  );
};