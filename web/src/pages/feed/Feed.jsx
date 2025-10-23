import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../utils/api.js';
import { useAuth } from '../../state/auth.jsx';
import ThreadComposer from '../../ui/ThreadComposer.jsx';
import ThreadItem from '../../ui/ThreadItem.jsx';
import RepostItem from '../../ui/RepostItem.jsx';

export default function Feed(){
  const { token } = useAuth();
  const location = useLocation();
  const [feedItems, setFeedItems] = useState([]); // Changed from threads to feedItems
  const [loading, setLoading] = useState(true);
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const highlightThreadId = params.get('threadId');

  const load = useCallback(async ()=>{
    setLoading(true);
    try {
      const res = await api.get('/threads', token);
      // The backend now returns both threads and reposts mixed together
      console.log('Feed API Response:', res.data.data);
      console.log('Total items:', res.data.data.length);
      console.log('Reposts:', res.data.data.filter(item => item.isRepost).length);
      console.log('Regular threads:', res.data.data.filter(item => !item.isRepost).length);
      setFeedItems(res.data.data);
    } catch(e){ console.error(e);} finally { setLoading(false);} 
  }, [token]);

  useEffect(()=>{ load(); }, [load]);

  return (
    <div className="w-full mx-auto p-4 space-y-6 paw-bg">
      <div className="lux-card p-5 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-extrabold tracking-tight text-black dark:text-white">Bảng tin</h2>
          <span className="pill text-xs flex items-center gap-2 text-[color:var(--muted)]">
            <span className="paw-icon" /> Pawster Today
          </span>
        </div>
        <ThreadComposer onCreated={(t)=>setFeedItems(items=>[{...t, isRepost: false}, ...items])} />
      </div>
      {loading && <div className="text-center text-sm text-neutral-500">Đang tải...</div>}
      {!loading && feedItems.length===0 && (
        <div className="lux-card rounded-xl p-6 text-center text-sm text-neutral-500">
          <div className="mb-2 text-base font-semibold text-black dark:text-white">Chưa có bài viết</div>
          Hãy là người đầu tiên chia sẻ khoảnh khắc cùng thú cưng của bạn.
        </div>
      )}
      <div className="space-y-4">
        {feedItems.map(item=> (
          <div key={item.isRepost ? `repost-${item.repostId || item._id}` : item._id} className="fade-in">
            {item.isRepost ? (
              <RepostItem 
                repost={item} 
                onDelete={(repostId) => {
                  console.log('Feed: Deleting repost with ID:', repostId);
                  console.log('Current feed items before deletion:', feedItems.length);
                  // Remove repost from feed
                  setFeedItems(items => {
                    const newItems = items.filter(i => {
                      if (!i.isRepost) return true;
                      
                      // For backend reposts, check against the actual MongoDB repost ID
                      if (i.repostId && repostId.includes(i.repostId)) {
                        console.log('Removing backend repost:', i.repostId);
                        return false;
                      }
                      
                      // For localStorage reposts or direct ID matches
                      const itemRepostId = `repost_${i.repostedBy?._id}_${i._id}`;
                      if (itemRepostId === repostId) {
                        console.log('Removing localStorage repost:', itemRepostId);
                        return false;
                      }
                      
                      return true;
                    });
                    console.log('Feed items after deletion:', newItems.length);
                    return newItems;
                  });
                }}
              />
            ) : (
              <ThreadItem 
                thread={item} 
                onDelete={(id)=>setFeedItems(items=>items.filter(x=>x._id!==id))}
                openComments={highlightThreadId === item._id}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
