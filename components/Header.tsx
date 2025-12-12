import React, { useState, useEffect, useRef } from 'react';

const TIME_OPTIONS = [
    { id: 'past-5', label: '5 phút trước' },
    { id: 'now', label: 'Hiện tại' },
    { id: 'future-5', label: '5 phút tới' },
    { id: 'future-30', label: '30 phút tới' },
    { id: 'future-60', label: '1 giờ tới' },
];

const MOCK_NOTIFICATIONS = [
    {
        id: 99,
        type: 'request', // New Type
        title: 'Yêu cầu hỗ trợ: Phường Vỹ Dạ',
        message: 'Cần điều động gấp 3 máy bơm công suất lớn để hút nước khu vực hầm chung cư.',
        time: '2 phút trước',
        isRead: false,
        source: 'Chủ tịch UBND P. Vỹ Dạ'
    },
    {
        id: 98,
        type: 'request', // New Type
        title: 'Yêu cầu vật tư: Phường Phú Hội',
        message: 'Xin hỗ trợ 50 áo phao và 2 xuồng cao su để di dời dân ngõ 12.',
        time: '5 phút trước',
        isRead: false,
        source: 'Tổ trưởng Tổ dân phố 6'
    },
    {
        id: 1,
        type: 'critical', // xả lũ
        title: 'Cảnh báo Xả lũ: Hồ Tả Trạch',
        message: 'Lưu lượng xả sẽ tăng lên 600m³/s bắt đầu từ 15:30 chiều nay. Yêu cầu di dời vùng hạ du.',
        time: '5 phút trước',
        isRead: false,
    },
    {
        id: 2,
        type: 'emergency', // cứu trợ khẩn cấp
        title: 'Cần hỗ trợ: Phường Phú Xuân',
        message: 'Khu vực tổ 6 ngập sâu >1.2m, 3 hộ dân mắc kẹt. Cần ca nô hỗ trợ khẩn cấp.',
        time: '12 phút trước',
        isRead: false,
    },
    {
        id: 3,
        type: 'warning',
        title: 'Cảnh báo mưa lớn diện rộng',
        message: 'Đài khí tượng thủy văn dự báo lượng mưa đạt 150mm trong 3 giờ tới.',
        time: '45 phút trước',
        isRead: true,
    },
    {
        id: 4,
        type: 'info',
        title: 'Chỉ đạo từ Ban Chỉ Huy PCTT',
        message: 'Yêu cầu các đơn vị duy trì trực ban 24/24, báo cáo số liệu mỗi 30 phút.',
        time: '1 giờ trước',
        isRead: true,
    }
];

