import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Bình Thạnh', workers: 102, food: 550 },
  { name: 'TP. Thủ Đức', workers: 85, food: 400 },
  { name: 'Quận 7', workers: 48, food: 250 },
  { name: 'Quận 2', workers: 45, food: 200 },
  { name: 'H. Bình Chánh', workers: 32, food: 100 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-lg text-xs">
        <p className="font-bold text-gray-800 mb-2">{label}</p>
        <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#0077C2]"></span>
            <span className="text-gray-600">Nhân sự:</span>
            <span className="font-bold text-[#0077C2] ml-auto">{payload[0].value}</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#38A169]"></span>
            <span className="text-gray-600">Lương thực:</span>
            <span className="font-bold text-[#38A169] ml-auto">{payload[1].value} kg</span>
        </div>
      </div>
    );
  }
  return null;
};

export const ReliefGroupChart = () => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div>
            <h3 className="text-lg font-bold text-text-primary">Hiệu quả Cứu trợ</h3>
            <p className="text-xs text-text-muted mt-1">Phân bổ nhân sự và lương thực theo khu vực</p>
        </div>
        <div className="flex gap-1">
             <span className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 font-semibold">
                <span className="material-symbols-outlined !text-[12px]">groups</span> Nhân sự
             </span>
             <span className="flex items-center gap-1 text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100 font-semibold">
                <span className="material-symbols-outlined !text-[12px]">inventory_2</span> Lương thực
             </span>
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
            barGap={4}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} 
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            
            <YAxis 
              yAxisId="left"
              orientation="left" 
              stroke="#0077C2" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#0077C2' }}
              label={{ value: 'Người', angle: -90, position: 'insideLeft', fill: '#0077C2', fontSize: 10, dy: 30 }}
            />
            
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke="#38A169" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#38A169' }}
              label={{ value: 'Kg', angle: 90, position: 'insideRight', fill: '#38A169', fontSize: 10, dy: -30 }}
            />
            
            <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
            
            <Bar 
                yAxisId="left" 
                dataKey="workers" 
                fill="#0077C2" 
                radius={[4, 4, 0, 0]} 
                barSize={24}
                name="Nhân sự"
            />
            <Bar 
                yAxisId="right" 
                dataKey="food" 
                fill="#38A169" 
                radius={[4, 4, 0, 0]} 
                barSize={24}
                name="Lương thực"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};