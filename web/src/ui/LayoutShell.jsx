import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/auth.jsx';
import ProBadge from './ProBadge.jsx';
import Avatar from './Avatar.jsx';
import BottomBar from './BottomBar.jsx';
import LeftSidebar from './LeftSidebar.jsx';
import FloatingChatButton from './FloatingChatButton.jsx';
import ChangePasswordModal from '../pages/ChangePasswordModal.jsx';

const NavItem = ({ to, children }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `px-3 py-2 rounded-2xl text-sm font-medium border transition-colors ${isActive ? 'text-black dark:text-white border-black/10 dark:border-white/15 bg-white dark:bg-black' : 'text-neutral-500 dark:text-neutral-400 border-transparent hover:bg-black/5 dark:hover:bg-white/5'}`}
  >
    {children}
  </NavLink>
);

export default function LayoutShell(){
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // Start in light theme by default to avoid previously saved dark state
  const [theme, setTheme] = useState('light');
  const [openPwd, setOpenPwd] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);

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
  <div className="min-h-screen flex flex-col pb-20 md:pb-0 transition-colors duration-200 bg-subtle-gradient">{/* pb for mobile bottom bar space */}
      <header className="border-b sticky top-0 z-20 bg-white/70 dark:bg-black/40 glass" style={{borderColor:'var(--panel-border)'}}>
        <div className="max-w-5xl mx-auto flex items-center gap-4 px-4 h-14">
          <div className="flex items-center gap-3 font-semibold text-lg">
            <img src="/logo.png" alt="Pawster logo" className="w-10 h-10 rounded-2xl shadow-sm" />
            <span className="sr-only">Pawster</span>
            <div className="hidden sm:block text-lg font-semibold text-black dark:text-white">Pawster</div>
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
            <button aria-label="Chuyển nền sáng/tối" title="Toggle theme" onClick={()=>setTheme(t=>t==='light'?'dark':'light')} className="px-2.5 py-1.5 rounded-2xl border border-black/10 dark:border-white/15 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition pop bg-transparent">
              {theme==='light' ? '🌙' : '🌞'}
            </button>
            {user && (
              <div className="relative flex items-center gap-2 text-sm" style={{color:'var(--text)'}}>
                <Avatar user={{ username: user?.username, avatarUrl: user?.avatarUrl || user?.avatar || user?.profile?.avatarUrl }} size="sm" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user.username}</span>
                  <span className="text-xs muted">@{user.username}</span>
                </div>
                {user.isPro && (
                  <div className="flex items-center gap-2">
                    <ProBadge />
                    {user?.proExpiry && (
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full"
                        title={(() => { try { return new Date(user.proExpiry).toLocaleString('vi-VN'); } catch { return ''; } })()}
                        style={{
                          background: 'rgba(124,58,237,0.08)',
                          border: '1px solid rgba(124,58,237,0.2)',
                          color: '#6b4a57'
                        }}
                      >
                        Hết hạn: {(() => { try { return new Date(user.proExpiry).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' }); } catch { return ''; } })()}
                      </span>
                    )}
                  </div>
                )}
                <button onClick={()=>setOpenMenu(v=>!v)} className="px-2 py-1 text-xs border rounded">▼</button>
                {openMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl shadow-lg p-2 text-sm bg-white dark:bg-[#111318] border" style={{borderColor:'var(--panel-border)'}}>
                    <button onClick={()=>{ setOpenPwd(true); setOpenMenu(false); }} className="w-full text-left px-3 py-2 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5">Đổi mật khẩu</button>
                    <button onClick={()=>{ logout(); navigate('/login'); }} className="w-full text-left px-3 py-2 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5">Đăng xuất</button>
                  </div>
                )}
              </div>
            )}
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
      <ChangePasswordModal open={openPwd} onClose={()=>setOpenPwd(false)} />
    </div>
  );
}
