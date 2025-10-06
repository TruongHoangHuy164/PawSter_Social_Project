import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/auth.jsx';
import ProBadge from './ProBadge.jsx';

const NavItem = ({ to, children }) => <NavLink to={to} className={({isActive})=>`px-3 py-2 rounded-md text-sm font-medium hover:bg-neutral-800 ${isActive?'bg-neutral-800 text-white':'text-neutral-300'}`}>{children}</NavLink>;

export default function LayoutShell(){
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-800 bg-neutral-900/70 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex items-center gap-4 px-4 h-14">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <img src="/logo.png" alt="Pawster logo" className="w-11 h-11 rounded" />
            <span>Paw<span className="text-violet-500">ster</span></span>
          </div>
          <nav className="flex gap-1">
            <NavItem to="/">Feed</NavItem>
            <NavItem to="/friends">Friends</NavItem>
            <NavItem to="/qr">QR</NavItem>
            <NavItem to="/upgrade">Upgrade</NavItem>
            <NavItem to="/profile">Profile</NavItem>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {user && <div className="flex items-center gap-2 text-sm text-neutral-300">{user.username}{user.isPro && <ProBadge />}</div>}
            <button onClick={()=>{logout(); navigate('/login');}} className="text-xs px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700">Logout</button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="py-6 text-center text-xs text-neutral-500">© {new Date().getFullYear()} Threads Web Clone</footer>
    </div>
  );
}
