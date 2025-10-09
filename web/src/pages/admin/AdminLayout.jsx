import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

export default function AdminLayout(){
  return (
    <div className="grid grid-cols-12 gap-4">
      <aside className="col-span-12 md:col-span-3 lg:col-span-2 card p-4">
        <h2 className="font-bold mb-3">Admin</h2>
        <nav className="space-y-1">
          <NavLink to="/admin" end className={({isActive})=>`block px-2 py-1 rounded ${isActive?'bg-black/10 dark:bg-white/10':''}`}>Tổng quan</NavLink>
          <NavLink to="/admin/users" className={({isActive})=>`block px-2 py-1 rounded ${isActive?'bg-black/10 dark:bg-white/10':''}`}>Người dùng</NavLink>
          <NavLink to="/admin/threads" className={({isActive})=>`block px-2 py-1 rounded ${isActive?'bg-black/10 dark:bg-white/10':''}`}>Bài viết</NavLink>
          <NavLink to="/admin/payments" className={({isActive})=>`block px-2 py-1 rounded ${isActive?'bg-black/10 dark:bg-white/10':''}`}>Thanh toán</NavLink>
        </nav>
      </aside>
      <main className="col-span-12 md:col-span-9 lg:col-span-10">
        <Outlet />
      </main>
    </div>
  );
}
