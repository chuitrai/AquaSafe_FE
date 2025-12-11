import React, { useState, useEffect } from 'react';

const RECIPIENTS = [
    { id: 'all', label: 'Tất cả đơn vị', icon: 'groups' },
    { id: 'rescue', label: 'Đội Cứu Hộ (Hiện trường)', icon: 'health_and_safety' },
    { id: 'police', label: 'Cảnh sát / An ninh', icon: 'local_police' },
    { id: 'medical', label: 'Y tế / Cấp cứu', icon: 'ambulance' },
    { id: 'logistics', label: 'Hậu cần / Tiếp tế', icon: 'inventory_2' },
];

export const DispatchPanel = ({ isOpen, onClose }) => {
    const [recipient, setRecipient] = useState('rescue');
    const [priority, setPriority] = useState('normal');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setMessage('');
            setShowSuccess(false);
            setIsSending(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSend = () => {
        if (!message.trim()) return;
        
        setIsSending(true);
        
        // Simulate API call
        setTimeout(() => {
            setIsSending(false);
            setShowSuccess(true);
            setTimeout(() => {
                onClose();
            }, 1500);
        }, 1000);
    };

    return (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-primary px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                            <span className="material-symbols-outlined text-white !text-[24px]">campaign</span>
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg leading-tight">Gửi Điều Phối</h3>
                            <p className="text-blue-100 text-xs">Hệ thống tin nhắn khẩn cấp (SMS/App)</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-1 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Recipient Selector */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Gửi đến</label>
                        <div className="relative">
                            <select 
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                                className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-2 focus:ring-primary focus:border-primary block p-3 pr-10 outline-none transition-all font-medium"
                            >
                                {RECIPIENTS.map(r => (
                                    <option key={r.id} value={r.id}>{r.label}</option>
                                ))}
                            </select>
                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">expand_more</span>
                        </div>
                    </div>

                    {/* Priority Selector */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Mức độ ưu tiên</label>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setPriority('normal')}
                                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center justify-center gap-2 ${priority === 'normal' ? 'bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-300' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                <span>Thông thường</span>
                            </button>
                            <button 
                                onClick={() => setPriority('urgent')}
                                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center justify-center gap-2 ${priority === 'urgent' ? 'bg-red-50 border-red-200 text-red-700 ring-1 ring-red-300' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                <span className="material-symbols-outlined !text-[18px]">warning</span>
                                <span>Khẩn cấp</span>
                            </button>
                        </div>
                    </div>

                    {/* Message Input */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nội dung tin nhắn</label>
                        <textarea 
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={4}
                            className="w-full bg-white border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-2 focus:ring-primary focus:border-primary block p-3 outline-none transition-all resize-none placeholder:text-gray-400"
                            placeholder="Nhập chỉ đạo hoặc thông tin cần truyền tải..."
                        ></textarea>
                        <div className="flex justify-between mt-1">
                            <span className="text-[10px] text-gray-400 italic">* Tin nhắn sẽ được gửi qua SMS và App thông báo</span>
                            <span className={`text-[10px] font-bold ${message.length > 160 ? 'text-red-500' : 'text-gray-400'}`}>{message.length}/160 ký tự</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-100">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Hủy bỏ
                    </button>
                    <button 
                        onClick={handleSend}
                        disabled={isSending || !message.trim() || showSuccess}
                        className={`px-6 py-2 rounded-lg text-sm font-bold text-white shadow-lg flex items-center gap-2 transition-all ${
                            showSuccess ? 'bg-green-500 hover:bg-green-600' : 'bg-primary hover:bg-primary-dark'
                        } ${isSending || !message.trim() ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {isSending ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                <span>Đang gửi...</span>
                            </>
                        ) : showSuccess ? (
                            <>
                                <span className="material-symbols-outlined !text-[18px]">check</span>
                                <span>Đã gửi</span>
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined !text-[18px]">send</span>
                                <span>Gửi tin nhắn</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};