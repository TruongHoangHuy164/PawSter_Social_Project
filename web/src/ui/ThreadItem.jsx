"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ProBadge from "./ProBadge.jsx";
import AvatarWithPlus from "./AvatarWithPlus.jsx";
import CommentSection from "./CommentSection.jsx";
import CommentInput from "./CommentInput.jsx";
import { api, threadApi, userApi } from "../utils/api.js";
import { useAuth } from "../state/auth.jsx";
import { renderContentWithHashtags } from "../utils/hashtag.jsx";

export default function ThreadItem({ thread, onDelete, openComments = false }) {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const mine = user && thread.author && thread.author._id === user._id;
  const [signed, setSigned] = useState({});
  const [loadingIdx, setLoadingIdx] = useState({});
  const [errorIdx, setErrorIdx] = useState({});
  const mediaRefs = useRef({});
  const scrollRef = useRef(null);
  const commentsRef = useRef(null);
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [reposted, setReposted] = useState(false);
  const [repostsCount, setRepostsCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const isFlagged = thread?.status === "FLAGGED";
  const [sensitiveRevealed, setSensitiveRevealed] = useState(false);
  const blurred = isFlagged && !sensitiveRevealed;
  // helper: check if an image tile should be blurred (per-media moderation)
  const isMediaSensitive = useCallback((media) => {
    const dec = media?.moderation?.decision;
    return dec === "FLAG" || dec === "REJECT";
  }, []);

  // Initialize likes and reposts from thread data
  useEffect(() => {
    if (thread.likes && user) {
      setLiked(thread.likes.includes(user._id));
      setLikesCount(thread.likes.length);
    }
    if (thread.reposts && user) {
      setReposted(thread.reposts.includes(user._id));
      setRepostsCount(thread.reposts.length);
    }
    // Check if already following
    if (user && user.following && thread.author) {
      setIsFollowing(user.following.includes(thread.author._id));
    }
  }, [thread.likes, thread.reposts, user, thread.author]);

  // Lightbox states
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImgIdx, setLightboxImgIdx] = useState(0);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const swipeStartX = useRef(0);
  const swipeActive = useRef(false);

  const fetchSigned = useCallback(
    async (i) => {
      if (signed[i] || loadingIdx[i]) return;
      setLoadingIdx((s) => ({ ...s, [i]: true }));
      try {
        const res = await api.get(`/media/thread/${thread._id}/${i}`, token);
        const url = res.data.data.url;
        setSigned((s) => ({ ...s, [i]: url }));
      } catch (e) {
        console.error("Fetch signed failed", e);
        setErrorIdx((s) => ({ ...s, [i]: true }));
      } finally {
        setLoadingIdx((s) => ({ ...s, [i]: false }));
      }
    },
    [signed, loadingIdx, thread._id, token]
  );

  // Preload images immediately
  useEffect(() => {
    if (thread.media?.length) {
      thread.media.forEach((m, i) => {
        if (m.type === "image") fetchSigned(i);
      });
    }
  }, [thread.media, fetchSigned]);

  // Auto-load video & audio when they enter viewport
  useEffect(() => {
    if (!thread.media || !thread.media.length) return;
    if (
      typeof window === "undefined" ||
      typeof IntersectionObserver === "undefined"
    ) {
      thread.media.forEach((m, i) => {
        if (
          (m.type === "video" || m.type === "audio") &&
          !signed[i] &&
          !loadingIdx[i] &&
          !errorIdx[i]
        ) {
          fetchSigned(i);
        }
      });
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idxAttr = entry.target.getAttribute("data-media-index");
            if (idxAttr != null) {
              const idx = Number(idxAttr);
              if (!signed[idx] && !loadingIdx[idx] && !errorIdx[idx]) {
                fetchSigned(idx);
              }
              observer.unobserve(entry.target);
            }
          }
        });
      },
      { root: null, rootMargin: "150px", threshold: 0.1 }
    );

    thread.media.forEach((m, i) => {
      if ((m.type === "video" || m.type === "audio") && !signed[i]) {
        const el = mediaRefs.current[i];
        if (el) observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, [thread.media, signed, loadingIdx, errorIdx, fetchSigned]);

  const del = async () => {
    if (!confirm("Xóa bài này?")) return;
    try {
      await api.del(`/threads/${thread._id}`, token);
      onDelete?.(thread._id);
    } catch (e) {
      console.error(e);
    }
  };

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setScrollPosition(scrollLeft);
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState);
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [updateScrollState, thread.media]);

  const onPointerDown = useCallback((e) => {
    const el = scrollRef.current;
    if (!el) return;
    isDownRef.current = true;
    startXRef.current = e.clientX;
    scrollLeftRef.current = el.scrollLeft;
    setDragging(false);
    try {
      el.setPointerCapture?.(e.pointerId);
    } catch {}
  }, []);

  const onPointerMove = useCallback(
    (e) => {
      const el = scrollRef.current;
      if (!el || !isDownRef.current) return;
      const dx = e.clientX - startXRef.current;
      if (!dragging && Math.abs(dx) > 5) setDragging(true);
      if (Math.abs(dx) > 1) {
        el.scrollLeft = scrollLeftRef.current - dx;
        e.preventDefault();
      }
    },
    [dragging]
  );

  const endDrag = useCallback((e) => {
    const el = scrollRef.current;
    isDownRef.current = false;
    setDragging(false);
    try {
      el?.releasePointerCapture?.(e.pointerId);
    } catch {}
  }, []);

  const mediaCount = thread.media?.length || 0;
  const tileW = 180;
  const gap = 12;

  const sortedMedia = useMemo(() => {
    const result = [];
    const imgs = [];
    const vids = [];
    const auds = [];
    (thread.media || []).forEach((m, i) => {
      const entry = { m, i };
      if (m.type === "image") imgs.push(entry);
      else if (m.type === "video") vids.push(entry);
      else if (m.type === "audio") auds.push(entry);
      else result.push(entry);
    });
    return [...imgs, ...vids, ...auds, ...result];
  }, [thread.media]);

  const imageCount = useMemo(
    () => (thread.media || []).filter((m) => m.type === "image").length,
    [thread.media]
  );
  const visibleCountForWidth =
    imageCount > 0 ? Math.min(4, imageCount) : Math.min(4, mediaCount);
  const maxRowWidth =
    visibleCountForWidth > 0
      ? visibleCountForWidth * tileW + (visibleCountForWidth - 1) * gap
      : 0;

  const scrollByPage = useCallback(
    (dir) => {
      const el = scrollRef.current;
      if (!el) return;
      const delta = (tileW + gap) * Math.max(1, visibleCountForWidth);
      el.scrollBy({ left: dir * delta, behavior: "smooth" });
    },
    [visibleCountForWidth]
  );

  // indices of all media items (preserve original media array indexes)
  const mediaIndices = (thread.media || []).map((m, i) => i);

  const openLightbox = useCallback(
    async (mediaIdxInMedia) => {
      console.log("🖼️ openLightbox called with index:", mediaIdxInMedia);
      console.log("📋 mediaIndices:", mediaIndices);
      const pos = mediaIndices.indexOf(mediaIdxInMedia);
      console.log("📍 Position in mediaIndices:", pos);
      if (pos < 0) {
        console.warn("❌ Position not found in mediaIndices");
        return;
      }
      if (
        !signed[mediaIdxInMedia] &&
        !loadingIdx[mediaIdxInMedia] &&
        !errorIdx[mediaIdxInMedia]
      ) {
        console.log("🔄 Fetching signed URL for index:", mediaIdxInMedia);
        try {
          await fetchSigned(mediaIdxInMedia);
        } catch (e) {
          console.error("❌ Failed to fetch signed URL:", e);
        }
      } else {
        console.log(
          "✅ Signed URL already available:",
          signed[mediaIdxInMedia]
        );
      }
      console.log("🎬 Opening lightbox at position:", pos);
      setLightboxImgIdx(pos);
      setLightboxOpen(true);
      requestAnimationFrame(() => setOverlayVisible(true));
    },
    [mediaIndices, signed, loadingIdx, errorIdx, fetchSigned]
  );

  const closeLightbox = useCallback(() => {
    setOverlayVisible(false);
    setTimeout(() => setLightboxOpen(false), 200);
  }, []);

  const nextImage = useCallback(() => {
    if (mediaIndices.length <= 1) return;
    setLightboxImgIdx((p) => (p + 1) % mediaIndices.length);
  }, [mediaIndices.length]);

  const prevImage = useCallback(() => {
    if (mediaIndices.length <= 1) return;
    setLightboxImgIdx(
      (p) => (p - 1 + mediaIndices.length) % mediaIndices.length
    );
  }, [mediaIndices.length]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
    };
    document.addEventListener("keydown", onKey);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = oldOverflow;
    };
  }, [lightboxOpen, closeLightbox, nextImage, prevImage]);

  const onLightboxPointerDown = useCallback((e) => {
    swipeActive.current = true;
    swipeStartX.current = e.clientX;
  }, []);

  const onLightboxPointerUp = useCallback(
    (e) => {
      if (!swipeActive.current) return;
      const dx = e.clientX - swipeStartX.current;
      swipeActive.current = false;
      const threshold = 50;
      if (dx > threshold) {
        prevImage();
      } else if (dx < -threshold) {
        nextImage();
      }
    },
    [nextImage, prevImage]
  );

  const onLightboxBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) closeLightbox();
    },
    [closeLightbox]
  );

  const totalPages = Math.ceil(mediaCount / visibleCountForWidth);
  const currentPage = Math.floor(
    scrollPosition / ((tileW + gap) * visibleCountForWidth)
  );

  // Load comment count
  useEffect(() => {
    const loadCommentCount = async () => {
      try {
        const response = await api.get(
          `/comments/thread/${thread._id}?limit=1`,
          token
        );
        setCommentCount(response.data.pagination?.total || 0);
      } catch (err) {
        console.error("Load comment count failed", err);
      }
    };
    loadCommentCount();
  }, [thread._id, token]);

  const handleToggleComments = useCallback(() => {
    setShowComments((prev) => {
      const next = !prev;
      if (!prev) {
        // Opening comments: scroll into view for better UX
        setTimeout(() => {
          try {
            commentsRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          } catch {}
        }, 0);
      }
      return next;
    });
  }, []);

  const handleAvatarClick = useCallback(
    (e) => {
      e.stopPropagation();
      if (thread.author?._id) {
        navigate(`/profile/${thread.author._id}`);
      }
    },
    [thread.author, navigate]
  );

  const handleToggleLike = useCallback(async () => {
    try {
      if (liked) {
        await threadApi.unlikeThread(thread._id, token);
        setLiked(false);
        setLikesCount((c) => Math.max(0, c - 1));
      } else {
        await threadApi.likeThread(thread._id, token);
        setLiked(true);
        setLikesCount((c) => c + 1);
      }
    } catch (err) {
      console.error("Toggle like failed:", err);
    }
  }, [liked, thread._id, token]);

  const handleRepost = useCallback(async () => {
    try {
      if (reposted) {
        await threadApi.unrepostThread(thread._id, token);
        setReposted(false);
        setRepostsCount((c) => Math.max(0, c - 1));
      } else {
        await threadApi.repostThread(thread._id, token);
        setReposted(true);
        setRepostsCount((c) => c + 1);
      }
    } catch (err) {
      console.error("Toggle repost failed:", err);
    }
  }, [reposted, thread._id, token]);

  const handleFollowToggle = useCallback(
    async (e) => {
      e.stopPropagation();
      if (!thread.author || mine) return;

      try {
        if (isFollowing) {
          await userApi.unfollowUser(thread.author._id, token);
          setIsFollowing(false);
        } else {
          await userApi.followUser(thread.author._id, token);
          setIsFollowing(true);
        }
      } catch (err) {
        console.error("Toggle follow failed:", err);
      }
    },
    [isFollowing, thread.author, token, mine]
  );

  // Auto open comments when requested (e.g., from notification deep link)
  useEffect(() => {
    if (openComments) {
      setShowComments(true);
      // Scroll the card into view once mounted
      try {
        const el = document.getElementById(`thread-${thread._id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => {
          commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      } catch {}
    }
  }, [openComments, thread._id]);

  return (
    <div id={`thread-${thread._id}`} data-thread-id={thread._id} className="p-5 rounded-2xl space-y-3 border border-black/10 dark:border-white/10 bg-white dark:bg-black pop hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-2">
          <div onClick={handleAvatarClick} className="cursor-pointer">
            <AvatarWithPlus
              userId={thread.author?._id}
              avatarUrl={thread.author?.avatarUrl}
              size={36}
            />
          </div>
          <span
            onClick={handleAvatarClick}
            className="font-semibold text-base cursor-pointer hover:underline text-black dark:text-white"
          >
            {thread.author?.username || "Unknown"}
          </span>
          {thread.author?.isPro && <ProBadge />}

          {/* Follow Button - only show if not own post */}
          {!mine && thread.author && (
            <button
              onClick={handleFollowToggle}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-all duration-200 border ${
                isFollowing
                  ? "text-neutral-600 dark:text-neutral-300 bg-transparent border-black/20 dark:border-white/20"
                  : "text-white bg-black dark:text-black dark:bg-white border-transparent"
              }`}
            >
              {isFollowing ? "Đang theo dõi" : "Theo dõi"}
            </button>
          )}
        </div>
        <span className="text-xs muted pill">
          {new Date(thread.createdAt).toLocaleString("vi-VN")}
        </span>
        {mine && (
          <button
            onClick={del}
            className="ml-auto text-xs px-3 py-1 rounded-md transition-colors duration-150 text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20"
          >
            Xóa
          </button>
        )}
      </div>

      {/* Sensitive content warning (for FLAGGED posts) */}
      {isFlagged && !sensitiveRevealed && (
        <div className="p-3 rounded-xl border border-yellow-500/30 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-200 text-sm flex flex-col gap-2">
          <div className="flex items-center gap-2">
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
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span className="font-medium">Nội dung có thể nhạy cảm</span>
          </div>
          {!!thread?.moderation?.categories?.length && (
            <div className="text-xs opacity-80">
              Phát hiện: {thread.moderation.categories.join(", ")}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSensitiveRevealed(true)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-white bg-black dark:text-black dark:bg-white"
            >
              Tôi muốn xem
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-md text-xs font-medium text-yellow-900/80 dark:text-yellow-200/80 border border-yellow-500/30"
              onClick={(e) => {
                e.stopPropagation();
                // Giữ nguyên trạng thái ẩn; có thể cuộn tiếp
              }}
            >
              Ẩn nội dung
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div
        className={`text-sm leading-relaxed whitespace-pre-wrap text-neutral-800 dark:text-neutral-200 ${
          blurred ? "pointer-events-none select-none blur" : ""
        }`}
      >
        {renderContentWithHashtags(thread.content)}
      </div>

      {/* Media Gallery */}
      {thread.media && thread.media.length > 0 && (
        <div
          className={`space-y-3 pt-2 ${
            blurred ? "pointer-events-none select-none blur" : ""
          }`}
        >
          <div className="relative">
            {mediaCount > visibleCountForWidth && (
              <>
                {canScrollLeft && (
                  <button
                    type="button"
                    className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center rounded-full shadow-md transition-all duration-200 hover:scale-110 bg-black text-white dark:bg-white dark:text-black"
                    onClick={() => scrollByPage(-1)}
                    aria-label="Trượt trái"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>
                )}
                {canScrollRight && (
                  <button
                    type="button"
                    className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center rounded-full shadow-md transition-all duration-200 hover:scale-110 bg-black text-white dark:bg-white dark:text-black"
                    onClick={() => scrollByPage(1)}
                    aria-label="Trượt phải"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                )}
              </>
            )}

            <div
              ref={scrollRef}
              className={`flex gap-3 overflow-x-auto overflow-y-hidden px-1 py-2 snap-x snap-mandatory w-full mx-auto scrollbar-hide ${
                dragging ? "cursor-grabbing select-none" : "cursor-grab"
              }`}
              style={{
                maxWidth: maxRowWidth ? `${maxRowWidth}px` : undefined,
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerLeave={endDrag}
              role="region"
              aria-label="Danh sách media cuộn ngang"
            >
              {sortedMedia.map(({ m, i }) => {
                const url = signed[i];
                const loading = loadingIdx[i];
                const error = errorIdx[i];

                if (m.type === "image") {
                  return (
                    <div
                      key={i}
                      className={`relative group w-[180px] h-[240px] snap-start flex-shrink-0 ${
                        dragging ? "pointer-events-none" : ""
                      }`}
                    >
                      {!url && !error && (
                        <div className="flex items-center justify-center rounded-xl w-full h-full text-xs text-neutral-500 border border-black/10 dark:border-white/10 bg-white dark:bg-black">
                          <div className="flex flex-col items-center gap-2">
                            <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"></div>
                            <span>Đang tải...</span>
                          </div>
                        </div>
                      )}
                      {error && (
                        <div className="rounded-xl text-xs p-3 w-full h-full flex items-center justify-center text-center text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20 border border-red-200/50 dark:border-red-400/20">
                          Lỗi tải ảnh
                        </div>
                      )}
                      {url && (
                        <button
                          type="button"
                          onClick={(e) => {
                            console.log(
                              "🖱️ Image clicked! Index:",
                              i,
                              "Dragging:",
                              dragging
                            );
                            e.stopPropagation();
                            if (!dragging) {
                              openLightbox(i);
                            } else {
                              console.log(
                                "⚠️ Click ignored - currently dragging"
                              );
                            }
                          }}
                          className="block group w-full h-full rounded-xl overflow-hidden transition-transform duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 border border-black/10 dark:border-white/10 shadow-sm"
                          aria-label="Xem ảnh lớn"
                        >
                          <img
                            src={url || "/placeholder.svg"}
                            alt={m.mimeType}
                            draggable={false}
                            className={`object-cover w-full h-full group-hover:opacity-95 transition-opacity duration-200 ${
                              !sensitiveRevealed && isMediaSensitive(m)
                                ? "blur"
                                : ""
                            }`}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 rounded-full p-2">
                              <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                                <line x1="11" y1="8" x2="11" y2="14"></line>
                                <line x1="8" y1="11" x2="14" y2="11"></line>
                              </svg>
                            </div>
                          </div>
                          {/* Per-image moderation badge */}
                          {m?.moderation &&
                            (m?.moderation?.decision === "FLAG" ||
                              m?.moderation?.decision === "REJECT") &&
                            !sensitiveRevealed && (
                              <div className="absolute bottom-2 left-2 right-2 text-[10px] leading-tight p-1.5 rounded-md bg-black/65 text-white shadow">
                                Ảnh nhạy cảm:{" "}
                                {(m.moderation.categories || []).join(", ") ||
                                  m.moderation.decision}
                              </div>
                            )}
                        </button>
                      )}
                    </div>
                  );
                }

                if (m.type === "video") {
                  return (
                    <div
                      key={i}
                      data-media-index={i}
                      ref={(el) => {
                        if (el) mediaRefs.current[i] = el;
                      }}
                      className={`relative group w-[180px] h-[240px] rounded-xl overflow-hidden flex items-center justify-center snap-start flex-shrink-0 ${
                        dragging ? "pointer-events-none" : ""
                      }`}
                      style={{
                        background: "transparent",
                        border: "1px solid rgba(0,0,0,0.1)",
                      }}
                    >
                      {!url && !error && !loading && (
                        <div className="text-xs px-3 py-2 muted text-center">
                          Đang chờ hiển thị...
                        </div>
                      )}
                      {loading && (
                        <div className="flex flex-col items-center gap-2 text-neutral-500 text-xs">
                          <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"></div>
                          <span>Đang tải...</span>
                        </div>
                      )}
                      {error && (
                        <div className="text-xs p-3 text-center text-red-600 dark:text-red-400">
                          Lỗi video
                        </div>
                      )}
                      {url && (
                        <div className="w-full h-full relative">
                          <video
                            src={url}
                            controls
                            className="w-full h-full object-cover"
                            style={{ background: "#000" }}
                          />
                          <button
                            type="button"
                            onClick={() => openLightbox(i)}
                            className="absolute inset-0 flex items-center justify-center bg-transparent"
                            aria-label="Xem video lớn"
                          />
                        </div>
                      )}
                    </div>
                  );
                }

                if (m.type === "audio") {
                  return (
                    <div
                      key={i}
                      data-media-index={i}
                      ref={(el) => {
                        if (el) mediaRefs.current[i] = el;
                      }}
                      className={`w-[180px] h-[80px] p-3 rounded-xl flex items-center justify-center gap-2 snap-start flex-shrink-0 ${
                        dragging ? "pointer-events-none" : ""
                      }`}
                      style={{
                        background: "transparent",
                        border: "1px solid rgba(0,0,0,0.1)",
                      }}
                    >
                      {!url && !error && !loading && (
                        <span className="text-xs muted">Đang chờ...</span>
                      )}
                      {loading && (
                        <div className="flex items-center gap-2 muted text-xs">
                          <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                          <span>Đang tải...</span>
                        </div>
                      )}
                      {error && (
                        <span className="text-xs text-red-600 dark:text-red-400">
                          Lỗi audio
                        </span>
                      )}
                      {url && (
                        <div className="w-full h-full relative">
                          <audio controls src={url} className="w-full" />
                          <button
                            type="button"
                            onClick={() => openLightbox(i)}
                            className="absolute inset-0 flex items-center justify-center bg-transparent"
                            aria-label="Xem audio lớn"
                          />
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={i}
                    className={`w-[180px] h-[240px] p-3 rounded-xl text-xs break-all flex items-center justify-center text-center snap-start flex-shrink-0 ${
                      dragging ? "pointer-events-none" : ""
                    }`}
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(0,0,0,0.1)",
                    }}
                  >
                    {m.key}
                  </div>
                );
              })}
            </div>
          </div>

          {mediaCount > visibleCountForWidth && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-1">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const el = scrollRef.current;
                    if (el) {
                      el.scrollTo({
                        left: idx * (tileW + gap) * visibleCountForWidth,
                        behavior: "smooth",
                      });
                    }
                  }}
                  className={`transition-all duration-200 rounded-full ${
                    currentPage === idx
                      ? "bg-black dark:bg-white w-6 h-2"
                      : "bg-neutral-400/40 w-2 h-2"
                  }`}
                  aria-label={`Trang ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions bar */}
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
          aria-controls={`comments-${thread._id}`}
        >
          <span
            className={`h-8 w-8 rounded-full flex items-center justify-center shadow-sm border ${
              showComments
                ? "bg-black text-white dark:bg.white dark:text-black border-transparent"
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
          id={`comments-${thread._id}`}
          ref={commentsRef}
          className="pt-4 border-t border-black/10 dark:border-white/10"
        >
          <CommentInput
            threadId={thread._id}
            onCommentCreated={() => {
              setCommentCount((prev) => prev + 1);
              setShowComments(true);
            }}
          />
          <CommentSection
            threadId={thread._id}
            onCommentCountChange={setCommentCount}
          />
        </div>
      )}

      {lightboxOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ${
            overlayVisible ? "opacity-100 backdrop-blur-sm" : "opacity-0"
          }`}
          style={{
            background: overlayVisible
              ? "rgba(0, 0, 0, 0.85)"
              : "rgba(0, 0, 0, 0)",
          }}
          onClick={onLightboxBackdropClick}
          role="dialog"
          aria-modal="true"
        >
          {/* Close button */}
          <button
            type="button"
            className="absolute top-4 right-4 z-50 h-10 w-10 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              color: "white",
              backdropFilter: "blur(8px)",
            }}
            onClick={closeLightbox}
            aria-label="Đóng"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          {/* Image counter */}
          {mediaIndices.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-white text-sm font-medium bg-black/50">
              {lightboxImgIdx + 1} / {mediaIndices.length}
            </div>
          )}

          {/* Prev/Next buttons */}
          {mediaIndices.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-50 h-12 w-12 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110 bg-white/15 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                aria-label="Ảnh trước"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <button
                type="button"
                className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-50 h-12 w-12 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110 bg-white/15 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                aria-label="Ảnh kế tiếp"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </>
          )}

          {/* Image content */}
          <div
            className={`max-w-[95vw] max-h-[90vh] p-2 transition-transform duration-200 ${
              overlayVisible ? "scale-100" : "scale-95"
            }`}
            onPointerDown={onLightboxPointerDown}
            onPointerUp={onLightboxPointerUp}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const currentMediaIndex = mediaIndices[lightboxImgIdx];
              const mediaObj = thread.media?.[currentMediaIndex];
              const url = signed[currentMediaIndex];
              if (!url && errorIdx[currentMediaIndex]) {
                return (
                  <div className="text-white/90 text-sm bg-red-500/20 px-4 py-3 rounded-lg">
                    Không tải được media.
                  </div>
                );
              }
              if (!url) {
                return (
                  <div className="text-white/90 text-sm flex items-center gap-3 bg-white/10 px-4 py-3 rounded-lg backdrop-blur-sm">
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Đang tải media...</span>
                  </div>
                );
              }

              if (mediaObj?.type === "image") {
                return (
                  <img
                    src={url || "/placeholder.svg"}
                    alt={mediaObj?.mimeType || "Ảnh"}
                    className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg shadow-2xl"
                    draggable={false}
                    style={{
                      animation: "fadeInScale 0.2s ease-out",
                    }}
                  />
                );
              }

              if (mediaObj?.type === "video") {
                return (
                  <video
                    src={url}
                    controls
                    className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg shadow-2xl bg-black"
                  />
                );
              }

              if (mediaObj?.type === "audio") {
                return (
                  <div className="p-4 bg-white/5 rounded-lg">
                    <audio controls src={url} className="w-[80vw]" />
                  </div>
                );
              }

              return (
                <div className="text-white/90 text-sm">
                  Không hỗ trợ loại media này.
                </div>
              );
            })()}
          </div>
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
