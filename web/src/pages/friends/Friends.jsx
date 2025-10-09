import React, { useEffect, useState } from 'react';
import { api } from '../../utils/api.js';
import { useAuth } from '../../state/auth.jsx';

export default function Friends(){
  const { user, token } = useAuth();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    if (!user) return;
    (async ()=>{
      try {
        const res = await api.get(`/users/${user._id}/friends`, token);
        setFriends(res.data.data);
      } catch(e){ console.error(e);} finally { setLoading(false);} 
    })();
  }, [user, token]);

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Bạn bè</h1>
        <div className="text-sm text-neutral-400">{friends.length}/{user?.isPro?200:20}</div>
      </div>
      {loading && <div className="text-sm text-neutral-500">Đang tải...</div>}
      {!loading && friends.length===0 && <div className="text-sm text-neutral-500">Chưa có bạn bè.</div>}
      <ul className="space-y-3">
        {friends.map(f=> <li key={f._id} className="p-3 card rounded flex items-center justify-between transition-pop"> <span className="font-medium">{f.username}</span><span className="text-xs text-neutral-400">{f.isPro? 'PRO' : ''}</span></li>)}
      </ul>
    </div>
  );
}
