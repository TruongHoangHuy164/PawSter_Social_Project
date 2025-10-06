import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../utils/api.js';

const AuthCtx = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!token);

  const fetchMe = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/users/me', token);
      setUser(res.data.data);
    } catch (e) {
      console.error(e);
      setToken(null);
      localStorage.removeItem('token');
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = (tok) => { setToken(tok); localStorage.setItem('token', tok); setLoading(true); };
  const logout = () => { setToken(null); setUser(null); localStorage.removeItem('token'); };

  return <AuthCtx.Provider value={{ token, user, setUser, login, logout, loading }}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => useContext(AuthCtx);
