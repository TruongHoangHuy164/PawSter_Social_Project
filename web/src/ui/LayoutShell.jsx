import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/auth.jsx';
import ProBadge from './ProBadge.jsx';
import BottomBar from './BottomBar.jsx';

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
            {user?.isAdmin ? (
              <>
                <NavItem to="/admin">Admin</NavItem>
              </>
            ) : (
              <>
                <NavItem to="/friends">Friends</NavItem>
                <NavItem to="/qr">QR</NavItem>
                <NavItem to="/upgrade">Upgrade</NavItem>
                <NavItem to="/profile">Profile</NavItem>
              </>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <button aria-label="Chuyển nền sáng/tối" title="Toggle theme" onClick={()=>setTheme(t=>t==='light'?'dark':'light')} className="px-2 py-1 rounded-md border border-transparent hover:border-black/6 dark:hover:border-white/10 transition pop bg-transparent">
              {theme==='light' ? '🌙' : '🌞'}
            </button>
            {user && <div className="flex items-center gap-2 text-sm" style={{color:'var(--text)'}}>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-neutral-800 dark:to-neutral-700 flex items-center justify-center text-sm text-muted">{user.username?.[0]||'U'}</div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user.username}</span>
                <span className="text-xs muted">@{user.username}</span>
              </div>
              {user.isPro && <ProBadge />}
            </div>}
            {user && <button onClick={()=>{logout(); navigate('/login');}} className="text-xs px-3 py-1 rounded bg-transparent border" style={{borderColor:'var(--panel-border)'}}>Logout</button>}
            {!user && <button onClick={()=>navigate('/login')} className="text-xs px-3 py-1 rounded bg-violet-600 hover:bg-violet-500 text-white">Login</button>}
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>

  {!user?.isAdmin && <BottomBar />}
    </div>
  );
}
