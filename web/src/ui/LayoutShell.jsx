import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/auth.jsx';
import ProBadge from './ProBadge.jsx';
import Avatar from './Avatar.jsx';
import BottomBar from './BottomBar.jsx';
import LeftSidebar from './LeftSidebar.jsx';
import FloatingChatButton from './FloatingChatButton.jsx';

const NavItem = ({ to, children }) => <NavLink to={to} className={({isActive})=>`px-3 py-2 rounded-full text-sm font-medium hover:shadow-sm ${isActive?`bg-[color:var(--panel)] text-[color:var(--accent)]`:'text-muted'}`}>{children}</NavLink>;

export default function LayoutShell(){
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // Start in light theme by default to avoid previously saved dark state
  const [theme, setTheme] = useState('light');

  useEffect(()=>{
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
    } else {
      root.classList.add('dark');
      document.body.classList.add('dark');
    }
    localStorage.setItem('theme', theme);
  },[theme]);

  return (
  <div className="min-h-screen flex flex-col pb-20 md:pb-0 transition-colors duration-200">{/* pb for mobile bottom bar space */}
      <header className="border-b bg-opacity-40 backdrop-blur sticky top-0 z-20" style={{borderColor:'rgba(255,255,255,0.04)'}}>
        <div className="max-w-5xl mx-auto flex items-center gap-4 px-4 h-14">
          <div className="flex items-center gap-3 font-semibold text-lg">
            <img src="/logo.png" alt="Pawster logo" className="w-10 h-10 rounded-lg shadow-sm" />
            <span className="sr-only">Pawster</span>
            <div className="hidden sm:block text-lg font-semibold">Paw<span className="text-violet-400">ster</span></div>
          </div>
          <nav className="hidden md:flex gap-2">
            <NavItem to="/">Feed</NavItem>
            <NavItem to="/friends">Friends</NavItem>
            <NavItem to="/qr">QR</NavItem>
            <NavItem to="/upgrade">Upgrade</NavItem>
            <NavItem to="/profile">Profile</NavItem>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <button aria-label="Chuyển nền sáng/tối" title="Toggle theme" onClick={()=>setTheme(t=>t==='light'?'dark':'light')} className="px-2 py-1 rounded-md border border-transparent hover:border-black/6 dark:hover:border-white/10 transition pop bg-transparent">
              {theme==='light' ? '🌙' : '🌞'}
            </button>
            {user && (
              <div className="flex items-center gap-2 text-sm" style={{color:'var(--text)'}}>
                <Avatar user={{ username: user?.username, avatarUrl: user?.avatarUrl || user?.avatar || user?.profile?.avatarUrl }} size="sm" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user.username}</span>
                  <span className="text-xs muted">@{user.username}</span>
                </div>
                {user.isPro && <ProBadge />}
              </div>
            )}
            {user && <button onClick={()=>{logout(); navigate('/login');}} className="text-xs px-3 py-1 rounded bg-transparent border" style={{borderColor:'var(--panel-border)'}}>Logout</button>}
            {!user && <button onClick={()=>navigate('/login')} className="text-xs px-3 py-1 rounded bg-violet-600 hover:bg-violet-500 text-white">Login</button>}
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="w-full grid grid-cols-12 gap-6 px-4 md:px-6 md:pl-0">
          {/* Left Sidebar (desktop only) */}
          {!user?.isAdmin && (
            <aside className="hidden md:block col-span-2">
              <LeftSidebar />
            </aside>
          )}
          {/* Content */}
          <section className={`${!user?.isAdmin ? 'col-span-12 md:col-span-10' : 'col-span-12'}`}>
            {!user?.isAdmin ? (
              <div className="max-w-3xl mx-auto w-full">
                <Outlet />
              </div>
            ) : (
              <Outlet />
            )}
          </section>
        </div>
      </main>

      {/* BottomBar only on mobile (and not for admin) */}
      {!user?.isAdmin && (
        <div className="md:hidden">
          <BottomBar />
        </div>
      )}

      {/* Floating chat button for all screens (non-admin) */}
      {!user?.isAdmin && (
        <FloatingChatButton />
      )}
    </div>
  );
}
