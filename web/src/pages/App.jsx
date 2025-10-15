import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../state/auth.jsx';
import { SocketProvider } from '../state/socket.jsx';
import { Feed, Login, Register, Profile, Friends, Upgrade, QR, Search, Favorites, Messages, TagFeed, PaymentReturn } from './index.js';
import AdminLayout from './admin/AdminLayout.jsx';
import AdminDashboard from './admin/Dashboard.jsx';
import AdminUsers from './admin/Users.jsx';
import AdminThreads from './admin/Threads.jsx';
import AdminPayments from './admin/Payments.jsx';
import LayoutShell from '../ui/LayoutShell.jsx';

const Protected = ({ children }) => {
  const { token, loading } = useAuth();
  if (loading) return <div className="p-6">Loading...</div>;
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const AdminProtected = ({ children }) => {
  const { token, user, loading } = useAuth();
  if (loading) return <div className="p-6">Loading...</div>;
  if (!token) return <Navigate to="/login" replace />;
  if (!user?.isAdmin) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
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
            <Route path="/tag/:tag" element={<Protected><TagFeed /></Protected>} />
            <Route path="/payment/return" element={<Protected><PaymentReturn /></Protected>} />
           
            <Route path="/admin" element={<AdminProtected><AdminLayout /></AdminProtected>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="threads" element={<AdminThreads />} />
              <Route path="payments" element={<AdminPayments />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SocketProvider>
    </AuthProvider>
  );
}