export const Header = ({ currentView, onViewChange, onLocationSelect, timeFrame, onTimeFrameChange, isLoggedIn, onLoginToggle, onOpenResourceResponse }) => {
  const isMonitoring = currentView === 'monitoring';
  
  // Search State
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef(null);

  // Timeframe Dropdown State
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const timeRef = useRef(null);

  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const notificationRef = useRef(null);

  // Debounce search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length > 2) {
        setIsSearching(true);
        try {
          // OpenStreetMap Nominatim API
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=vn&addressdetails=1&limit=5`
          );
          const data = await response.json();
          setResults(data);
          setShowSearchDropdown(true);
        } catch (error) {
          console.error("Error searching location:", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setResults([]);
        setShowSearchDropdown(false);
      }
    }, 500); 

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
      if (timeRef.current && !timeRef.current.contains(event.target)) {
        setShowTimeDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectResult = (item) => {
    const locationData = {
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      displayName: item.display_name
    };
    
    setQuery(item.display_name.split(',')[0]); 
    setShowSearchDropdown(false);
    
    if (onLocationSelect) {
      onLocationSelect(locationData);
    }
  };

  const handleTimeSelect = (option) => {
    if (onTimeFrameChange) {
        onTimeFrameChange(option);
    }
    setShowTimeDropdown(false);
  };

  const markAllAsRead = () => {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className={`flex w-full items-center justify-between gap-4 px-6 py-3 shadow-sm shrink-0 z-20 border-b transition-colors duration-300 ${isMonitoring ? 'bg-blue-50 border-blue-200 h-16' : 'bg-white border-border-color'}`}>
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary !text-4xl">water_drop</span>
          <h1 className="text-xl font-bold text-primary tracking-tight">AquaSafe</h1>
        </div>
        <nav className="hidden md:flex items-center gap-2">
          <button 
            type="button"
            onClick={() => onViewChange('monitoring')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${isMonitoring ? 'bg-white text-primary shadow-sm ring-1 ring-black/5' : 'text-text-secondary hover:bg-gray-100'}`}
          >
            <span className="material-symbols-outlined !text-[20px]">dashboard</span>
            <span>Bảng điều khiển</span>
          </button>
          
          {/* Only show Analysis tab if Logged In */}
          {isLoggedIn && (
            <button 
                type="button"
                onClick={() => onViewChange('analysis')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${!isMonitoring ? 'bg-primary-light text-primary ring-1 ring-primary/20' : 'text-text-secondary hover:bg-white/60'}`}
            >
                <span className="material-symbols-outlined !text-[20px]">pie_chart</span>
                <span>Phân tích dữ liệu</span>
            </button>
          )}
        </nav>
      </div>
      
      <div className="flex items-center gap-4 flex-1 justify-end">
        {/* Search Bar - Visible to everyone in Monitoring view */}
        {isMonitoring && (
          <>
            <div className="relative w-full max-w-sm hidden lg:block" ref={searchRef}>
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 !text-[20px]">search</span>
              <input 
                className="h-10 w-full rounded-lg border-gray-300 bg-white pl-10 pr-10 text-sm text-gray-800 placeholder:text-gray-500 focus:border-primary focus:ring-primary shadow-sm border outline-none transition-all" 
                placeholder="Tìm kiếm địa chỉ, phường..." 
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => { if(results.length > 0) setShowSearchDropdown(true); }}
              />
              {isSearching && (
                 <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></span>
              )}

              {/* Search Results Dropdown */}
              {showSearchDropdown && results.length > 0 && (
                <div className="absolute top-12 left-0 w-full bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <ul>
                    {results.map((item) => (
                      <li 
                        key={item.place_id}
                        onClick={() => handleSelectResult(item)}
                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-none flex items-start gap-3 transition-colors"
                      >
                        <span className="material-symbols-outlined text-gray-400 mt-0.5 !text-[18px]">location_on</span>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-800 line-clamp-1">{item.display_name.split(',')[0]}</span>
                            <span className="text-xs text-gray-500 line-clamp-1">{item.display_name}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="bg-gray-50 px-3 py-1.5 text-[10px] text-gray-400 text-right flex items-center justify-end gap-1">
                    Powered by <span className="font-semibold">OpenStreetMap</span>
                  </div>
                </div>
              )}
            </div>

            {/* Timeframe Selector */}
            <div className="relative group hidden xl:block" ref={timeRef}>
              <button 
                type="button"
                onClick={() => setShowTimeDropdown(!showTimeDropdown)}
                className="flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 hover:bg-gray-50 transition-colors shadow-sm min-w-[140px]"
              >
                <span className="material-symbols-outlined text-gray-600 !text-[20px]">
                    {timeFrame?.id === 'now' ? 'history' : (timeFrame?.id.includes('future') ? 'update' : 'restore')}
                </span>
                <span className="text-sm font-medium text-gray-700 flex-1 text-left">{timeFrame?.label || 'Hiện tại'}</span>
                <span className={`material-symbols-outlined text-gray-600 !text-[20px] transition-transform duration-200 ${showTimeDropdown ? 'rotate-180' : ''}`}>arrow_drop_down</span>
              </button>

              {/* Timeframe Dropdown */}
              {showTimeDropdown && (
                <div className="absolute top-12 right-0 w-48 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Chọn thời gian</p>
                    </div>
                    <ul>
                        {TIME_OPTIONS.map((option) => (
                            <li 
                                key={option.id}
                                onClick={() => handleTimeSelect(option)}
                                className={`px-4 py-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-sm transition-colors ${timeFrame?.id === option.id ? 'bg-blue-50 text-primary font-semibold' : 'text-gray-700'}`}
                            >
                                <span>{option.label}</span>
                                {timeFrame?.id === option.id && (
                                    <span className="material-symbols-outlined !text-[18px]">check</span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
              )}
            </div>

            {/* Notifications - Only for logged in users */}
            {isLoggedIn && (
                <div className="relative" ref={notificationRef}>
                    <button 
                        type="button" 
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-all ${showNotifications ? 'bg-blue-50 border-blue-200 text-primary' : 'border-gray-200 bg-white hover:bg-gray-100 text-gray-600'} shadow-sm relative`}
                    >
                        <span className="material-symbols-outlined !text-[22px]">notifications</span>
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
                        )}
                    </button>

                    {/* Notifications Dropdown */}
                    {showNotifications && (
                        <div className="absolute top-12 right-0 w-80 md:w-96 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="px-4 py-3 bg-white border-b border-gray-100 flex justify-between items-center">
                                <h3 className="font-bold text-gray-800 text-sm">Thông báo</h3>
                                {unreadCount > 0 && (
                                    <button 
                                        onClick={markAllAsRead}
                                        className="text-xs text-primary font-medium hover:underline"
                                    >
                                        Đánh dấu đã đọc
                                    </button>
                                )}
                            </div>
                            <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
                                {notifications.length > 0 ? (
                                    notifications.map((notif) => (
                                        <div 
                                            key={notif.id} 
                                            onClick={() => notif.type === 'request' && onOpenResourceResponse(notif)}
                                            className={`p-4 border-b border-gray-50 transition-colors flex gap-3 relative group
                                                ${!notif.isRead ? 'bg-blue-50/30' : ''}
                                                ${notif.type === 'request' ? 'hover:bg-blue-50 cursor-pointer' : 'hover:bg-gray-50'}
                                            `}
                                        >
                                            {/* Icon */}
                                            <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                                notif.type === 'request' ? 'bg-purple-100 text-purple-600' :
                                                notif.type === 'critical' ? 'bg-red-100 text-red-600' :
                                                notif.type === 'emergency' ? 'bg-orange-100 text-orange-600' :
                                                notif.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                                                'bg-blue-100 text-blue-600'
                                            }`}>
                                                <span className="material-symbols-outlined !text-[18px]">
                                                    {notif.type === 'request' ? 'assignment_add' :
                                                     notif.type === 'critical' ? 'flood' : 
                                                     notif.type === 'emergency' ? 'sos' :
                                                     notif.type === 'warning' ? 'warning' : 'info'}
                                                </span>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-0.5">
                                                    <p className={`text-sm font-bold ${!notif.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                                                        {notif.title}
                                                    </p>
                                                    {!notif.isRead && <span className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0 ml-2"></span>}
                                                </div>
                                                <p className="text-xs text-gray-600 leading-relaxed mb-1.5 line-clamp-2">{notif.message}</p>
                                                
                                                <div className="flex justify-between items-center mt-2">
                                                    <p className="text-[10px] text-gray-400 font-medium">{notif.time}</p>
                                                    
                                                    {/* Request Action Button */}
                                                    {notif.type === 'request' && (
                                                        <span className="text-[10px] font-bold text-white bg-primary hover:bg-primary-dark px-2 py-1 rounded shadow-sm flex items-center gap-1 transition-colors">
                                                            <span className="material-symbols-outlined !text-[12px]">reply</span>
                                                            Phản hồi
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-gray-400 text-sm">
                                        Không có thông báo mới
                                    </div>
                                )}
                            </div>
                            <div className="px-4 py-2 bg-gray-50 text-center border-t border-gray-100">
                                <button className="text-xs font-bold text-gray-600 hover:text-primary transition-colors">
                                    Xem tất cả
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
          </>
        )}

        {/* User Profile / Login Toggle */}
        <div className={`flex items-center gap-3 ${isMonitoring ? '' : 'pl-6 border-l border-gray-200'}`}>
          {isLoggedIn ? (
             <>
                {!isMonitoring && (
                    <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-text-primary">Nguyễn Văn A</p>
                    <p className="text-xs text-text-secondary">Cán bộ quản lý</p>
                    </div>
                )}
                <div 
                    onClick={onLoginToggle}
                    title="Đăng xuất"
                    className="h-10 w-10 rounded-full bg-gray-200 bg-cover bg-center border-2 border-white shadow-sm cursor-pointer hover:ring-2 hover:ring-primary transition-all relative group" 
                    style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBP4CjPHfWhxzZ6Owv73OKeCoYsi39uDcJsL-DJvklcX-8Gkg4tdSHnUDWF4LKRLb-KmTGh4ID6C9UAWhw-kTyYiJxFBwclwf949IlgpBglZx6kgwtit6plHUklAKQQOwj8IiePVfbYezhIw2Q5WemGrOj04giWpiX2Xhhcf4XIV36KhsM3klY8Ldmo2XppH6_4oicxoetMHhPslTKD87FX7uACtsg6aXWIVWoeksZbrQip7k6nusOj7I1q-cNBLRCx8vBfDsBI0miJ")' }}
                >
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-white !text-[20px]">logout</span>
                    </div>
                </div>
             </>
          ) : (
            <button 
                type="button"
                onClick={onLoginToggle}
                className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-colors"
            >
                <span className="material-symbols-outlined !text-[20px]">login</span>
                <span>Đăng nhập</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};