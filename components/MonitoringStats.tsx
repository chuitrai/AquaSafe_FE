import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export const MonitoringStats = ({ data }) => {
  const isDataAvailable = !!data;

  // Format helper
  const formatNumber = (num) => {
    return num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "0";
  };

  // Mock data generation for the chart (Grouped comparison)
  // We mock "Previous Hour" data to create a "Group" effect for demonstration
  const chartData = [
    {
      name: 'Dân số (Người)',
      'Hiện tại': data?.population || 0,
      '1h trước': (data?.population || 0) * 0.95, // Mock previous data
    },
    {
      name: 'Nhân sự (Người)',
      'Hiện tại': data?.workers || 0,
      '1h trước': (data?.workers || 0) * 0.8, // Mock previous data
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 p-2 rounded shadow-lg text-xs">
          <p className="font-bold text-gray-800 mb-1">{label}</p>
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 bg-[#0077C2] rounded-full"></span>
             <span>Hiện tại: <span className="font-bold">{formatNumber(Math.round(payload[0].value))}</span></span>
          </div>
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 bg-[#A0AEC0] rounded-full"></span>
             <span>1h trước: <span className="font-bold">{formatNumber(Math.round(payload[1].value))}</span></span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 h-[220px]">
      {/* Left Column: KPI Cards */}
      <div className="flex flex-col gap-4 w-full md:w-1/3 min-w-[280px]">
        {/* KPI 1: Flood Level */}
        <div className="flex-1 rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
             <span className="material-symbols-outlined text-[64px] text-blue-600">water</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <span className="material-symbols-outlined !text-[20px]">water</span>
            <p className="text-xs font-bold uppercase tracking-wider">Độ ngập trung bình</p>
          </div>
          <div className="flex items-baseline gap-2">
             <p className="text-3xl font-bold text-gray-800 tracking-tight">
                {isDataAvailable ? `${data.avgFloodLevel}m` : "N/A"}
             </p>
             {isDataAvailable && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${parseFloat(data.avgFloodLevel) > 0.5 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                    {parseFloat(data.avgFloodLevel) > 0.5 ? 'Cao' : 'Thấp'}
                </span>
             )}
          </div>
          {isDataAvailable && (
            <p className="text-xs font-semibold text-orange-500 flex items-center gap-1 mt-1">
              <span className="material-symbols-outlined !text-[14px]">trending_up</span>
              +0.2m so với 1h trước
            </p>
          )}
        </div>

        {/* KPI 2: Food Supply */}
        <div className="flex-1 rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
             <span className="material-symbols-outlined text-[64px] text-green-600">inventory_2</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <span className="material-symbols-outlined !text-[20px]">local_shipping</span>
            <p className="text-xs font-bold uppercase tracking-wider">Lương thực & Nhu yếu phẩm</p>
          </div>
          <div className="flex items-baseline gap-2">
             <p className="text-3xl font-bold text-gray-800 tracking-tight">
                {isDataAvailable ? `${data.food}` : "N/A"}
             </p>
             <span className="text-sm font-medium text-gray-500">tấn</span>
          </div>
          {isDataAvailable && (
            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-green-500 h-full rounded-full" style={{ width: '70%' }}></div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Group Bar Chart */}
      <div className="flex-1 rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col">
        <div className="flex justify-between items-start mb-2">
            <div>
                <h3 className="font-bold text-gray-800 text-sm">Phân tích Tác động & Nguồn lực</h3>
                <p className="text-xs text-gray-500">So sánh biến động nhân sự và dân số ảnh hưởng</p>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#0077C2]"></span>
                    <span className="text-[10px] text-gray-600 font-medium">Hiện tại</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#A0AEC0]"></span>
                    <span className="text-[10px] text-gray-600 font-medium">1h trước</span>
                </div>
            </div>
        </div>

        <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                barSize={32}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                    dy={10}
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                />
                <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                <Bar 
                    dataKey="Hiện tại" 
                    fill="#0077C2" 
                    radius={[4, 4, 0, 0]} 
                    animationDuration={1000}
                />
                <Bar 
                    dataKey="1h trước" 
                    fill="#A0AEC0" 
                    radius={[4, 4, 0, 0]} 
                    animationDuration={1000}
                />
            </BarChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};