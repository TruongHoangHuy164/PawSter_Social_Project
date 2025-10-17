import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { HomeIcon as HomeOutline, ChatBubbleOvalLeftIcon as ChatOutline, PlusCircleIcon, HeartIcon as HeartOutline, UserCircleIcon } from '@heroicons/react/24/outline';
import { HomeIcon as HomeSolid, HeartIcon as HeartSolid, ChatBubbleOvalLeftIcon as ChatSolid } from '@heroicons/react/24/solid';

const iconClasses = 'w-5 h-5';

const HomeIcon = ({ active }) => active ? <HomeSolid className={iconClasses} /> : <HomeOutline className={iconClasses} />;
const MessageIcon = ({ active }) => active ? <ChatSolid className={iconClasses} /> : <ChatOutline className={iconClasses} />;
const AddIcon = () => <PlusCircleIcon className="w-6 h-6" />;
const HeartIcon = ({ active }) => active ? <HeartSolid className={iconClasses} /> : <HeartOutline className={iconClasses} />;
const UserIcon = () => <UserCircleIcon className={iconClasses} />;

const Item = ({ to, label, Icon }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${isActive ? 'text-violet-500 bg-[color:var(--panel)]' : 'text-muted hover:bg-black/5 dark:hover:bg-white/5'}`}
  >
    {({ isActive }) => <>
      <Icon active={isActive} />
      <span>{label}</span>
    </>}
  </NavLink>
);

export default function LeftSidebar({ onAdd }) {
  const navigate = useNavigate();
  const openComposer = () => {
    if (onAdd) return onAdd();
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
    <div className="sticky top-20 space-y-3">
      <nav className="flex flex-col gap-1">
        <Item to="/" label="Home" Icon={HomeIcon} />
        <Item to="/messages" label="Tin nhắn" Icon={MessageIcon} />
        <button
          onClick={openComposer}
          className="mt-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white bg-gradient-to-br from-[color:var(--accent)] to-violet-500 shadow hover:shadow-md transition"
          aria-label="Thêm bài viết"
        >
          <AddIcon />
          <span>Tạo bài viết</span>
        </button>
        <Item to="/favorites" label="Yêu thích" Icon={HeartIcon} />
        <Item to="/profile" label="Tôi" Icon={UserIcon} />
      </nav>
    </div>
  );
}
