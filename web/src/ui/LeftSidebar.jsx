import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  HomeIcon as HomeOutline, 
  UsersIcon as UsersOutline, 
  PlusCircleIcon, 
  BellIcon as BellOutline, 
  UserCircleIcon 
} from '@heroicons/react/24/outline';
import { 
  HomeIcon as HomeSolid, 
  UsersIcon as UsersSolid, 
  BellIcon as BellSolid 
} from '@heroicons/react/24/solid';
import { useAuth } from '../state/auth.jsx';
import Avatar from './Avatar.jsx';
import ProBadge from './ProBadge.jsx';
import ChangePasswordModal from '../pages/ChangePasswordModal.jsx';

const iconClasses = 'w-5 h-5';

const HomeIcon = ({ active }) => active ? <HomeSolid className={iconClasses} /> : <HomeOutline className={iconClasses} />;
const FriendsIcon = ({ active }) => active ? <UsersSolid className={iconClasses} /> : <UsersOutline className={iconClasses} />;
const AddIcon = () => <PlusCircleIcon className="w-6 h-6" />;
const NotificationIcon = ({ active }) => active ? <BellSolid className={iconClasses} /> : <BellOutline className={iconClasses} />;
const UserIcon = () => <UserCircleIcon className={iconClasses} />;

const Item = ({ to, label, Icon }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-2xl text-sm transition border ${isActive ? 'text-black dark:text-white bg-white dark:bg-black border-black/10 dark:border-white/15' : 'text-neutral-500 dark:text-neutral-400 border-transparent hover:bg-black/5 dark:hover:bg-white/5'}`}
  >
    {({ isActive }) => <>
      <Icon active={isActive} />
      <span>{label}</span>
    </>}
  </NavLink>
);

export default function LeftSidebar({ onAdd, theme, setTheme }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState(false);
  const [openPwd, setOpenPwd] = useState(false);
  const openComposer = () => {
    if (onAdd) return onAdd();
    const el = document.getElementById('thread-composer');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('ring-2','ring-black');
  setTimeout(()=>el.classList.remove('ring-2','ring-black'), 1600);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="sticky top-0 space-y-4">
      {/* Logo Section */}
      <div className="bg-white dark:bg-black border border-black/10 dark:border-white/15 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Pawster logo" className="w-10 h-10 rounded-2xl shadow-sm" />
          <div className="text-lg font-semibold text-black dark:text-white">Pawster</div>
        </div>
      </div>

      {/* User Profile Section */}
      {user && (
        <div className="bg-white dark:bg-black border border-black/10 dark:border-white/15 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Avatar user={{ username: user?.username, avatarUrl: user?.avatarUrl || user?.avatar || user?.profile?.avatarUrl }} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold truncate">{user.username}</span>
                {user.isPro && <ProBadge />}
              </div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">@{user.username}</span>
              {user?.proExpiry && user.isPro && (
                <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
                  Pro đến: {(() => { 
                    try { 
                      return new Date(user.proExpiry).toLocaleDateString('vi-VN', { 
                        day:'2-digit', 
                        month:'2-digit', 
                        year:'2-digit' 
                      }); 
                    } catch { 
                      return ''; 
                    } 
                  })()}
                </div>
              )}
            </div>
            <div className="relative">
              <button 
                onClick={() => setOpenMenu(v => !v)} 
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                aria-label="Menu"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              {openMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl shadow-lg p-2 text-sm bg-white dark:bg-black border border-black/10 dark:border-white/15 z-50">
                  <button 
                    onClick={() => { setTheme(t => t === 'light' ? 'dark' : 'light'); setOpenMenu(false); }} 
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    <span className="text-base">
                      {theme === 'light' ? '🌙' : '🌞'}
                    </span>
                    {theme === 'light' ? 'Dark mode' : 'Light mode'}
                  </button>
                  <button 
                    onClick={() => { setOpenPwd(true); setOpenMenu(false); }} 
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
                    </svg>
                    Đổi mật khẩu
                  </button>
                  <button 
                    onClick={() => { logout(); navigate('/login'); }} 
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex flex-col gap-1">
        <Item to="/" label="Home" Icon={HomeIcon} />
        <Item to="/friends" label="Friends" Icon={FriendsIcon} />
        <button
          onClick={openComposer}
          className="mt-1 flex items-center gap-3 px-3 py-2 rounded-2xl text-sm text-white bg-black dark:bg-white dark:text-black shadow hover:shadow-md transition"
          aria-label="Thêm bài viết"
        >
          <AddIcon />
          <span>Tạo bài viết</span>
        </button>
        <Item to="/notification" label="Thông báo" Icon={NotificationIcon} />
        <Item to="/profile" label="Tôi" Icon={UserIcon} />
      </nav>

      {/* Password Change Modal */}
      <ChangePasswordModal open={openPwd} onClose={() => setOpenPwd(false)} />
    </div>
  );
}
