import React, { useState, useEffect } from 'react';

export const ResourceResponseModal = ({ isOpen, onClose, request }) => {
    const [responseMessage, setResponseMessage] = useState('');
    const [status, setStatus] = useState('approved'); // approved | rejected | pending
    const [isSending, setIsSending] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (isOpen && request) {
            // Auto-generate a default template based on the request
            setResponseMessage(`Đã tiếp nhận yêu cầu từ ${request.source || 'đơn vị'}. Đang điều động lực lượng/vật tư hỗ trợ ngay lập tức.`);
            setStatus('approved');
            setIsSuccess(false);
            setIsSending(false);
        }
    }, [isOpen, request]);

    if (!isOpen || !request) return null;

    const handleSend = () => {
        if (!responseMessage.trim()) return;
        setIsSending(true);

        // Simulate API Call
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
            <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-gray-200 overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-200 m-4 flex flex-col">
                
                {/* Header */}
                <div className="bg-primary-dark px-6 py-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
                            <span className="material-symbols-outlined text-white !text-[24px]">assignment_return</span>
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg leading-tight">Phản hồi Yêu cầu</h3>
                            <p className="text-blue-200 text-xs">Điều phối nguồn lực khẩn cấp</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-1 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Original Request Info */}
                <div className="bg-blue-50/50 p-4 border-b border-blue-100">
                    <div className="flex gap-3">
                        <div className="shrink-0 mt-1">
                            <span className="material-symbols-outlined text-primary !text-[24px]">campaign</span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Yêu cầu từ: {request.source || 'Không xác định'}</p>
                            <h4 className="text-sm font-bold text-gray-900 mb-1">{request.title}</h4>
                            <p className="text-sm text-gray-700 leading-relaxed bg-white p-2 rounded border border-blue-100 shadow-sm">
                                "{request.message}"
                            </p>
                            <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                                <span className="material-symbols-outlined !text-[12px]">schedule</span>
                                {request.time}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Response Form */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Quyết định xử lý</label>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => { setStatus('approved'); setResponseMessage(`Đã tiếp nhận yêu cầu từ ${request.source}. Đang điều động lực lượng hỗ trợ.`); }}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all flex items-center justify-center gap-2 ${status === 'approved' ? 'bg-green-50 border-green-200 text-green-700 ring-1 ring-green-500' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                            >
                                <span className="material-symbols-outlined !text-[18px]">check_circle</span>
                                Phê duyệt / Điều động
                            </button>
                            <button 
                                onClick={() => { setStatus('rejected'); setResponseMessage(`Hiện tại chưa thể đáp ứng yêu cầu của ${request.source} do thiếu nhân lực. Vui lòng chờ chỉ đạo tiếp theo.`); }}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all flex items-center justify-center gap-2 ${status === 'rejected' ? 'bg-red-50 border-red-200 text-red-700 ring-1 ring-red-500' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                            >
                                <span className="material-symbols-outlined !text-[18px]">cancel</span>
                                Từ chối / Hoãn
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nội dung phản hồi</label>
                        <textarea
                            value={responseMessage}
                            onChange={(e) => setResponseMessage(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none min-h-[100px]"
                            placeholder="Nhập nội dung chỉ đạo hoặc thông báo lại..."
                        ></textarea>
                    </div>
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
                        disabled={isSending || !responseMessage.trim() || isSuccess}
                        className={`flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded-lg shadow-md transition-all ${
                            isSuccess 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'bg-primary hover:bg-primary-dark'
                        } ${isSending || !responseMessage.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                                Gửi phản hồi
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};