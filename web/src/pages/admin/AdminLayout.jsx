import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/auth.jsx';

export default function AdminLayout(){
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    try {
      logout();
    } catch {}
    // Điều hướng về trang đăng nhập hoặc trang chủ tùy bạn
    navigate('/login');
  };
  return (
    <div className="grid grid-cols-12 gap-4">
      <aside className="col-span-12 md:col-span-3 lg:col-span-2 card p-4">
        <h2 className="font-bold mb-3">Admin</h2>
        <nav className="space-y-1">
          <NavLink to="/admin" end className={({isActive})=>`block px-2 py-1 rounded ${isActive?'bg-black/10 dark:bg-white/10':''}`}>Tổng quan</NavLink>
          <NavLink to="/admin/users" className={({isActive})=>`block px-2 py-1 rounded ${isActive?'bg-black/10 dark:bg-white/10':''}`}>Người dùng</NavLink>
          <NavLink to="/admin/moderation" className={({isActive})=>`block px-2 py-1 rounded ${isActive?'bg-black/10 dark:bg-white/10':''}`}>Kiểm duyệt</NavLink>
          <NavLink to="/admin/reports" className={({isActive})=>`block px-2 py-1 rounded ${isActive?'bg-black/10 dark:bg-white/10':''}`}>Báo cáo</NavLink>
          <NavLink to="/admin/threads" className={({isActive})=>`block px-2 py-1 rounded ${isActive?'bg-black/10 dark:bg-white/10':''}`}>Bài viết</NavLink>
          <NavLink to="/admin/payments" className={({isActive})=>`block px-2 py-1 rounded ${isActive?'bg-black/10 dark:bg-white/10':''}`}>Thanh toán</NavLink>
          <button
            type="button"
            onClick={handleLogout}
            className="block w-full text-left px-2 py-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            Đăng xuất
          </button>
        </nav>
      </aside>
      <main className="col-span-12 md:col-span-9 lg:col-span-10">
        <Outlet />
      </main>
    </div>
  );
}
