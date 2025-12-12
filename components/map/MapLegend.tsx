
import React from 'react';

export const MapLegend = ({
    showHeatmap,
    heatmapData,
    isLoadingHeatmap,
    loadFloodHeatmap,
    setShowHeatmap,
    heatmapOpacity,
    setHeatmapOpacity
}) => {
    if (!showHeatmap || !heatmapData || isLoadingHeatmap) return null;

    return (
        <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50 w-64">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="font-bold text-gray-800 text-sm">Bản đồ ngập lụt</h3>
                    <p className="text-[10px] text-gray-500">Độ sâu ngập (mét)</p>
                </div>
                <div className="flex gap-1">
                    <button
                        type="button"
                        onClick={() => loadFloodHeatmap()}
                        className="p-1 hover:bg-gray-100 rounded text-gray-500"
                        title="Làm mới"
                    >
                        <span className="material-symbols-outlined !text-[16px]">refresh</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowHeatmap(false)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-500"
                        title="Ẩn"
                    >
                        <span className="material-symbols-outlined !text-[16px]">visibility_off</span>
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                {/* Gradient Bar */}
                <div
                    className="h-3 rounded-full border border-gray-200 shadow-inner w-full"
                    style={{
                        background: `linear-gradient(to right, ${heatmapData.legend?.colors?.join(', ') || '#ccc'})`
                    }}
                ></div>

                {/* Values */}
                <div className="flex justify-between text-[10px] font-medium text-gray-600">
                    <span>{heatmapData.legend?.values[0]?.toFixed(1)}m</span>
                    <span>{(heatmapData.legend?.values[2] || 0.5).toFixed(1)}m</span>
                    <span>{(heatmapData.legend?.values[4] || 1.5).toFixed(1)}m</span>
                </div>

                {/* Opacity Slider */}
                <div className="pt-2 mt-2 border-t border-gray-100">
                    <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                        <span>Độ mờ</span>
                        <span>{Math.round(heatmapOpacity * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={heatmapOpacity}
                        onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                </div>
            </div>
        </div>
    );
};
