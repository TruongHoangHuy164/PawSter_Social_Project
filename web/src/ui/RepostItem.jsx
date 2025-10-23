"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ProBadge from "./ProBadge.jsx";
import AvatarWithPlus from "./AvatarWithPlus.jsx";
import CommentSection from "./CommentSection.jsx";
import CommentInput from "./CommentInput.jsx";
import ThreadItem from "./ThreadItem.jsx";
import { api, threadApi, userApi } from "../utils/api.js";
import { useAuth } from "../state/auth.jsx";

export default function RepostItem({ repost, onDelete }) {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const mine = user && repost.author && repost.author._id === user._id;
  
  // Check if this is backend repost (has repostedBy) or localStorage repost
  const isBackendRepost = !!repost.repostedBy;
  
  // Check if current user is the one who made this repost
  const isMyRepost = isBackendRepost 
    ? user?._id === repost.repostedBy?._id 
    : true; // localStorage reposts are always by current user
  const repostId = isBackendRepost 
    ? `repost_${repost.repostedBy?._id}_${repost._id}` 
    : `repost_${user._id}_${repost._id}`;
    
  console.log('RepostItem IDs:', { 
    originalThreadId: repost._id, 
    repostId: repostId,
    isBackendRepost,
    repostedBy: isBackendRepost ? repost.repostedBy?.username : 'localStorage',
    currentUser: user?.username,
    isMyRepost: isMyRepost
  });
  
  // Repost-specific states (separate from original post)
  const [commentCount, setCommentCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [reposted, setReposted] = useState(false);
  const [repostsCount, setRepostsCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [repostTimestamp, setRepostTimestamp] = useState(null);

  // Initialize repost-specific interactions
  useEffect(() => {
    if (!user) return;
    
    // Always use localStorage for repost interactions (independent from original post)
    const repostData = JSON.parse(localStorage.getItem(`repost_${repostId}`) || '{}');
    
    if (isBackendRepost) {
      // For backend reposts, initialize from localStorage or set defaults
      setLiked(repostData.liked || false);
      setLikesCount(repostData.likesCount || 0);
      setReposted(repostData.reposted || false);
      setRepostsCount(repostData.repostsCount || 0);
      setCommentCount(repostData.commentCount || 0);
      setRepostTimestamp(repost.repostedAt);
      
      // Initialize localStorage data if not exists
      if (!repostData.initialized) {
        const initialData = {
          liked: false,
          likesCount: 0,
          reposted: false,
          repostsCount: 0,
          commentCount: 0,
          repostTimestamp: repost.repostedAt,
          initialized: true
        };
        localStorage.setItem(`repost_${repostId}`, JSON.stringify(initialData));
      }
    } else {
      // For localStorage reposts, use same localStorage data
      setLiked(repostData.liked || false);
      setLikesCount(repostData.likesCount || 0);
      setReposted(repostData.reposted || false);
      setRepostsCount(repostData.repostsCount || 0);
      setCommentCount(repostData.commentCount || 0);
      
      // Initialize repost timestamp - if not exists, set to now (first time seeing this repost)
      const timestamp = repostData.repostTimestamp || repost.repostedAt || new Date().toISOString();
      setRepostTimestamp(timestamp);
      
      // Save timestamp if it's new  
      if (!repostData.repostTimestamp && !repost.repostedAt) {
        const currentData = JSON.parse(localStorage.getItem(`repost_${repostId}`) || '{}');
        const newData = { ...currentData, repostTimestamp: timestamp };
        localStorage.setItem(`repost_${repostId}`, JSON.stringify(newData));
      }
    }
    
    // Check if following the reposter
    if (user && repost.author && user.following) {
      const following = user.following.includes(repost.author._id);
      setIsFollowing(following);
    }
  }, [repost, user, repostId]);

  // Save repost interactions to localStorage
  const saveRepostData = useCallback((data) => {
    const currentData = JSON.parse(localStorage.getItem(`repost_${repostId}`) || '{}');
    const newData = { ...currentData, ...data };
    localStorage.setItem(`repost_${repostId}`, JSON.stringify(newData));
  }, [repostId]);



  const handleAvatarClick = useCallback(
    (e) => {
      e.stopPropagation();
      // Navigate to the profile of whoever made this repost
      const reposterId = isBackendRepost ? repost.repostedBy?._id : user?._id;
      
      if (reposterId) {
        // If clicking on own avatar/name, go to own profile, otherwise go to user profile
        const isMyRepost = reposterId === user?._id;
        console.log('RepostItem avatar click:', {
          reposterId: reposterId,
          currentUserId: user?._id,
          isMyRepost: isMyRepost,
          navigateTo: isMyRepost ? '/profile' : `/profile/${reposterId}`
        });
        
        if (isMyRepost) {
          navigate('/profile');
        } else {
          navigate(`/profile/${reposterId}`);
        }
      }
    },
    [isBackendRepost, repost.repostedBy, user, navigate]
  );

  const handleToggleLike = useCallback(async () => {
    try {
      // Always use localStorage for repost likes (independent from original post)
      const newLiked = !liked;
      const newLikesCount = newLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
      
      setLiked(newLiked);
      setLikesCount(newLikesCount);
      
      // Save to localStorage
      saveRepostData({ liked: newLiked, likesCount: newLikesCount });
    } catch (err) {
      console.error("Toggle like failed:", err);
    }
  }, [liked, likesCount, saveRepostData]);

  const handleRepost = useCallback(async () => {
    try {
      // When reposting a repost, we repost the original thread
      const originalThreadId = repost._id;
      
      if (!reposted) {
        // Repost the original thread via API
        if (isBackendRepost) {
          await threadApi.repostThread(originalThreadId, null, token);
        } else {
          await threadApi.repostThread(originalThreadId, null, token);
        }
        
        // Update local repost count 
        const newRepostsCount = repostsCount + 1;
        setReposted(true);
        setRepostsCount(newRepostsCount);
        
        // Save to localStorage
        saveRepostData({ reposted: true, repostsCount: newRepostsCount });
      } else {
        // Un-repost: only update local state (can't unrepost from repost view)
        const newRepostsCount = Math.max(0, repostsCount - 1);
        setReposted(false);
        setRepostsCount(newRepostsCount);
        
        // Save to localStorage
        saveRepostData({ reposted: false, repostsCount: newRepostsCount });
      }
    } catch (err) {
      console.error("Toggle repost failed:", err);
    }
  }, [reposted, repostsCount, saveRepostData, isBackendRepost, repost._id, token]);

  const handleFollowToggle = useCallback(
    async (e) => {
      e.stopPropagation();
      if (!repost.author || mine) return;

      try {
        if (isFollowing) {
          await userApi.unfollowUser(repost.author._id, token);
          setIsFollowing(false);
        } else {
          await userApi.followUser(repost.author._id, token);
          setIsFollowing(true);
        }
      } catch (err) {
        console.error("Toggle follow failed:", err);
      }
    },
    [isFollowing, repost.author, mine, token]
  );

  const handleToggleComments = useCallback(() => {
    setShowComments((prev) => !prev);
  }, []);

  const handleAddComment = useCallback(() => {
    // This will be called when CommentInput successfully creates a comment
    // We can create a simple comment for now, or integrate with real backend later
    const newCount = commentCount + 1;
    setCommentCount(newCount);
    
    // Save to localStorage
    saveRepostData({ 
      commentCount: newCount 
    });
  }, [commentCount, saveRepostData]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm("Bạn có chắc muốn xóa repost này?")) return;
    try {
      if (isBackendRepost) {
        // For backend reposts, call unrepost API on original thread
        await threadApi.unrepostThread(repost._id, token);
        console.log('Backend repost deleted successfully');
      } else {
        // For localStorage reposts, just remove from localStorage
        localStorage.removeItem(`repost_${repostId}`);
        console.log('localStorage repost deleted successfully');
      }
      
      // Clear local repost data
      localStorage.removeItem(`repost_${repostId}`);
      localStorage.removeItem(`comments_${repostId}`);
      
      // Pass the appropriate ID for feed removal
      const deleteId = isBackendRepost ? repost.repostId || repost._id : repostId;
      console.log('RepostItem: Calling onDelete with ID:', deleteId);
      onDelete?.(deleteId);
    } catch (err) {
      console.error("Delete repost failed:", err);
    }
  }, [repost._id, repost.repostId, repostId, isBackendRepost, token, onDelete]);

  return (
    <div className="card p-5 space-y-4 rounded-2xl bg-white/50 dark:bg-black/50 border-2 border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 transition-all duration-200">
      {/* Repost Header - Người đăng lại */}
      <div className="flex items-start gap-3">
        <div onClick={handleAvatarClick} className="cursor-pointer">
          <AvatarWithPlus
            userId={isBackendRepost ? repost.repostedBy?._id : user?._id}
            avatarUrl={isBackendRepost ? repost.repostedBy?.avatarUrl : user?.avatarUrl}
            size={40}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span 
              onClick={handleAvatarClick}
              className="font-bold cursor-pointer hover:underline"
            >
              {isBackendRepost ? repost.repostedBy?.username : user?.username}
            </span>
            {(isBackendRepost ? repost.repostedBy?.isPro : user?.isPro) && <ProBadge />}
            
            {/* Follow Button không cần thiết cho repost trong profile của chính mình */}
            
            <span className="text-xs text-gray-500 font-bold">•</span>
            <span className="text-xs text-gray-500 font-semibold">
              {repostTimestamp ? new Date(repostTimestamp).toLocaleString("vi-VN") : new Date().toLocaleString("vi-VN")}
            </span>
            
            {/* Delete button for reposts - Only show if this is current user's repost */}
            {isMyRepost && (
              <button
                onClick={handleDelete}
                className="ml-auto text-xs px-3 py-1 rounded-md transition-colors duration-150 text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30"
              >
                Xóa repost
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-neutral-600 dark:text-neutral-400"
            >
              <polyline points="17 1 21 5 17 9"></polyline>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
              <polyline points="7 23 3 19 7 15"></polyline>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
            </svg>
            <span className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">
              đã đăng lại
            </span>
          </div>
          
          {/* Repost Comment from Backend */}
          {isBackendRepost && repost.repostComment && (
            <div className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
              {repost.repostComment}
            </div>
          )}
        </div>
      </div>

      {/* Original Post Container */}
      <div className="ml-13 border-2 border-black/10 dark:border-white/10 rounded-xl overflow-hidden">
        <ThreadItem thread={repost} />
      </div>

      {/* Repost Actions - Actions cho chính repost này */}
      <div className="flex items-center gap-6 pt-2">
        {/* Like */}
        <button
          type="button"
          onClick={handleToggleLike}
          className="flex items-center gap-2 text-sm transition-transform duration-150 hover:scale-[1.02]"
          aria-label={liked ? "Bỏ thích" : "Thích"}
        >
          <span
            className={`h-8 w-8 rounded-full flex items-center justify-center shadow-sm border ${
              liked
                ? "bg-black text-white dark:bg-white dark:text-black border-transparent"
                : "bg-transparent text-neutral-500 border-black/15 dark:border-white/15"
            }`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill={liked ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </span>
          <span className="text-xs text-neutral-600 dark:text-neutral-300">
            {likesCount}
          </span>
        </button>

        {/* Comment */}
        <button
          type="button"
          onClick={handleToggleComments}
          className="flex items-center gap-2 text-sm transition-transform duration-150 hover:scale-[1.02]"
          aria-expanded={showComments}
          aria-controls={`comments-${repostId}`}
        >
          <span
            className={`h-8 w-8 rounded-full flex items-center justify-center shadow-sm border ${
              showComments
                ? "bg-black text-white dark:bg-white dark:text-black border-transparent"
                : "bg-transparent text-neutral-500 border-black/15 dark:border-white/15"
            }`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              <path d="M13 8H7"></path>
              <path d="M17 12H7"></path>
            </svg>
          </span>
          <span className="text-xs text-neutral-600 dark:text-neutral-300">
            {commentCount}
          </span>
        </button>

        {/* Repost */}
        <button
          type="button"
          onClick={handleRepost}
          className="flex items-center gap-2 text-sm transition-transform duration-150 hover:scale-[1.02]"
          aria-label={reposted ? "Hủy đăng lại" : "Đăng lại"}
        >
          <span
            className={`h-8 w-8 rounded-full flex items-center justify-center shadow-sm border ${
              reposted
                ? "bg-black text-white dark:bg-white dark:text-black border-transparent"
                : "bg-transparent text-neutral-500 border-black/15 dark:border-white/15"
            }`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="17 1 21 5 17 9"></polyline>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
              <polyline points="7 23 3 19 7 15"></polyline>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
            </svg>
          </span>
          <span className="text-xs text-neutral-600 dark:text-neutral-300">
            {repostsCount}
          </span>
        </button>
      </div>

      {/* Comment composer + list (toggled) */}
      {showComments && (
        <div
          id={`comments-${repostId}`}
          className="pt-4 border-t border-black/10 dark:border-white/10 space-y-4"
        >
          {/* Comment input */}
          <CommentInput 
            threadId={repostId} 
            onCommentCreated={handleAddComment}
          />
          
          {/* Comments section */}
          <CommentSection
            threadId={repostId}
            onCommentCountChange={setCommentCount}
          />
        </div>
      )}
    </div>
  );
}