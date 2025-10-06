import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../state/auth.jsx';
import FeedPage from './FeedPage.jsx';
import LoginPage from './LoginPage.jsx';
import RegisterPage from './RegisterPage.jsx';
import ProfilePage from './ProfilePage.jsx';
import FriendsPage from './FriendsPage.jsx';
import ProUpgradePage from './ProUpgradePage.jsx';
import QRFriendPage from './QRFriendPage.jsx';
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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<LayoutShell />}> 
          <Route index element={<Protected><FeedPage /></Protected>} />
          <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
          <Route path="/friends" element={<Protected><FriendsPage /></Protected>} />
          <Route path="/upgrade" element={<Protected><ProUpgradePage /></Protected>} />
          <Route path="/qr" element={<Protected><QRFriendPage /></Protected>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
