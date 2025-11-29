import React from 'react';

export const Header = ({ currentView, onViewChange }) => {
  const isMonitoring = currentView === 'monitoring';

  return (
    <header className={`flex w-full items-center justify-between gap-4 px-6 py-3 shadow-sm shrink-0 z-20 border-b transition-colors duration-300 ${isMonitoring ? 'bg-blue-50 border-blue-200 h-16' : 'bg-white border-border-color'}`}>
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary !text-4xl">water_drop</span>
          <h1 className="text-xl font-bold text-primary tracking-tight">AquaSafe</h1>
        </div>
        <nav className="hidden md:flex items-center gap-2">
          <button 
            onClick={() => onViewChange('monitoring')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${isMonitoring ? 'bg-white text-primary shadow-sm ring-1 ring-black/5' : 'text-text-secondary hover:bg-gray-100'}`}
          >
            <span className="material-symbols-outlined !text-[20px]">dashboard</span>
            <span>Bảng điều khiển</span>
          </button>
          <button 
            onClick={() => onViewChange('analysis')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${!isMonitoring ? 'bg-primary-light text-primary ring-1 ring-primary/20' : 'text-text-secondary hover:bg-white/60'}`}
          >
            <span className="material-symbols-outlined !text-[20px]">pie_chart</span>
            <span>Phân tích dữ liệu</span>
          </button>
        </nav>
      </div>
      
      <div className="flex items-center gap-4 flex-1 justify-end">
        {isMonitoring && (
          <>
            <div className="relative w-full max-w-sm hidden lg:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 !text-[20px]">search</span>
              <input 
                className="h-10 w-full rounded-lg border-gray-300 bg-white pl-10 text-sm text-gray-800 placeholder:text-gray-500 focus:border-primary focus:ring-primary shadow-sm border outline-none" 
                placeholder="Tìm kiếm địa chỉ, phường..." 
                type="search"
              />
            </div>
            <div className="relative group hidden xl:block">
              <button className="flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 hover:bg-gray-50 transition-colors shadow-sm">
                <span className="material-symbols-outlined text-gray-600 !text-[20px]">history</span>
                <span className="text-sm font-medium text-gray-700">Hiện tại</span>
                <span className="material-symbols-outlined text-gray-600 !text-[20px]">arrow_drop_down</span>
              </button>
            </div>
            <button className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-100 shadow-sm">
              <span className="material-symbols-outlined text-gray-600 !text-[22px]">notifications</span>
            </button>
          </>
        )}

        <div className={`flex items-center gap-3 ${isMonitoring ? '' : 'pl-6 border-l border-gray-200'}`}>
          {!isMonitoring && (
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-text-primary">Nguyễn Văn A</p>
              <p className="text-xs text-text-secondary">Cán bộ quản lý</p>
            </div>
          )}
          <div 
            className="h-10 w-10 rounded-full bg-gray-200 bg-cover bg-center border-2 border-white shadow-sm cursor-pointer hover:ring-2 hover:ring-primary transition-all" 
            style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBP4CjPHfWhxzZ6Owv73OKeCoYsi39uDcJsL-DJvklcX-8Gkg4tdSHnUDWF4LKRLb-KmTGh4ID6C9UAWhw-kTyYiJxFBwclwf949IlgpBglZx6kgwtit6plHUklAKQQOwj8IiePVfbYezhIw2Q5WemGrOj04giWpiX2Xhhcf4XIV36KhsM3klY8Ldmo2XppH6_4oicxoetMHhPslTKD87FX7uACtsg6aXWIVWoeksZbrQip7k6nusOj7I1q-cNBLRCx8vBfDsBI0miJ")' }}
          ></div>
        </div>
      </div>
    </header>
  );
};