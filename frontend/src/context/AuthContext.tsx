import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, NotificationItem } from '../types/index.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  switchRole: (role: string, email?: string) => Promise<void>;
  notifications: NotificationItem[];
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  unreadCount: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('ct_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    try {
      const storedToken = localStorage.getItem('ct_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${storedToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setToken(storedToken);
        fetchNotifications(storedToken);
      } else {
        localStorage.removeItem('ct_token');
        setUser(null);
        setToken(null);
      }
    } catch (err) {
      console.error('Auth verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('ct_token', newToken);
    setToken(newToken);
    setUser(newUser);
    fetchNotifications(newToken);
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem('ct_token');
      setToken(null);
      setUser(null);
      setNotifications([]);
    }
  };

  const switchRole = async (role: string, email?: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/quick-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, email }),
      });

      const data = await res.json();
      if (data.success) {
        login(data.token, data.user);
      } else {
        alert(data.error || 'Failed to switch role');
      }
    } catch (e) {
      console.error('Role switch failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async (currentToken?: string) => {
    const t = currentToken || token;
    if (!t) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const markNotificationRead = async (id: string) => {
    if (!token) return;
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        switchRole,
        notifications,
        fetchNotifications: () => fetchNotifications(),
        markNotificationRead,
        unreadCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
