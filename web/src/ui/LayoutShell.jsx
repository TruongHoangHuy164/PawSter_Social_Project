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
      {/* Upgrade Banner - Full width at top */}
      {!user?.isAdmin && <UpgradeBanner />}
      
      {/* Left Sidebar (desktop only) - Fixed position below banner */}
      {!user?.isAdmin && <LeftSidebar theme={theme} setTheme={setTheme} />}
      
      <main className={`flex-1 pt-4 ${!user?.isAdmin ? 'md:ml-64' : ''}`}>
        <div className="w-full flex gap-6 px-4 md:px-6 max-w-screen-2xl mx-auto">
          {/* Left sidebar space is handled by margin-left on desktop, banner is full-width */}
          
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
