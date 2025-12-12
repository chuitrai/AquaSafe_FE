import React from 'react';

export const MonitoringStats = ({ data }) => {
  // Helper to format numbers with commas
  const formatNumber = (num) => {
    return num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "0";
  };

  const isDataAvailable = !!data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Flood Level */}
        <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500">
                <span className="material-symbols-outlined !text-[20px]">water</span>
                <p className="text-xs font-bold uppercase tracking-wider">Độ ngập TB</p>
            </div>
            <p className="text-3xl font-bold text-gray-800 tracking-tight">
                {isDataAvailable ? `${data.avgFloodLevel}m` : "N/A"}
            </p>
            {isDataAvailable && (
                 <p className="text-xs font-semibold text-orange-500 flex items-center gap-1">
                    <span className="material-symbols-outlined !text-[14px]">trending_up</span>
                    +0.2m trong 1h qua
                </p>
            )}
        </div>

        {/* Stat 2: Population (Real Data) */}
        <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500">
                <span className="material-symbols-outlined !text-[20px]">groups</span>
                <p className="text-xs font-bold uppercase tracking-wider">Dân số ảnh hưởng</p>
            </div>
            <p className="text-3xl font-bold text-gray-800 tracking-tight">
                {isDataAvailable ? formatNumber(data.population) : "N/A"}
            </p>
             {isDataAvailable && (
                <p className="text-xs font-semibold text-green-600 flex items-center gap-1">
                    <span className="material-symbols-outlined !text-[14px]">info</span>
                    Dữ liệu từ GIS
                </p>
             )}
        </div>

        {/* Stat 3: Food (Mock) */}
        <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500">
                <span className="material-symbols-outlined !text-[20px]">local_shipping</span>
                <p className="text-xs font-bold uppercase tracking-wider">Lương thực</p>
            </div>
            <p className="text-3xl font-bold text-gray-800 tracking-tight">
                 {isDataAvailable ? `${Math.floor(data.food/2)} ` : "N/A "}
                 {isDataAvailable && <span className="text-lg text-gray-500 font-medium">tấn</span>}
            </p>
            {isDataAvailable && (
                <p className="text-xs font-semibold text-green-600 flex items-center gap-1">
                    <span className="material-symbols-outlined !text-[14px]">add_circle</span>
                    +0.5 tấn trong 2h qua
                </p>
            )}
        </div>

        {/* Stat 4: Rescue Workers (Mock) */}
        <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500">
                <span className="material-symbols-outlined !text-[20px]">health_and_safety</span>
                <p className="text-xs font-bold uppercase tracking-wider">Nhân viên cứu hộ</p>
            </div>
            <p className="text-3xl font-bold text-gray-800 tracking-tight">
                {isDataAvailable ? formatNumber(Math.floor(data.workers/10)) : "N/A"}
            </p>
            {isDataAvailable && (
                <p className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                    <span className="material-symbols-outlined !text-[14px]">radio_button_checked</span>
                    Đang hoạt động
                </p>
            )}
        </div>
    </div>
  );
};