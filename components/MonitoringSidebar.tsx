import React, { useState, useEffect, useRef } from 'react';

// Helper component to render dynamic time ago (e.g. "1 min ago")
const TimeAgo = ({ timestamp }) => {
    const [timeString, setTimeString] = useState('Vừa xong');

    useEffect(() => {
        const updateTime = () => {
            const now = Date.now();
            const diffInSeconds = Math.floor((now - timestamp) / 1000);

            if (diffInSeconds < 60) {
                setTimeString('Vừa xong');
            } else {
                const diffInMinutes = Math.floor(diffInSeconds / 60);
                setTimeString(`${diffInMinutes}p trước`);
            }
        };

        updateTime();
        const interval = setInterval(updateTime, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [timestamp]);

    return <span>{timeString}</span>;
};

export const MonitoringSidebar = ({ zones, selectedZoneId, onZoneSelect, activeLayers, onToggleLayer, isLoggedIn }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="relative h-full shrink-0 z-20">
      <aside className={`h-full flex flex-col border-r border-gray-200 bg-white transition-all duration-300 ${collapsed ? 'w-0 overflow-hidden border-none' : 'w-80'}`}>
        
        {/* Filters & Layers */}
        <div className="p-4 border-b border-gray-200 flex flex-col gap-4 bg-white z-10">
          <div className="flex gap-2">
             <div className="relative flex-1">
                 <select className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                    <option>Thừa Thiên Huế</option>
                    <option>Đà Nẵng</option>
                    <option>Hồ Chí Minh</option>
                 </select>
                 <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 !text-[18px] text-gray-500 pointer-events-none">arrow_drop_down</span>
             </div>
             
             {isLoggedIn && (
                <div className="relative flex-1">
                    <select className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                        <option>Tất cả mức độ</option>
                        <option>Nguy hiểm</option>
                        <option>Cao</option>
                        <option>Trung bình</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 !text-[18px] text-gray-500 pointer-events-none">arrow_drop_down</span>
                </div>
             )}
          </div>
           
           {isLoggedIn && (
               <div className="flex flex-col gap-2">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Lớp bản đồ</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {['Đội cứu hộ', 'Điểm cứu trợ'].map((label) => (
                        <label key={label} className="flex items-center gap-2 cursor-pointer group select-none">
                          <div className="relative flex items-center">
                            <input 
                                className="peer h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer" 
                                type="checkbox" 
                                checked={activeLayers ? activeLayers.includes(label) : true}
                                onChange={() => onToggleLayer && onToggleLayer(label)}
                            />
                          </div>
                          <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">{label}</span>
                        </label>
                    ))}
                  </div>
                </div>
           )}
        </div>

        {/* Zones List Area */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {isLoggedIn ? (
                <>
                    <div className="flex items-center gap-2 mb-3 pl-1">
                        <span className="material-symbols-outlined text-primary !text-[22px]">warning</span>
                        <h2 className="font-bold text-gray-800 text-base">Vùng cảnh báo</h2>
                        <span className="ml-auto text-xs font-bold text-primary bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">{zones.length}</span>
                    </div>

                    <div className="flex flex-col gap-3">
                        {zones.length > 0 ? zones.map(zone => (
                        <div 
                            key={zone.id} 
                            onClick={() => onZoneSelect(zone.id)}
                            className={`group relative rounded-lg border p-3.5 transition-all hover:shadow-md cursor-pointer animate-in fade-in slide-in-from-left-2 duration-300 ${
                            selectedZoneId === zone.id 
                                ? 'border-primary bg-blue-50/40 ring-1 ring-primary shadow-sm' 
                                : 'border-gray-200 bg-white hover:border-primary/50'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                            <div className="pr-2">
                                <h3 className="font-bold text-gray-800 text-sm leading-tight mb-1 group-hover:text-primary transition-colors">{zone.location}</h3>
                                <p className="text-xs text-gray-500 font-medium">{zone.district}</p>
                            </div>
                            <div className={`flex flex-col items-end shrink-0 ${
                                zone.severity === 'critical' ? 'text-[#dc2626]' : 
                                zone.severity === 'high' ? 'text-[#f97316]' : 
                                zone.severity === 'medium' ? 'text-[#eab308]' : 'text-[#3b82f6]'
                            }`}>
                                <span className="font-bold text-lg leading-none">{zone.level}m</span>
                            </div>
                            </div>
                            
                            <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 border-dashed">
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <span className="material-symbols-outlined !text-[14px]">schedule</span>
                                    <TimeAgo timestamp={zone.timestamp} />
                                </div>
                                <div className={`flex items-center gap-1 text-xs font-bold ${
                                    zone.status === 'rising' ? 'text-red-500' : 
                                    zone.status === 'falling' ? 'text-green-500' : 'text-gray-500'
                                }`}>
                                    {zone.status === 'rising' ? 'Nước lên' : zone.status === 'falling' ? 'Nước rút' : 'Ổn định'}
                                    <span className="material-symbols-outlined !text-[16px]">
                                        {zone.status === 'rising' ? 'trending_up' : zone.status === 'falling' ? 'trending_down' : 'trending_flat'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        )) : (
                            <div className="text-center py-8 text-gray-500 text-xs">
                                Chưa phát hiện vùng ngập mới
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 space-y-4 p-4 opacity-70">
                     <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                         <span className="material-symbols-outlined !text-3xl text-gray-400">security</span>
                     </div>
                     <div>
                        <p className="text-sm font-semibold text-gray-700">Thông tin bị giới hạn</p>
                        <p className="text-xs mt-1 leading-relaxed">Vui lòng đăng nhập tài khoản cán bộ để xem chi tiết danh sách vùng cảnh báo.</p>
                     </div>
                </div>
            )}
        </div>

        {/* Legend */}
        <div className="p-3 border-t border-gray-200 bg-gray-50/50 shrink-0">
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-wide">Chú giải mức độ ngập</p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-2">
                 <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] ring-1 ring-white shadow-sm"></span>
                    <span className="text-xs text-gray-600">Nhẹ (&lt;0.2m)</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#eab308] ring-1 ring-white shadow-sm"></span>
                    <span className="text-xs text-gray-600">Trung bình (0.2-0.5m)</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] ring-1 ring-white shadow-sm"></span>
                    <span className="text-xs text-gray-600">Cao (0.5-1m)</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626] ring-1 ring-white shadow-sm"></span>
                    <span className="text-xs text-gray-600">Nguy hiểm (&gt;1m)</span>
                 </div>
            </div>
        </div>
      </aside>

      {/* Toggle Button */}
      <button 
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-1/2 -translate-y-1/2 left-full z-30 h-12 w-6 rounded-r-lg border-y border-r border-gray-200 bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-primary hover:bg-gray-50 transition-all cursor-pointer focus:outline-none"
        title={collapsed ? "Mở rộng" : "Thu gọn"}
      >
        <span className="material-symbols-outlined !text-[20px]">{collapsed ? 'chevron_right' : 'chevron_left'}</span>
      </button>
    </div>
  );
};