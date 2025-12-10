import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';



const wardData = [
  { name: 'Phường Phong Điền', workers: 62, food: 260 },
  { name: 'Phường Phong Dinh', workers: 48, food: 200 },
  { name: 'Phường Phong Quảng', workers: 51, food: 220 },
  { name: 'Phường Kim Trà', workers: 39, food: 170 },
  { name: 'Phường Hương An', workers: 60, food: 265 },
  { name: 'Phường Thuận An', workers: 52, food: 210 },
  { name: 'Phường Mỹ Thượng', workers: 37, food: 165 },
  { name: 'Phường Thuận Hóa', workers: 68, food: 290 },
  { name: 'Phường Thủy Xuân', workers: 43, food: 190 },
  { name: 'Phường Hương Thủy', workers: 56, food: 235 },
  { name: 'Phường Dương Nộ', workers: 36, food: 160 },
  { name: 'Phường Phong Thái', workers: 55, food: 240 },
  { name: 'Phường Phong Phú', workers: 44, food: 180 },
  { name: 'Phường Hương Trà', workers: 57, food: 250 },
  { name: 'Phường Kim Long', workers: 46, food: 195 },
  { name: 'Phường Phú Xuân', workers: 70, food: 310 },
  { name: 'Phường Hóa Châu', workers: 33, food: 150 },
  { name: 'Phường Vỹ Dạ', workers: 61, food: 275 },
  { name: 'Phường An Cựu', workers: 49, food: 205 },
  { name: 'Phường Thanh Thủy', workers: 42, food: 185 },
  { name: 'Phường Phú Bài', workers: 58, food: 240 },
];

const communeData = [
  { name: 'Xã An Diên', workers: 8, food: 85 },
  { name: 'Xã Bình Điền', workers: 7, food: 80 },
  { name: 'Xã Phú Hộ', workers: 7, food: 80 },
  { name: 'Xã Vinh Lộc', workers: 6, food: 75 },
  { name: 'Xã Lộc An', workers: 6, food: 75 },
  { name: 'Xã Chân Mây - Lăng Cô', workers: 6, food: 75 },
  { name: 'Xã Nam Đông', workers: 7, food: 80 },
  { name: 'Xã A Lưới 1', workers: 7, food: 80 },
  { name: 'Xã A Lưới 2', workers: 6, food: 75 },
  { name: 'Xã A Lưới 3', workers: 6, food: 75 },
  { name: 'Xã A Lưới 4', workers: 7, food: 85 },
  { name: 'Xã A Lưới 5', workers: 6, food: 75 },
  { name: 'Xã Quảng Diên', workers: 6, food: 75 },
  { name: 'Xã Phú Vinh', workers: 7, food: 85 },
  { name: 'Xã Vinh Hà', workers: 6, food: 75 },
  { name: 'Xã Phú Hòa', workers: 7, food: 85 },
  { name: 'Xã Quảng Thành', workers: 6, food: 75 },
  { name: 'Xã Hương Long', workers: 6, food: 75 },
  { name: 'Xã Phú Lộc', workers: 8, food: 90 },
];

const combinedData = [...wardData, ...communeData];
export type TimeFrame = 'day' | 'month' | 'year';

const timeFrameTotals: Record<TimeFrame, { workers: number; food: number }> = {
  day: { workers: 300, food: 2000 },
  month: { workers: 9000, food: 60000 },
  year: { workers: 108000, food: 720000 },
};

const normalizeTotals = (
  data: { workers: number; food: number }[],
  totals: { workers: number; food: number }
) => {
  const workersSum = data.reduce((sum, entry) => sum + entry.workers, 0);
  const foodSum = data.reduce((sum, entry) => sum + entry.food, 0);
  const workerScale = totals.workers / workersSum;
  const foodScale = totals.food / foodSum;

  const normalized = data.map(entry => ({
    ...entry,
    workers: Math.max(1, Math.round(entry.workers * workerScale)),
    food: Math.max(1, Math.round(entry.food * foodScale)),
  }));

  const workerDiff = totals.workers - normalized.reduce((sum, entry) => sum + entry.workers, 0);
  const foodDiff = totals.food - normalized.reduce((sum, entry) => sum + entry.food, 0);

  if (workerDiff !== 0) {
    normalized[0].workers += workerDiff;
  }
  if (foodDiff !== 0) {
    normalized[0].food += foodDiff;
  }

  return normalized;
};

const getNormalizedData = (totals: { workers: number; food: number }) => {
  const adjusted = combinedData.map(entry => ({
    ...entry,
    workers: Math.max(1, entry.workers),
    food: Math.max(1, entry.food),
  }));

  return normalizeTotals(adjusted, totals);
};

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

const formatLocationLabel = (label: string) => {
  if (label.includes('Phường')) {
    return label.replace('Phường', 'P.');
  }
  if (label.includes('Xã')) {
    return label.replace('Xã', 'X.');
  }
  if (label.length > 17) {
    return `${label.slice(0, 17).trim()}...`;
  }
  return label;
};

export const ReliefGroupChart = ({ timeFrame }: { timeFrame: TimeFrame }) => {
  const chartData = useMemo(
    () => getNormalizedData(timeFrameTotals[timeFrame]),
    [timeFrame]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div>
            <h3 className="text-lg font-bold text-text-primary">Hiệu quả cứu trợ</h3>
            <p className="text-xs text-text-muted mt-1">
              Phân bổ nhân sự và lương thực {timeFrame === 'day' ? 'theo ngày' : timeFrame === 'month' ? 'theo tháng' : 'theo năm'}
            </p>
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
      <div className="flex flex-wrap gap-2 mb-3 items-center" />
      
      <div className="w-full" style={{ height: 380 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 0, left: 0, bottom: 60 }}
            barGap={6}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            
            <XAxis 
              dataKey="name" 
              interval={0}
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              dy={28}
              height={70}
              angle={-45}
              textAnchor="end"
              tickFormatter={formatLocationLabel}
            />
            
            <YAxis 
              yAxisId="left"
              orientation="left" 
              stroke="#0077C2" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#0077C2' }}
              label={{ value: 'Người', angle: -90, position: 'insideLeft', fill: '#0077C2', fontSize: 10, dy: 30 }}
            />
            
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke="#38A169" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#38A169' }}
              label={{ value: 'Kg', angle: 90, position: 'insideRight', fill: '#38A169', fontSize: 10, dy: -30 }}
            />
            
            <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
            
            <Bar 
              yAxisId="left" 
              dataKey="workers" 
              fill="#0077C2" 
              radius={[4, 4, 0, 0]} 
              barSize={18}
              name="Nhân sự"
            />
            <Bar 
              yAxisId="right" 
              dataKey="food" 
              fill="#38A169" 
              radius={[4, 4, 0, 0]} 
              barSize={18}
              name="Lương thực"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};