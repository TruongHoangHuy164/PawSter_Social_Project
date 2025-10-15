import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../utils/api.js';

const AuthCtx = createContext(null);

export const AuthProvider = ({ children }) => {
  // sanitize token stored in localStorage (avoid 'null'/'undefined' strings)
  const [token, setToken] = useState(() => {
    try {
      const t = localStorage.getItem('token');
      if (!t || t === 'null' || t === 'undefined') return null;
      return t;
    } catch (e) {
      return null;
    }
  });
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

  const login = (tok) => {
    if (!tok || typeof tok !== 'string') return;
    setToken(tok);
    try { localStorage.setItem('token', tok); } catch(e) {}
    setLoading(true);
  };
  const logout = () => { setToken(null); setUser(null); try { localStorage.removeItem('token'); } catch(e) {} };

  return <AuthCtx.Provider value={{ token, user, setUser, login, logout, loading }}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => useContext(AuthCtx);
