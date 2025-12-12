import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../utils/monitoringConstants';

export const useAuth = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Init: Check localStorage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('aquasafe_token');
        const storedUser = localStorage.getItem('aquasafe_user');

        if (storedToken) {
            setToken(storedToken);
            if (storedUser) {
                try {
                    setUser(JSON.parse(storedUser));
                } catch (e) {
                    console.error("Error parsing stored user", e);
                }
            }
            setIsLoggedIn(true);
        }
        setIsLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                const data = await response.json();
                const newToken = data.token;
                const userData = { username, role: 'Admin' }; // Mock user data if API doesn't return it

                // Save to State
                setToken(newToken);
                setUser(userData);
                setIsLoggedIn(true);

                // Save to Storage
                localStorage.setItem('aquasafe_token', newToken);
                localStorage.setItem('aquasafe_user', JSON.stringify(userData));
                
                return { success: true };
            } else {
                return { success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' };
            }
        } catch (error) {
            console.error("Login API error:", error);
            return { success: false, message: 'Lỗi kết nối máy chủ' };
        }
    };

    const logout = () => {
        // Clear State
        setIsLoggedIn(false);
        setToken(null);
        setUser(null);

        // Clear Storage
        localStorage.removeItem('aquasafe_token');
        localStorage.removeItem('aquasafe_user');
    };

    return { isLoggedIn, token, user, login, logout, isLoading };
};