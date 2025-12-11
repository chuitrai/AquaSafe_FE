import React, { useState, useEffect } from 'react';

export const ZoneAlertModal = ({ isOpen, onClose, zone, senderName = "Nguyễn Văn A" }) => {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setMessage('');
            setIsSuccess(false);
            setIsSending(false);
        }
    }, [isOpen]);

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
            recipient: `UBND ${zone.location}`, // Assuming location name usually contains Ward name
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

    return (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-gray-200 overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-200 m-4">
                
                {/* Header */}
                <div className={`px-6 py-4 flex justify-between items-center ${
                    zone.severity === 'critical' ? 'bg-red-600' : 
                    zone.severity === 'high' ? 'bg-orange-500' : 'bg-blue-600'
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

                {/* Content */}
                <div className="p-6">
                    {/* Auto-filled Info Card */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-5 text-sm">
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
                                <span className="text-gray-500 text-xs uppercase font-bold">Mức ngập hiện tại:</span>
                                <p className="font-bold text-red-600">{zone.level}m ({zone.status === 'rising' ? 'Đang lên' : 'Đang rút'})</p>
                            </div>
                            <div>
                                <span className="text-gray-500 text-xs uppercase font-bold">Thời gian:</span>
                                <p className="text-gray-800">{new Date().toLocaleTimeString('vi-VN')} {new Date().toLocaleDateString('vi-VN')}</p>
                            </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-200">
                             <span className="text-gray-500 text-xs uppercase font-bold">Tiêu đề tự động:</span>
                             <p className="font-bold text-gray-800">{getSeverityTitle(zone.severity)}</p>
                        </div>
                    </div>

                    {/* Message Input */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Nội dung chỉ đạo / Cảnh báo <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-h-[100px]"
                            placeholder="Nhập nội dung thông báo chi tiết..."
                            autoFocus
                        ></textarea>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
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
                                Đã gửi thành công
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined !text-[18px]">send</span>
                                Gửi thông báo
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};