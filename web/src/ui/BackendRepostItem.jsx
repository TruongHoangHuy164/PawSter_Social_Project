import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ProBadge from "./ProBadge.jsx";
import AvatarWithPlus from "./AvatarWithPlus.jsx";
import { api, threadApi } from "../utils/api.js";
import { useAuth } from "../state/auth.jsx";

function BackendRepostItem({ thread, onLike, onUnlike }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showComments, setShowComments] = useState(false);

  // Initialize like state
  useEffect(() => {
    if (thread) {
      setLiked(thread.likes?.includes(user?._id) || false);
      setLikesCount(thread.likesCount || 0);
    }
  }, [thread, user]);

  const handleLike = async () => {
    if (!user) return;
    
    try {
      if (liked) {
        await threadApi.unlikeThread(thread._id);
        setLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
        onUnlike?.(thread._id);
      } else {
        await threadApi.likeThread(thread._id);
        setLiked(true);
        setLikesCount(prev => prev + 1);
        onLike?.(thread._id);
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
    }
  };

  const handleToggleComments = () => {
    setShowComments(!showComments);
  };

  const formatTimestamp = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "vừa xong";
    if (minutes < 60) return `${minutes} phút`;
    if (hours < 24) return `${hours} giờ`;
    return `${days} ngày`;
  };

  if (!thread) return null;

  return (
    <div className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl p-4 shadow-sm">
      {/* Repost Header */}
      <div className="flex items-center gap-2 mb-3 text-sm text-neutral-600 dark:text-neutral-400">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="17,1 21,5 17,9"></polyline>
          <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
          <polyline points="7,23 3,19 7,15"></polyline>
          <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
        </svg>
        <span>
          <strong className="text-neutral-900 dark:text-neutral-100">
            {thread.repostedBy?.username}
          </strong>{" "}
          đã đăng lại • {formatTimestamp(thread.repostedAt)}
        </span>
      </div>

      {/* Repost Comment (if any) */}
      {thread.repostComment && (
        <div className="mb-3 p-3 bg-black/5 dark:bg-white/5 rounded-xl">
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            {thread.repostComment}
          </p>
        </div>
      )}

      {/* Original Thread Content */}
      <div className="border border-black/10 dark:border-white/10 rounded-xl p-4">
        {/* Original Author */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <AvatarWithPlus
              src={thread.author?.avatarUrl}
              username={thread.author?.username}
              isPro={thread.author?.isPro}
              size="sm"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                onClick={() => navigate(`/profile/${thread.author?.username}`)}
                className="font-bold text-sm text-neutral-900 dark:text-neutral-100 hover:underline cursor-pointer truncate"
              >
                {thread.author?.username || "Unknown"}
              </span>
              {thread.author?.isPro && <ProBadge />}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              {formatTimestamp(thread.createdAt)}
            </div>
          </div>
        </div>

        {/* Original Content */}
        <div className="space-y-3">
          {thread.content && (
            <p className="text-sm whitespace-pre-wrap break-words text-neutral-900 dark:text-neutral-100">
              {thread.content}
            </p>
          )}

          {/* Original Media */}
          {thread.media && thread.media.length > 0 && (
            <div
              className="grid gap-2 rounded-xl overflow-hidden"
              style={{
                gridTemplateColumns:
                  thread.media.length === 1 ? "1fr" : "repeat(2, 1fr)",
              }}
            >
              {thread.media.map((media, idx) => (
                <div
                  key={idx}
                  className="rounded-xl overflow-hidden border border-black/10 dark:border-white/10"
                >
                  {media.type === "image" && (
                    <img
                      src={`${import.meta.env.VITE_API_URL}/media/${media.key}`}
                      alt="Thread media"
                      className="w-full h-auto object-cover"
                    />
                  )}
                  {media.type === "video" && (
                    <video
                      src={`${import.meta.env.VITE_API_URL}/media/${media.key}`}
                      controls
                      className="w-full h-auto"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interaction Buttons */}
        <div className="flex items-center gap-4 mt-4">
          {/* Like */}
          <button
            type="button"
            onClick={handleLike}
            className="flex items-center gap-2 text-sm transition-transform duration-150 hover:scale-[1.02]"
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
              {thread.commentsCount || 0}
            </span>
          </button>
        </div>
      </div>

      {/* Comments Section - You can expand this later */}
      {showComments && (
        <div className="mt-4 p-4 bg-black/5 dark:bg-white/5 rounded-xl">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Comment system will be integrated here...
          </p>
        </div>
      )}
    </div>
  );
}

export default BackendRepostItem;