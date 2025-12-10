import React, { useState } from 'react';

export const LoginPage = ({ onLogin, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    onLogin(username, password, (isSuccess) => {
        setIsLoading(false);
        if (!isSuccess) {
            setError('Tên đăng nhập hoặc mật khẩu không đúng.');
        }
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0">
         <div className="absolute top-0 left-0 w-full h-1/2 bg-primary"></div>
         <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gray-100"></div>
         <svg className="absolute top-1/2 left-0 w-full -translate-y-1/2 text-gray-100 fill-current" viewBox="0 0 1440 320">
            <path fillOpacity="1" d="M0,64L48,80C96,96,192,128,288,128C384,128,480,96,576,90.7C672,85,768,107,864,128C960,149,1056,171,1152,165.3C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
         </svg>
      </div>

      <div className="relative z-10 bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-300 mx-4">
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4 ring-4 ring-blue-100">
                <span className="material-symbols-outlined text-primary !text-4xl">water_drop</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">AquaSafe Login</h2>
            <p className="text-sm text-gray-500 mt-1">Hệ thống giám sát & cảnh báo ngập lụt</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
                    <span className="material-symbols-outlined !text-[18px]">error</span>
                    {error}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label>
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 !text-[20px]">person</span>
                    <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                        placeholder="Nhập tên đăng nhập..."
                        required
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 !text-[20px]">lock</span>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                        placeholder="Nhập mật khẩu..."
                        required
                    />
                </div>
            </div>

            <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
                {isLoading ? (
                    <>
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Đang xử lý...
                    </>
                ) : (
                    <>
                        <span>Đăng nhập</span>
                        <span className="material-symbols-outlined !text-[20px]">arrow_forward</span>
                    </>
                )}
            </button>
        </form>

        <div className="mt-6 text-center">
            <button 
                onClick={onBack}
                className="text-sm text-gray-500 hover:text-primary font-medium flex items-center justify-center gap-1 mx-auto transition-colors"
            >
                <span className="material-symbols-outlined !text-[16px]">arrow_back</span>
                Quay lại trang theo dõi
            </button>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
            &copy; 2024 AquaSafe Monitoring System. <br/> Phiên bản v1.0.2
        </div>
      </div>
    </div>
  );
};