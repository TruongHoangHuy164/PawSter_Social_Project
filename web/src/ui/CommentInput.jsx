"use client"

import { useEffect, useRef, useState } from "react"
import { commentApi } from "../utils/api.js"
import { useAuth } from "../state/auth.jsx"

export default function CommentInput({ threadId, onCommentCreated }) {
  const { token } = useAuth()
  const [content, setContent] = useState('')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showStickers, setShowStickers] = useState(false)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const stickerWrapMobileRef = useRef(null)
  const stickerWrapDesktopRef = useRef(null)
  const stickerPanelRef = useRef(null)

  const stickers = [
    '🐶','🐱','🐾','🦴','🦮','🐕','🐈','🐕\u200d🦺','🐈\u200d⬛','🐹','🐰','🦊','🐻','🦝','🐼'
  ]

  const insertAtCursor = (text) => {
    const el = textareaRef.current
    if (!el) {
      setContent((prev) => prev + text)
      return
    }
    const start = el.selectionStart ?? content.length
    const end = el.selectionEnd ?? content.length
    const next = content.slice(0, start) + text + content.slice(end)
    setContent(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + text.length
      el.setSelectionRange(pos, pos)
    })
  }

  // Close stickers on outside click or Escape
  useEffect(() => {
    if (!showStickers) return
    const onDocClick = (e) => {
      const mEl = stickerWrapMobileRef.current
      const dEl = stickerWrapDesktopRef.current
      const pEl = stickerPanelRef.current
      const target = e.target
      const insideMobile = mEl && mEl.contains(target)
      const insideDesktop = dEl && dEl.contains(target)
      const insidePanel = pEl && pEl.contains(target)
      if (!insideMobile && !insideDesktop && !insidePanel) {
        setShowStickers(false)
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setShowStickers(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [showStickers])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim() && files.length === 0) return

    setLoading(true)
    setError('')
    
    try {
      if (files.length > 0) {
        const formData = new FormData()
        if (content.trim()) formData.append('content', content.trim())
        if (threadId) formData.append('threadId', threadId)
        files.forEach(file => formData.append('media', file))
        
        const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/comments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Upload failed')
        }
        await response.json()
      } else {
        await commentApi.createComment({
          threadId,
          content: content.trim()
        }, token)
      }
      
      setContent('')
      setFiles([])
      onCommentCreated?.()
      setShowStickers(false)
    } catch (err) {
      console.error('Create comment failed', err)
      setError(err.message || 'Lỗi tạo bình luận')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || [])
    const merged = [...files, ...selectedFiles].slice(0, 4) // Max 4 files for comments
    setFiles(merged)
  }

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  return (
    <div className="pt-4 border-t border-gray-100">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Input shell */}
        <div
          className="rounded-xl p-2 md:p-3 transition-all duration-200"
          style={{
            background: "linear-gradient(180deg, rgba(155,99,114,0.06), rgba(255,255,255,0.9))",
            border: "1px solid rgba(43,27,34,0.08)",
          }}
        >
          <div className="flex items-end gap-2 md:gap-3">
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Viết bình luận sang chảnh... 🐾"
                className="w-full resize-none rounded-lg px-3 py-2 md:px-4 md:py-3 text-sm outline-none bg-white/80"
                style={{
                  border: "1px solid rgba(43,27,34,0.12)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04) inset",
                }}
                rows={2}
                maxLength={500}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    if (!loading && (content.trim() || files.length > 0)) handleSubmit(e)
                  }
                }}
              />

              {/* Action row below textarea on mobile */}
              <div className="mt-2 flex items-center justify-between md:hidden">
                <div className="flex items-center gap-2">
                  {/* Image icon */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Thêm ảnh/video/audio"
                    className="h-9 w-9 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(155,99,114,0.08)", color: "#9b6372", border: "1px solid rgba(155,99,114,0.2)" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <path d="M21 15l-5-5L5 21"></path>
                    </svg>
                  </button>

                  {/* Sticker icon */}
                  <div className="relative" ref={stickerWrapMobileRef}>
                    <button
                      type="button"
                      onClick={() => setShowStickers((s) => !s)}
                      title="Chọn sticker"
                      className="h-9 w-9 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(155,99,114,0.08)", color: "#9b6372", border: "1px solid rgba(155,99,114,0.2)" }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 12v-2a8 8 0 1 0-16 0v2"></path>
                        <path d="M2 12h20"></path>
                        <path d="M7 17c2 1 4 1 6 0"></path>
                      </svg>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || (!content.trim() && files.length === 0)}
                  className="btn-lux disabled:opacity-50 text-sm font-medium"
                >
                  {loading ? 'Gửi...' : 'Gửi'}
                </button>
              </div>
            </div>

            {/* Right action cluster on desktop */}
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Thêm ảnh/video/audio"
                className="h-10 w-10 rounded-full flex items-center justify-center shadow-sm hover:scale-[1.03] transition"
                style={{ background: "rgba(155,99,114,0.08)", color: "#9b6372", border: "1px solid rgba(155,99,114,0.2)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <path d="M21 15l-5-5L5 21"></path>
                </svg>
              </button>
              <div className="relative" ref={stickerWrapDesktopRef}>
                <button
                  type="button"
                  onClick={() => setShowStickers((s) => !s)}
                  title="Chọn sticker"
                  className="h-10 w-10 rounded-full flex items-center justify-center shadow-sm hover:scale-[1.03] transition"
                  style={{ background: "rgba(155,99,114,0.08)", color: "#9b6372", border: "1px solid rgba(155,99,114,0.2)" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 12v-2a8 8 0 1 0-16 0v2"></path>
                    <path d="M2 12h20"></path>
                    <path d="M7 17c2 1 4 1 6 0"></path>
                  </svg>
                </button>
              </div>
              <button
                type="submit"
                disabled={loading || (!content.trim() && files.length === 0)}
                className="btn-lux disabled:opacity-50 text-sm font-medium"
              >
                {loading ? 'Gửi...' : 'Gửi'}
              </button>
            </div>
          </div>
        </div>

        {/* Sticker selection panel (in-flow) */}
        {showStickers && (
          <div
            ref={stickerPanelRef}
            className="mt-2 rounded-2xl p-3 md:p-4 shadow-2xl"
            style={{ background: '#fff', border: '1px solid rgba(43,27,34,0.1)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium" style={{ color: '#6b4a57' }}>Chọn sticker</div>
              <button
                type="button"
                onClick={() => setShowStickers(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(155,99,114,0.06)', color: '#9b6372', border: '1px solid rgba(155,99,114,0.2)' }}
                aria-label="Đóng sticker"
              >
                ×
              </button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {stickers.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { insertAtCursor(s + ' ') }}
                  className="h-10 w-10 md:h-12 md:w-12 text-xl md:text-2xl leading-none rounded-xl hover:scale-105 transition-transform"
                  style={{ background: 'rgba(155,99,114,0.06)', border: '1px solid rgba(43,27,34,0.1)' }}
                  title={"Sticker " + (i+1)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Selected media preview */}
        {files.length > 0 && (
          <div className="grid gap-2 md:gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}>
            {files.map((file, i) => {
              const url = URL.createObjectURL(file)
              const type = file.type.startsWith('image/') ? 'image' : 
                          file.type.startsWith('video/') ? 'video' : 
                          file.type.startsWith('audio/') ? 'audio' : 'other'

              return (
                <div
                  key={i}
                  className="relative group rounded-lg overflow-hidden flex items-center justify-center"
                  style={{
                    background: 'rgba(155,99,114,0.06)',
                    border: '1px solid rgba(43,27,34,0.12)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                  }}
                >
                  {type === 'image' && <img src={url} alt={file.name} className="object-cover w-full h-20" />}
                  {type === 'video' && <video src={url} className="w-full h-20 object-cover" muted />}
                  {type === 'audio' && <span className="text-[11px] text-gray-600 truncate px-2 py-3 w-full text-center">🎵 {file.name}</span>}
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 bg-white/90 text-[#dc2626] rounded-full w-6 h-6 text-sm leading-none shadow hover:scale-105 transition"
                    title="Xóa"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {error && (
          <div
            className="text-xs px-3 py-2 rounded-md"
            style={{ color: '#dc2626', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}
          >
            {error}
          </div>
        )}

        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>{content.length}/500</span>
          <span className="hidden md:inline" style={{ color: '#6b4a57' }}>Ctrl/⌘ + Enter để gửi</span>
        </div>
      </form>
    </div>
  )
}
