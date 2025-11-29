import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Converted from the table data in the original HTML
const data = [
  { name: 'Bình Thạnh', workers: 102, food: 550 },
  { name: 'TP. Thủ Đức', workers: 85, food: 400 },
  { name: 'Quận 7', workers: 48, food: 250 },
  { name: 'Quận 2', workers: 45, food: 200 },
  { name: 'H. Bình Chánh', workers: 32, food: 100 },
];

export const ReliefGroupChart = () => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold text-text-primary">Hiệu quả Cứu trợ theo Khu vực</h3>
        <div className="text-xs text-text-secondary bg-gray-100 px-2 py-1 rounded-md">
           Real-time Update
        </div>
      </div>
      <p className="text-xs text-text-muted mb-6">So sánh số lượng nhân sự cứu trợ và lượng lương thực (kg) đã phân phát.</p>
      
      <div className="flex-1 w-full min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12, fill: '#4A5568', fontWeight: 500 }} 
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
              label={{ value: 'Nhân sự (người)', angle: -90, position: 'insideLeft', fill: '#0077C2', fontSize: 11 }}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke="#38A169" 
              axisLine={false}
              tickLine={false}
              label={{ value: 'Lương thực (kg)', angle: 90, position: 'insideRight', fill: '#38A169', fontSize: 11 }}
            />
            <Tooltip 
                cursor={{ fill: '#F7FAFC' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }}/>
            <Bar yAxisId="left" dataKey="workers" name="Người cứu trợ" fill="#0077C2" radius={[4, 4, 0, 0]} barSize={30} />
            <Bar yAxisId="right" dataKey="food" name="Lương thực (kg)" fill="#38A169" radius={[4, 4, 0, 0]} barSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 flex gap-4 text-xs text-text-secondary justify-center">
        <div className="flex items-center gap-1">
            <span className="block w-2 h-2 bg-[#0077C2] rounded-full"></span>
            <span>Dữ liệu nhân sự từ đội phản ứng nhanh</span>
        </div>
        <div className="flex items-center gap-1">
            <span className="block w-2 h-2 bg-[#38A169] rounded-full"></span>
            <span>Dữ liệu kho vận</span>
        </div>
      </div>
    </div>
  );
};