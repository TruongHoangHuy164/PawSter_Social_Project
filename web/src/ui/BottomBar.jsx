import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { HomeIcon as HomeOutline, MagnifyingGlassIcon, PlusCircleIcon, HeartIcon as HeartOutline, UserCircleIcon } from '@heroicons/react/24/outline';
import { HomeIcon as HomeSolid, HeartIcon as HeartSolid } from '@heroicons/react/24/solid';

/*
  BottomBar navigation (mobile-first)
  Icons are inline SVG to avoid extra deps. Active route is highlighted.
  Center Add button can trigger navigation to a compose route (future) or open a modal.
*/

const iconClasses = 'w-6 h-6';

const HomeIcon = ({ active }) => active ? <HomeSolid className={iconClasses} /> : <HomeOutline className={iconClasses} />;
const SearchIcon = () => <MagnifyingGlassIcon className={iconClasses} />;
const AddIcon = () => <PlusCircleIcon className={iconClasses} />;
const HeartIcon = ({ active }) => active ? <HeartSolid className={iconClasses} /> : <HeartOutline className={iconClasses} />;
const UserIcon = () => <UserCircleIcon className={iconClasses} />;

const Item = ({ to, label, Icon }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `flex flex-col items-center gap-0.5 flex-1 py-2 text-xs ${isActive ? 'text-violet-400' : 'text-neutral-400 hover:text-neutral-200'}`}
  >
    {({ isActive }) => <>
      <Icon active={isActive} />
      <span>{label}</span>
    </>}
  </NavLink>
);

export default function BottomBar({ onAdd }) {
  const location = useLocation();
  const navigate = useNavigate();
  const openComposer = () => {
    if (onAdd) return onAdd();
    // fallback: scroll to top or future modal
    const el = document.getElementById('thread-composer');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2','ring-violet-500');
      setTimeout(()=>el.classList.remove('ring-2','ring-violet-500'), 1600);
    } else {
      navigate('/');
    }
  };
  return (
    <div className="fixed bottom-0 inset-x-0 z-30 bg-neutral-900/90 backdrop-blur border-t border-neutral-800">
      <div className="max-w-4xl mx-auto flex items-stretch justify-around px-2 md:px-6">
        <Item to="/" label="Home" Icon={HomeIcon} />
        <Item to="/search" label="Tìm" Icon={SearchIcon} />
        <button
          onClick={openComposer}
          className="relative -mt-5 md:mt-0 md:mb-2 bg-violet-600 hover:bg-violet-500 text-white w-14 h-14 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-lg shadow-violet-900/40 border border-violet-400/30 active:scale-95 transition"
          aria-label="Thêm bài viết"
        >
          <AddIcon />
        </button>
        <Item to="/favorites" label="Yêu thích" Icon={HeartIcon} />
        <Item to="/profile" label="Tôi" Icon={UserIcon} />
      </div>
    </div>
  );
}
