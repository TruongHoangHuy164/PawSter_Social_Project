"use client"

import { useState, useEffect, useRef } from "react"
import { commentApi } from "../utils/api.js"
import { useAuth } from "../state/auth.jsx"

export default function ReplyInput({ threadId, parentId, parentComment, onCancel, placeholder = "Viết trả lời..." }) {
  const { token, user } = useAuth()
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
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowStickers(false)
      }
    }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [showStickers])

  // Tự động thêm @username khi component mount (nếu không phải reply chính mình)
  useEffect(() => {
    if (parentComment && parentComment.author && user) {
      const parentUsername = parentComment.author.username
      const currentUsername = user.username
      
      // Chỉ thêm @username nếu không phải reply chính mình
      if (parentUsername && parentUsername !== currentUsername) {
        setContent(`@${parentUsername} `)
      }
    }
  }, [parentComment, user])

  // Cập nhật placeholder động
  const getPlaceholder = () => {
    if (parentComment && parentComment.author && user) {
      const parentUsername = parentComment.author.username
      const currentUsername = user.username
      
      if (parentUsername && parentUsername !== currentUsername) {
        return `Trả lời @${parentUsername}...`
      }
    }
    return placeholder
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim() && files.length === 0) return

    setLoading(true)
    setError('')
    
    try {
      // Check if this is a repost threadId (starts with "repost_")
      const isRepostComments = threadId.startsWith('repost_');
      
      if (isRepostComments) {
        // For repost replies, save to localStorage
        const newReply = {
          _id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content: content.trim(),
          author: {
            _id: 'current_user',
            username: 'You',
            isPro: false
          },
          createdAt: new Date().toISOString(),
          likes: [],
          likesCount: 0,
          parentId: parentId,
          threadId: threadId,
          media: files.length > 0 ? files.map(f => ({
            type: f.type.startsWith('image/') ? 'image' : 'video',
            url: URL.createObjectURL(f),
            filename: f.name
          })) : undefined
        };
        
        // Get existing comments
        const existingComments = JSON.parse(localStorage.getItem(`comments_${threadId}`) || '[]');
        
        // Find parent comment and add reply
        const updatedComments = existingComments.map(comment => {
          if (comment._id === parentId) {
            return {
              ...comment,
              replies: [newReply, ...(comment.replies || [])],
              repliesCount: (comment.repliesCount || 0) + 1
            };
          }
          return comment;
        });
        
        // Save to localStorage
        localStorage.setItem(`comments_${threadId}`, JSON.stringify(updatedComments));
      } else {
        // For regular threads, use API
        if (files.length > 0) {
          const formData = new FormData()
          if (content.trim()) formData.append('content', content.trim())
          if (threadId) formData.append('threadId', threadId)
          if (parentId) formData.append('parentId', parentId)
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
          
          const result = await response.json()
          // Reply will be created via WebSocket event
        } else {
          console.log('🚀 Creating reply via API:', { threadId, parentId, content: content.trim() });
          await commentApi.createComment({
            threadId,
            content: content.trim(),
            parentId
          }, token)
          console.log('✅ Reply created successfully, waiting for WebSocket event...');
          // Reply will be created via WebSocket event
        }
      }
      
      setContent('')
      setFiles([])
      if (onCancel) {
        onCancel()
      }
    } catch (err) {
      console.error('Create reply failed', err)
      setError(err.message || 'Lỗi tạo trả lời')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || [])
    const merged = [...files, ...selectedFiles].slice(0, 4) // Max 4 files for replies
    setFiles(merged)
  }

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  return (
    <div className="ml-4 mt-2 border-t border-black/10 dark:border-white/15 pt-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Input shell */}
        <div className="rounded-xl p-2 md:p-3 transition-all duration-200 bg-white dark:bg-black border border-black/10 dark:border-white/15">
          <div className="flex items-end gap-2 md:gap-3">
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={getPlaceholder()}
                className="w-full resize-none rounded-lg px-3 py-2 md:px-4 md:py-3 text-sm outline-none bg-neutral-50 dark:bg-neutral-900 border border-black/10 dark:border-white/15 text-black dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                rows={2}
                maxLength={500}
                autoFocus
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
                    className="h-9 w-9 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-black/10 dark:border-white/15 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
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
                      className="h-9 w-9 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-black/10 dark:border-white/15 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
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
                className="h-10 w-10 rounded-full flex items-center justify-center shadow-sm hover:scale-[1.03] transition bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-black/10 dark:border-white/15 hover:bg-neutral-200 dark:hover:bg-neutral-700"
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
                  className="h-10 w-10 rounded-full flex items-center justify-center shadow-sm hover:scale-[1.03] transition bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-black/10 dark:border-white/15 hover:bg-neutral-200 dark:hover:bg-neutral-700"
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

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* File previews */}
        {files.length > 0 && (
          <div className="px-3">
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
              {files.map((file, i) => {
                const url = URL.createObjectURL(file)
                const type = file.type.startsWith('image/') ? 'image' : 
                            file.type.startsWith('video/') ? 'video' : 
                            file.type.startsWith('audio/') ? 'audio' : 'other'
                
                return (
                  <div key={i} className="relative group rounded-xl overflow-hidden border border-black/10 dark:border-white/15 bg-neutral-50 dark:bg-neutral-900">
                    <div className="aspect-square flex items-center justify-center p-2">
                      {type === 'image' && <img src={url} alt={file.name} className="object-cover w-full h-full rounded-lg" />}
                      {type === 'video' && <video src={url} className="w-full h-full object-cover rounded-lg" muted />}
                      {type === 'audio' && <span className="text-2xl">🎵</span>}
                      {type === 'other' && <span className="text-2xl">📄</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Sticker panel */}
        {showStickers && (
          <div 
            ref={stickerPanelRef}
            className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/15 rounded-xl p-3 shadow-lg"
          >
            <div className="text-xs text-neutral-600 dark:text-neutral-400 mb-2 font-medium">Chọn sticker:</div>
            <div className="grid grid-cols-8 gap-2">
              {stickers.map((sticker) => (
                <button
                  key={sticker}
                  type="button"
                  onClick={() => {
                    insertAtCursor(sticker)
                    setShowStickers(false)
                  }}
                  className="h-10 w-10 text-2xl hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors flex items-center justify-center"
                >
                  {sticker}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="px-3">
            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</div>
          </div>
        )}
        
        {/* Character counter */}
        <div className="flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400 px-3">
          <span>{content.length}/500</span>
        </div>
      </form>
    </div>
  )
}
