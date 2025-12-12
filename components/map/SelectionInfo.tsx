
import React from 'react';

export const SelectionInfo = ({ selectionCoords, onClear }) => {
    if (!selectionCoords) return null;

    return (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur shadow-2xl rounded-xl p-4 border border-white/50 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-lg w-full">
            <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
                <span className="material-symbols-outlined text-primary">area_chart</span>
                <span className="font-bold text-gray-800 text-sm">Kết Quả Phân Tích Vùng</span>
                <button
                    type="button"
                    onClick={onClear}
                    className="ml-auto hover:bg-gray-100 rounded-full p-1 transition-colors"
                >
                    <span className="material-symbols-outlined !text-[18px] text-gray-400">close</span>
                </button>
            </div>
            <div className="text-center py-2 text-gray-500 text-xs italic">
                Đã chọn vùng: {selectionCoords.nw.lat}, {selectionCoords.nw.lng}
            </div>
        </div>
    );
};
