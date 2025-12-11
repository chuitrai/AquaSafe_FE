import React, { useState, useEffect } from 'react';
import actionConfig from '../actions.json';

export const ZoneAlertModal = ({ isOpen, onClose, zone, senderName = "Nguyễn Văn A" }) => {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    
    // Smart suggestions state
    const [suggestedActions, setSuggestedActions] = useState([]);

    // Helper to generate full message from a specific action content
    const generateMessage = (actionContent, zoneData) => {
        const timeString = new Date().toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
        return `Kính gửi: UBND ${zoneData.location}
Thời gian: ${timeString}
Cảnh báo: Mực nước đạt ${zoneData.level}m

YÊU CẦU THỰC HIỆN NGAY:
${actionContent}.

Đề nghị báo cáo kết quả trước ${new Date(Date.now() + 2 * 60 * 60 * 1000).getHours()}:00.`;
    };

    useEffect(() => {
        if (isOpen && zone) {
            setMessage('');
            setIsSuccess(false);
            setIsSending(false);

            // Logic to find matching config based on water level
            const currentLevel = parseFloat(zone.level);
            
            const matchingConfig = actionConfig.flood_response_config.find(
                item => currentLevel >= item.min_level && currentLevel <= item.max_level
            );

            if (matchingConfig && matchingConfig.actions.length > 0) {
                setSuggestedActions(matchingConfig.actions);
                
                // Auto-fill the first action (highest priority in list)
                const defaultAction = matchingConfig.actions[0].content;
                setMessage(generateMessage(defaultAction, zone));
            } else {
                setSuggestedActions([]);
                setMessage(''); // Reset or set a generic default if no range matches
            }
        }
    }, [isOpen, zone]);

    if (!isOpen || !zone) return null;

    // Map severity to Vietnamese title
    const getSeverityTitle = (severity) => {
        switch(severity) {
            case 'critical': return 'CẢNH BÁO: MỨC ĐỘ NGUY HIỂM';
            case 'high': return 'CẢNH BÁO: MỨC ĐỘ CAO';
            case 'medium': return 'CẢNH BÁO: MỨC ĐỘ TRUNG BÌNH';
            default: return 'THÔNG BÁO TÌNH HÌNH NGẬP';
        }
    };

    const handleSend = () => {
        if (!message.trim()) return;
        setIsSending(true);

        // Simulate API Payload
        const payload = {
            recipient: `UBND ${zone.location}`, 
            title: getSeverityTitle(zone.severity),
            level: `${zone.level}m`,
            content: message,
            sender: senderName,
            timestamp: new Date().toISOString()
        };

        console.log("Sending Alert Payload:", payload);

        // Simulate Network Delay
        setTimeout(() => {
            setIsSending(false);
            setIsSuccess(true);
            setTimeout(() => {
                onClose();
            }, 1500);
        }, 1000);
    };

    const handleSuggestionClick = (actionContent) => {
        setMessage(generateMessage(actionContent, zone));
    };

    return (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-gray-200 overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-200 m-4 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className={`px-6 py-4 shrink-0 flex justify-between items-center ${
                    zone.severity === 'critical' ? 'bg-red-600' : 
                    zone.severity === 'high' ? 'bg-orange-500' : 
                    zone.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-600'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                            <span className="material-symbols-outlined text-white !text-[24px]">notifications_active</span>
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg leading-tight">Gửi Cảnh Báo UBND</h3>
                            <p className="text-white/80 text-xs">Hệ thống chỉ đạo trực tuyến</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-1 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="p-6 overflow-y-auto">
                    {/* Auto-filled Info Card */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-5 text-sm shadow-sm">
                        <div className="grid grid-cols-2 gap-y-2">
                            <div>
                                <span className="text-gray-500 text-xs uppercase font-bold">Nơi nhận:</span>
                                <p className="font-bold text-gray-800">UBND {zone.location}</p>
                            </div>
                            <div>
                                <span className="text-gray-500 text-xs uppercase font-bold">Người gửi:</span>
                                <p className="font-bold text-gray-800">{senderName}</p>
                            </div>
                            <div>
                                <span className="text-gray-500 text-xs uppercase font-bold">Mức ngập:</span>
                                <p className="font-bold text-red-600 text-lg">{zone.level}m</p>
                            </div>
                            <div>
                                <span className="text-gray-500 text-xs uppercase font-bold">Trạng thái:</span>
                                <p className={`font-bold ${zone.status === 'rising' ? 'text-red-500' : 'text-green-600'}`}>
                                    {zone.status === 'rising' ? 'Đang dâng cao ↗' : 'Đang rút dần ↘'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Message Input */}
                    <div className="mb-4">
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex justify-between">
                            <span>Nội dung chỉ đạo <span className="text-red-500">*</span></span>
                            <span className="text-xs font-normal text-gray-400 italic">Đã điền mẫu tự động</span>
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-h-[140px] font-mono leading-relaxed"
                            placeholder="Nhập nội dung thông báo..."
                        ></textarea>
                    </div>

                    {/* Quick Actions Suggestions */}
                    {suggestedActions.length > 0 && (
                        <div className="animate-in slide-in-from-bottom-2 fade-in duration-300">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                                <span className="material-symbols-outlined !text-[14px]">smart_toy</span>
                                Hành động đề xuất (Mực nước {zone.level}m)
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {suggestedActions.map((action) => (
                                    <button
                                        key={action.id}
                                        onClick={() => handleSuggestionClick(action.content)}
                                        className="inline-flex items-center px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 hover:border-blue-300 transition-colors active:scale-95"
                                        title="Nhấn để áp dụng mẫu này"
                                    >
                                        {action.content}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200 shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Hủy
                    </button>
                    <button 
                        onClick={handleSend}
                        disabled={isSending || !message.trim() || isSuccess}
                        className={`flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded-lg shadow-md transition-all ${
                            isSuccess 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'bg-blue-600 hover:bg-blue-700'
                        } ${isSending || !message.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isSending ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                Đang gửi...
                            </>
                        ) : isSuccess ? (
                            <>
                                <span className="material-symbols-outlined !text-[18px]">check_circle</span>
                                Đã gửi
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined !text-[18px]">send</span>
                                Gửi chỉ đạo
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};