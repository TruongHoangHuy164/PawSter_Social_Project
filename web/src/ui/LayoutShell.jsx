import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../state/auth.jsx';
import BottomBar from './BottomBar.jsx';
import LeftSidebar from './LeftSidebar.jsx';
import RightSidebar from './RightSidebar.jsx';
import FloatingChatButton from './FloatingChatButton.jsx';
import UpgradeBanner from './UpgradeBanner.jsx';



export default function LayoutShell(){
  const { user } = useAuth();
  const location = useLocation();
  // Start in light theme by default to avoid previously saved dark state
  const [theme, setTheme] = useState('light');
  
  // Check if current page is home
  const isHomePage = location.pathname === '/';

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
      {/* Upgrade Banner */}
      {!user?.isAdmin && <UpgradeBanner />}
      
      <main className="flex-1 pt-4">
        <div className="w-full flex gap-6 px-4 md:px-6 md:pl-0 max-w-screen-2xl mx-auto">
          {/* Left Sidebar (desktop only) */}
          {!user?.isAdmin && (
            <div className="hidden md:block w-64 flex-shrink-0">
              <LeftSidebar theme={theme} setTheme={setTheme} />
            </div>
          )}
          
          {/* Content */}
          <section className="flex-1 min-w-0 flex justify-center">
            {!user?.isAdmin ? (
              <div className={`w-full ${isHomePage ? 'max-w-2xl' : 'max-w-3xl'}`}>
                <Outlet />
              </div>
            ) : (
              <Outlet />
            )}
          </section>
          
          {/* Right Sidebar (only on home page, desktop only) */}
          {!user?.isAdmin && isHomePage && (
            <div className="hidden lg:block w-80 flex-shrink-0">
              <RightSidebar />
            </div>
          )}
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
