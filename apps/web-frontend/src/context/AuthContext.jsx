import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isLoggedIn = !!(localStorage.getItem('khach_hang_login'));

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('khach_hang_login');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/api/khach-hang/data-login');
      if (res.data.status) {
        setUser(res.data.data);
      }
    } catch (err) {
      console.error('Load user error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = (token) => {
    localStorage.setItem('khach_hang_login', token);
    loadUser();
  };

  const logout = async () => {
    try {
      await api.get('/api/khach-hang/dang-xuat');
    } catch (err) {
      console.error(err);
    } finally {
      localStorage.removeItem('khach_hang_login');
      setUser(null);
      toast.success('Đăng xuất thành công!');
    }
  };

  const logoutAll = async () => {
    try {
      await api.get('/api/khach-hang/dang-xuat-tat-ca');
    } catch (err) {
      console.error(err);
    } finally {
      localStorage.removeItem('khach_hang_login');
      setUser(null);
      toast.success('Đã đăng xuất khỏi tất cả thiết bị!');
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, isLoggedIn, login, logout, logoutAll, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
