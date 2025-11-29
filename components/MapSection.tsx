import React from 'react';

export const MapSection = () => {
  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-bold text-text-primary">Mức độ ngập theo Khu vực</h3>
        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Live</span>
      </div>
      
      <div className="relative flex-1 w-full rounded-lg overflow-hidden border border-border-color group">
         {/* Using the original map image for fidelity, but styled as a component */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBFC5KKH_O1fRimPSEU04oyYo3sHOMCvB_VfK0eWhfbCut_ct4AODuxl6vrCvHOJFHP41ESve1Q2FDmfg6ms-AwtmbigNXrol_QUBokDptGHuy_NTw_ZNxMXIWdYLhzNKqiHfDdVx3BD6kpL0n2yGdSAumsPzQrmvxgr-x72vXEnjl7-x9dbqKiRSVXRERZdQuxdOvs_pKykXPR8pNlAdc7zMzMa1fB-8yzXxbsKbuzfCPivVzlUo0ZDb_bgYmDNNcmT3hsfnJD5OL_')" }}
          role="img"
          aria-label="Map showing flood zones in Ho Chi Minh City"
        ></div>
        
        {/* Overlay controls mock */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button className="h-8 w-8 bg-white rounded-md shadow-md flex items-center justify-center text-text-secondary hover:text-primary">
            <span className="material-symbols-outlined !text-xl">add</span>
          </button>
          <button className="h-8 w-8 bg-white rounded-md shadow-md flex items-center justify-center text-text-secondary hover:text-primary">
            <span className="material-symbols-outlined !text-xl">remove</span>
          </button>
        </div>

        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-md shadow-md text-xs">
            <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-[#004d7a]"></div>
                <span>Ngập sâu (>50cm)</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-[#0077C2]"></div>
                <span>Ngập vừa (20-50cm)</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#90cdf4]"></div>
                <span>Ngập nhẹ (&lt;20cm)</span>
            </div>
        </div>
      </div>
    </div>
  );
};