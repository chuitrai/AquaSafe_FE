
import React from 'react';

export const MapControls = ({
    mapInstance,
    isLoggedIn,
    isDispatchOpen,
    setIsDispatchOpen,
    isSelectionMode,
    setIsSelectionMode,
    setIsPointSelectionMode,
    resetSelection,
    showHeatmap,
    setShowHeatmap
}) => {
    return (
        <div className="absolute right-4 top-4 flex flex-col items-end gap-2 z-[1000]">
            {/* Zoom Controls */}
            <div className="flex flex-col rounded-xl bg-white/90 shadow-lg backdrop-blur-sm ring-1 ring-black/5 overflow-hidden">
                <button
                    type="button"
                    onClick={() => { if (mapInstance) mapInstance.zoomIn(); }}
                    className="h-10 w-10 flex items-center justify-center hover:bg-gray-50 border-b border-gray-100 transition-colors">
                    <span className="material-symbols-outlined text-gray-700 !text-[20px]">add</span>
                </button>
                <button
                    type="button"
                    onClick={() => { if (mapInstance) mapInstance.zoomOut(); }}
                    className="h-10 w-10 flex items-center justify-center hover:bg-gray-50 transition-colors">
                    <span className="material-symbols-outlined text-gray-700 !text-[20px]">remove</span>
                </button>
            </div>

            {/* Heatmap Toggle */}
            <div className="flex flex-col rounded-xl bg-white/90 shadow-lg backdrop-blur-sm ring-1 ring-black/5 overflow-hidden mt-2">
                <button
                    type="button"
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className={`h-10 w-10 flex items-center justify-center transition-colors ${showHeatmap ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-600'}`}
                    title="Bật/Tắt bản đồ ngập"
                >
                    <span className="material-symbols-outlined !text-[20px]">layers</span>
                </button>
            </div>

            {/* Toggle Dispatch Panel Button - Only when logged in */}
            {isLoggedIn && (
                <button
                    type="button"
                    onClick={() => setIsDispatchOpen(!isDispatchOpen)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-lg backdrop-blur-sm ring-1 ring-black/5 transition-all mt-2 ${isDispatchOpen
                        ? 'bg-primary text-white ring-primary'
                        : 'bg-white/90 hover:bg-gray-100 text-gray-700'
                        }`}
                    title="Gửi tin nhắn điều phối"
                >
                    <span className="material-symbols-outlined !text-[20px]">{isDispatchOpen ? 'chat' : 'campaign'}</span>
                </button>
            )}

            {/* Selection Tool Button */}
            <button
                type="button"
                onClick={() => {
                    const newMode = !isSelectionMode;
                    setIsSelectionMode(newMode);
                    setIsPointSelectionMode(false);
                    if (newMode) resetSelection();
                }}
                className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-lg backdrop-blur-sm ring-1 ring-black/5 transition-all mt-2 ${isSelectionMode
                    ? 'bg-primary text-white ring-primary'
                    : 'bg-white/90 hover:bg-gray-100 text-gray-700'
                    }`}
                title="Chọn vùng (Hình chữ nhật)"
            >
                <span className="material-symbols-outlined !text-[20px]">
                    {isSelectionMode ? 'check_box' : 'crop_free'}
                </span>
            </button>

            {/* Recenter Button */}
            <button
                type="button"
                onClick={() => { if (mapInstance) mapInstance.setView([16.4637, 107.5909], 12); }}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/90 shadow-lg backdrop-blur-sm hover:bg-gray-100 ring-1 ring-black/5 transition-colors mt-2">
                <span className="material-symbols-outlined text-gray-700 !text-[20px]">my_location</span>
            </button>
        </div>
    );
};
