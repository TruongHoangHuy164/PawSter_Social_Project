import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

export default function AdminLayout(){
  return (
    <div className="grid grid-cols-12 gap-4">
      <aside className="col-span-12 md:col-span-3 lg:col-span-2 card p-4">
        <h2 className="font-bold mb-3 text-xl text-black">Admin</h2>
        <nav className="space-y-1">
          <NavLink to="/admin" end className={({isActive})=>`block px-2 py-1 rounded ${isActive?`bg-[color:var(--panel-border)] text-[color:var(--accent)] font-semibold`:'text-muted'}`}>Tổng quan</NavLink>
          <NavLink to="/admin/users" className={({isActive})=>`block px-2 py-1 rounded ${isActive?`bg-[color:var(--panel-border)] text-[color:var(--accent)] font-semibold`:'text-muted'}`}>Người dùng</NavLink>
          <NavLink to="/admin/threads" className={({isActive})=>`block px-2 py-1 rounded ${isActive?`bg-[color:var(--panel-border)] text-[color:var(--accent)] font-semibold`:'text-muted'}`}>Bài viết</NavLink>
          <NavLink to="/admin/payments" className={({isActive})=>`block px-2 py-1 rounded ${isActive?`bg-[color:var(--panel-border)] text-[color:var(--accent)] font-semibold`:'text-muted'}`}>Thanh toán</NavLink>
        </nav>
      </aside>
      <main className="col-span-12 md:col-span-9 lg:col-span-10">
        <div className="page-panel p-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
