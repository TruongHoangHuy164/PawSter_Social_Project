"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import ProBadge from "./ProBadge.jsx"
import { api } from "../utils/api.js"
import { useAuth } from "../state/auth.jsx"

export default function ThreadItem({ thread, onDelete }) {
  const { user, token } = useAuth()
  const mine = user && thread.author && thread.author._id === user._id
  const [signed, setSigned] = useState({})
  const [loadingIdx, setLoadingIdx] = useState({})
  const [errorIdx, setErrorIdx] = useState({})
  const mediaRefs = useRef({})
  const scrollRef = useRef(null)
  const isDownRef = useRef(false)
  const startXRef = useRef(0)
  const scrollLeftRef = useRef(0)
  const [dragging, setDragging] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Lightbox states
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImgIdx, setLightboxImgIdx] = useState(0)
  const [overlayVisible, setOverlayVisible] = useState(false)
  const swipeStartX = useRef(0)
  const swipeActive = useRef(false)

  const fetchSigned = useCallback(
    async (i) => {
      if (signed[i] || loadingIdx[i]) return
      setLoadingIdx((s) => ({ ...s, [i]: true }))
      try {
        const res = await api.get(`/media/thread/${thread._id}/${i}`, token)
        const url = res.data.data.url
        setSigned((s) => ({ ...s, [i]: url }))
      } catch (e) {
        console.error("Fetch signed failed", e)
        setErrorIdx((s) => ({ ...s, [i]: true }))
      } finally {
        setLoadingIdx((s) => ({ ...s, [i]: false }))
      }
    },
    [signed, loadingIdx, thread._id, token],
  )

  // Preload images immediately
  useEffect(() => {
    if (thread.media?.length) {
      thread.media.forEach((m, i) => {
        if (m.type === "image") fetchSigned(i)
      })
    }
  }, [thread.media, fetchSigned])

  // Auto-load video & audio when they enter viewport
  useEffect(() => {
    if (!thread.media || !thread.media.length) return
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      thread.media.forEach((m, i) => {
        if ((m.type === "video" || m.type === "audio") && !signed[i] && !loadingIdx[i] && !errorIdx[i]) {
          fetchSigned(i)
        }
      })
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idxAttr = entry.target.getAttribute("data-media-index")
            if (idxAttr != null) {
              const idx = Number(idxAttr)
              if (!signed[idx] && !loadingIdx[idx] && !errorIdx[idx]) {
                fetchSigned(idx)
              }
              observer.unobserve(entry.target)
            }
          }
        })
      },
      { root: null, rootMargin: "150px", threshold: 0.1 },
    )

    thread.media.forEach((m, i) => {
      if ((m.type === "video" || m.type === "audio") && !signed[i]) {
        const el = mediaRefs.current[i]
        if (el) observer.observe(el)
      }
    })

    return () => observer.disconnect()
  }, [thread.media, signed, loadingIdx, errorIdx, fetchSigned])

  const del = async () => {
    if (!confirm("Xóa bài này?")) return
    try {
      await api.del(`/threads/${thread._id}`, token)
      onDelete?.(thread._id)
    } catch (e) {
      console.error(e)
    }
  }

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setScrollPosition(scrollLeft)
    setCanScrollLeft(scrollLeft > 5)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateScrollState()
    el.addEventListener("scroll", updateScrollState)
    const resizeObserver = new ResizeObserver(updateScrollState)
    resizeObserver.observe(el)
    return () => {
      el.removeEventListener("scroll", updateScrollState)
      resizeObserver.disconnect()
    }
  }, [updateScrollState, thread.media])

  const onPointerDown = useCallback((e) => {
    const el = scrollRef.current
    if (!el) return
    isDownRef.current = true
    startXRef.current = e.clientX
    scrollLeftRef.current = el.scrollLeft
    setDragging(false)
    try {
      el.setPointerCapture?.(e.pointerId)
    } catch {}
  }, [])

  const onPointerMove = useCallback(
    (e) => {
      const el = scrollRef.current
      if (!el || !isDownRef.current) return
      const dx = e.clientX - startXRef.current
      if (!dragging && Math.abs(dx) > 5) setDragging(true)
      if (Math.abs(dx) > 1) {
        el.scrollLeft = scrollLeftRef.current - dx
        e.preventDefault()
      }
    },
    [dragging],
  )

  const endDrag = useCallback((e) => {
    const el = scrollRef.current
    isDownRef.current = false
    setDragging(false)
    try {
      el?.releasePointerCapture?.(e.pointerId)
    } catch {}
  }, [])

  const mediaCount = thread.media?.length || 0
  const tileW = 180
  const gap = 12

  const sortedMedia = useMemo(() => {
    const result = []
    const imgs = []
    const vids = []
    const auds = []
    ;(thread.media || []).forEach((m, i) => {
      const entry = { m, i }
      if (m.type === "image") imgs.push(entry)
      else if (m.type === "video") vids.push(entry)
      else if (m.type === "audio") auds.push(entry)
      else result.push(entry)
    })
    return [...imgs, ...vids, ...auds, ...result]
  }, [thread.media])

  const imageCount = useMemo(() => (thread.media || []).filter((m) => m.type === "image").length, [thread.media])
  const visibleCountForWidth = imageCount > 0 ? Math.min(4, imageCount) : Math.min(4, mediaCount)
  const maxRowWidth = visibleCountForWidth > 0 ? visibleCountForWidth * tileW + (visibleCountForWidth - 1) * gap : 0

  const scrollByPage = useCallback(
    (dir) => {
      const el = scrollRef.current
      if (!el) return
      const delta = (tileW + gap) * Math.max(1, visibleCountForWidth)
      el.scrollBy({ left: dir * delta, behavior: "smooth" })
    },
    [visibleCountForWidth],
  )

  const imageIndices = (thread.media || [])
    .map((m, i) => ({ m, i }))
    .filter((x) => x.m.type === "image")
    .map((x) => x.i)

  const openLightbox = useCallback(
    async (imageIdxInMedia) => {
      if (dragging) return
      const imgPos = imageIndices.indexOf(imageIdxInMedia)
      if (imgPos < 0) return
      if (!signed[imageIdxInMedia] && !loadingIdx[imageIdxInMedia] && !errorIdx[imageIdxInMedia]) {
        try {
          await fetchSigned(imageIdxInMedia)
        } catch {}
      }
      setLightboxImgIdx(imgPos)
      setLightboxOpen(true)
      requestAnimationFrame(() => setOverlayVisible(true))
    },
    [dragging, imageIndices, signed, loadingIdx, errorIdx, fetchSigned],
  )

  const closeLightbox = useCallback(() => {
    setOverlayVisible(false)
    setTimeout(() => setLightboxOpen(false), 200)
  }, [])

  const nextImage = useCallback(() => {
    if (imageIndices.length <= 1) return
    setLightboxImgIdx((p) => (p + 1) % imageIndices.length)
  }, [imageIndices.length])

  const prevImage = useCallback(() => {
    if (imageIndices.length <= 1) return
    setLightboxImgIdx((p) => (p - 1 + imageIndices.length) % imageIndices.length)
  }, [imageIndices.length])

  useEffect(() => {
    if (!lightboxOpen) return
    const onKey = (e) => {
      if (e.key === "Escape") closeLightbox()
      if (e.key === "ArrowRight") nextImage()
      if (e.key === "ArrowLeft") prevImage()
    }
    document.addEventListener("keydown", onKey)
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = oldOverflow
    }
  }, [lightboxOpen, closeLightbox, nextImage, prevImage])

  const onLightboxPointerDown = useCallback((e) => {
    swipeActive.current = true
    swipeStartX.current = e.clientX
  }, [])

  const onLightboxPointerUp = useCallback(
    (e) => {
      if (!swipeActive.current) return
      const dx = e.clientX - swipeStartX.current
      swipeActive.current = false
      const threshold = 50
      if (dx > threshold) {
        prevImage()
      } else if (dx < -threshold) {
        nextImage()
      }
    },
    [nextImage, prevImage],
  )

  const onLightboxBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) closeLightbox()
    },
    [closeLightbox],
  )

  const totalPages = Math.ceil(mediaCount / visibleCountForWidth)
  const currentPage = Math.floor(scrollPosition / ((tileW + gap) * visibleCountForWidth))

  return (
    <div className="p-5 rounded-xl space-y-3 card pop shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-base" style={{ color: "#000" }}>
            {thread.author?.username || "Unknown"}
          </span>
          {thread.author?.isPro && <ProBadge />}
        </div>
        <span className="text-xs muted">{new Date(thread.createdAt).toLocaleString("vi-VN")}</span>
        {mine && (
          <button
            onClick={del}
            className="ml-auto text-xs px-3 py-1 rounded-md transition-colors duration-150"
            style={{ color: "#dc2626", background: "rgba(220, 38, 38, 0.08)" }}
            onMouseEnter={(e) => (e.target.style.background = "rgba(220, 38, 38, 0.15)")}
            onMouseLeave={(e) => (e.target.style.background = "rgba(220, 38, 38, 0.08)")}
          >
            Xóa
          </button>
        )}
      </div>

      {/* Content */}
      <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#2b1b22" }}>
        {thread.content}
      </div>

      {/* Media Gallery */}
      {thread.media && thread.media.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="relative">
            {mediaCount > visibleCountForWidth && (
              <>
                {canScrollLeft && (
                  <button
                    type="button"
                    className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-110"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 80%, #ffffff))",
                      color: "white",
                    }}
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
                    className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-110"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 80%, #ffffff))",
                      color: "white",
                    }}
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
              className={`flex gap-3 overflow-x-auto overflow-y-hidden px-1 py-2 snap-x snap-mandatory w-full mx-auto scrollbar-hide ${dragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
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
                const url = signed[i]
                const loading = loadingIdx[i]
                const error = errorIdx[i]

                if (m.type === "image") {
                  return (
                    <div
                      key={i}
                      className={`relative group w-[180px] h-[240px] snap-start flex-shrink-0 ${dragging ? "pointer-events-none" : ""}`}
                    >
                      {!url && !error && (
                        <div
                          className="flex items-center justify-center rounded-lg w-full h-full text-xs muted"
                          style={{
                            background: "rgba(155, 99, 114, 0.08)",
                            border: "1px solid rgba(155, 99, 114, 0.15)",
                          }}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"></div>
                            <span>Đang tải...</span>
                          </div>
                        </div>
                      )}
                      {error && (
                        <div
                          className="rounded-lg text-xs p-3 w-full h-full flex items-center justify-center text-center"
                          style={{
                            background: "rgba(220, 38, 38, 0.08)",
                            border: "1px solid rgba(220, 38, 38, 0.2)",
                            color: "#dc2626",
                          }}
                        >
                          Lỗi tải ảnh
                        </div>
                      )}
                      {url && (
                        <button
                          type="button"
                          onClick={() => openLightbox(i)}
                          className="block group w-full h-full rounded-lg overflow-hidden transition-transform duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2"
                          style={{
                            border: "1px solid rgba(43, 27, 34, 0.1)",
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                          }}
                          aria-label="Xem ảnh lớn"
                        >
                          <img
                            src={url || "/placeholder.svg"}
                            alt={m.mimeType}
                            draggable={false}
                            className="object-cover w-full h-full group-hover:opacity-95 transition-opacity duration-200"
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
                        </button>
                      )}
                    </div>
                  )
                }

                if (m.type === "video") {
                  return (
                    <div
                      key={i}
                      data-media-index={i}
                      ref={(el) => {
                        if (el) mediaRefs.current[i] = el
                      }}
                      className={`relative group w-[180px] h-[240px] rounded-lg overflow-hidden flex items-center justify-center snap-start flex-shrink-0 ${dragging ? "pointer-events-none" : ""}`}
                      style={{
                        background: "rgba(155, 99, 114, 0.05)",
                        border: "1px solid rgba(43, 27, 34, 0.1)",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                      }}
                    >
                      {!url && !error && !loading && (
                        <div className="text-xs px-3 py-2 muted text-center">Đang chờ hiển thị...</div>
                      )}
                      {loading && (
                        <div className="flex flex-col items-center gap-2 muted text-xs">
                          <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"></div>
                          <span>Đang tải...</span>
                        </div>
                      )}
                      {error && (
                        <div className="text-xs p-3 text-center" style={{ color: "#dc2626" }}>
                          Lỗi video
                        </div>
                      )}
                      {url && (
                        <video
                          src={url}
                          controls
                          className="w-full h-full object-cover"
                          style={{ background: "#000" }}
                        />
                      )}
                    </div>
                  )
                }

                if (m.type === "audio") {
                  return (
                    <div
                      key={i}
                      data-media-index={i}
                      ref={(el) => {
                        if (el) mediaRefs.current[i] = el
                      }}
                      className={`w-[180px] h-[80px] p-3 rounded-lg flex items-center justify-center gap-2 snap-start flex-shrink-0 ${dragging ? "pointer-events-none" : ""}`}
                      style={{
                        background: "rgba(155, 99, 114, 0.05)",
                        border: "1px solid rgba(43, 27, 34, 0.1)",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                      }}
                    >
                      {!url && !error && !loading && <span className="text-xs muted">Đang chờ...</span>}
                      {loading && (
                        <div className="flex items-center gap-2 muted text-xs">
                          <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                          <span>Đang tải...</span>
                        </div>
                      )}
                      {error && (
                        <span className="text-xs" style={{ color: "#dc2626" }}>
                          Lỗi audio
                        </span>
                      )}
                      {url && <audio controls src={url} className="w-full" />}
                    </div>
                  )
                }

                return (
                  <div
                    key={i}
                    className={`w-[180px] h-[240px] p-3 rounded-lg text-xs break-all flex items-center justify-center text-center snap-start flex-shrink-0 ${dragging ? "pointer-events-none" : ""}`}
                    style={{
                      background: "rgba(155, 99, 114, 0.05)",
                      border: "1px solid rgba(43, 27, 34, 0.1)",
                    }}
                  >
                    {m.key}
                  </div>
                )
              })}
            </div>
          </div>

          {mediaCount > visibleCountForWidth && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-1">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const el = scrollRef.current
                    if (el) {
                      el.scrollTo({
                        left: idx * (tileW + gap) * visibleCountForWidth,
                        behavior: "smooth",
                      })
                    }
                  }}
                  className="transition-all duration-200 rounded-full"
                  style={{
                    width: currentPage === idx ? "24px" : "8px",
                    height: "8px",
                    background: currentPage === idx ? "var(--accent)" : "rgba(155, 99, 114, 0.25)",
                  }}
                  aria-label={`Trang ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {lightboxOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ${overlayVisible ? "opacity-100 backdrop-blur-sm" : "opacity-0"}`}
          style={{ background: overlayVisible ? "rgba(0, 0, 0, 0.85)" : "rgba(0, 0, 0, 0)" }}
          onClick={onLightboxBackdropClick}
          role="dialog"
          aria-modal="true"
        >
          {/* Close button */}
          <button
            type="button"
            className="absolute top-4 right-4 z-50 h-10 w-10 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
            style={{ background: "rgba(255, 255, 255, 0.15)", color: "white", backdropFilter: "blur(8px)" }}
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
          {imageIndices.length > 1 && (
            <div
              className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-white text-sm font-medium"
              style={{ background: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(8px)" }}
            >
              {lightboxImgIdx + 1} / {imageIndices.length}
            </div>
          )}

          {/* Prev/Next buttons */}
          {imageIndices.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-50 h-12 w-12 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
                style={{ background: "rgba(255, 255, 255, 0.15)", color: "white", backdropFilter: "blur(8px)" }}
                onClick={(e) => {
                  e.stopPropagation()
                  prevImage()
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
                className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-50 h-12 w-12 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
                style={{ background: "rgba(255, 255, 255, 0.15)", color: "white", backdropFilter: "blur(8px)" }}
                onClick={(e) => {
                  e.stopPropagation()
                  nextImage()
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
            className={`max-w-[95vw] max-h-[90vh] p-2 transition-transform duration-200 ${overlayVisible ? "scale-100" : "scale-95"}`}
            onPointerDown={onLightboxPointerDown}
            onPointerUp={onLightboxPointerUp}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const currentMediaIndex = imageIndices[lightboxImgIdx]
              const imgUrl = signed[currentMediaIndex]
              if (!imgUrl && errorIdx[currentMediaIndex]) {
                return (
                  <div className="text-white/90 text-sm bg-red-500/20 px-4 py-3 rounded-lg">Không tải được ảnh.</div>
                )
              }
              if (!imgUrl) {
                return (
                  <div className="text-white/90 text-sm flex items-center gap-3 bg-white/10 px-4 py-3 rounded-lg backdrop-blur-sm">
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Đang tải ảnh...</span>
                  </div>
                )
              }
              return (
                <img
                  src={imgUrl || "/placeholder.svg"}
                  alt="Ảnh"
                  className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg shadow-2xl"
                  draggable={false}
                  style={{
                    animation: "fadeInScale 0.2s ease-out",
                  }}
                />
              )
            })()}
          </div>
        </div>
      )}

      <style jsx>{`
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
  )
}
