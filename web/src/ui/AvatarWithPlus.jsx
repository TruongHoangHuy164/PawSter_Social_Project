import React from 'react';
import { useNavigate } from 'react-router-dom';
import { dmApi } from '../utils/api.js';
import { useAuth } from '../state/auth.jsx';

export default function AvatarWithPlus({ userId, avatarUrl, size=40, onAfterCreate }){
  const navigate = useNavigate();
  const { token } = useAuth();

  const startChat = async (e)=>{
    e.stopPropagation();
    if (!userId) return;
    try{
      const res = await dmApi.getOrCreate(userId, token);
      onAfterCreate?.(res.data.data);
      navigate('/messages');
    }catch(err){ console.error(err); }
  };

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <img src={avatarUrl || '/avatar.png'} alt="avatar" className="w-full h-full rounded-full object-cover" />
      <button
        onClick={startChat}
        title="Nhắn tin"
        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold text-black bg-white border"
        style={{ borderColor:'var(--panel-border)' }}
        aria-label="Nhắn tin"
      >
        +
      </button>
    </div>
  );
}
