import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../state/auth.jsx';
import { Feed, Login, Register, Profile, Friends, Upgrade, QR, Search, Favorites, Messages } from './index.js';
import LayoutShell from '../ui/LayoutShell.jsx';

const Protected = ({ children }) => {
  const { token, loading } = useAuth();
  if (loading) return <div className="p-6">Loading...</div>;
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
        <Route element={<LayoutShell />}> 
          <Route index element={<Protected><Feed /></Protected>} />
          <Route path="/profile" element={<Protected><Profile /></Protected>} />
          <Route path="/friends" element={<Protected><Friends /></Protected>} />
          <Route path="/upgrade" element={<Protected><Upgrade /></Protected>} />
          <Route path="/qr" element={<Protected><QR /></Protected>} />
          <Route path="/search" element={<Protected><Messages /></Protected>} />
          <Route path="/messages" element={<Protected><Messages /></Protected>} />
          <Route path="/favorites" element={<Protected><Favorites /></Protected>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
