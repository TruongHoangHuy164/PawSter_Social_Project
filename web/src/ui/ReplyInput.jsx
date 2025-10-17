"use client"

import { useState, useEffect } from "react"
import { commentApi } from "../utils/api.js"
import { useAuth } from "../state/auth.jsx"

export default function ReplyInput({ threadId, parentId, parentComment, onCancel, placeholder = "Viết trả lời..." }) {
  const { token, user } = useAuth()
  const [content, setContent] = useState('')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      if (files.length > 0) {
        const formData = new FormData()
        if (content.trim()) formData.append('content', content.trim())
        if (threadId) formData.append('threadId', threadId)
        if (parentId) formData.append('parentId', parentId)
        files.forEach(file => formData.append('media', file))
        
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/comments`, {
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
    <div className="ml-4 mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={getPlaceholder()}
              className="w-full resize-none border border-gray-200 rounded p-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              rows={2}
              maxLength={500}
              autoFocus
              style={{
                color: content.startsWith('@') ? '#7c3aed' : 'inherit'
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <button
              type="submit"
              disabled={loading || (!content.trim() && files.length === 0)}
              className="px-3 py-1 bg-violet-600 text-white rounded hover:bg-violet-500 disabled:opacity-40 text-sm"
            >
              {loading ? 'Gửi...' : 'Gửi'}
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
              >
                Hủy
              </button>
            )}
          </div>
        </div>
        
        <div>
          <input
            type="file"
            multiple
            accept="image/*,video/*,audio/*"
            onChange={handleFileSelect}
            className="text-xs"
          />
          
          {files.length > 0 && (
            <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))' }}>
              {files.map((file, i) => {
                const url = URL.createObjectURL(file)
                const type = file.type.startsWith('image/') ? 'image' : 
                            file.type.startsWith('video/') ? 'video' : 
                            file.type.startsWith('audio/') ? 'audio' : 'other'
                
                return (
                  <div key={i} className="relative group rounded overflow-hidden border border-gray-200 p-1 flex items-center justify-center bg-white">
                    {type === 'image' && <img src={url} alt={file.name} className="object-cover w-full h-12" />}
                    {type === 'video' && <video src={url} className="w-full h-12 object-cover" muted />}
                    {type === 'audio' && <span className="text-[10px] text-gray-400 truncate">🎵</span>}
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 text-[10px] opacity-0 group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {error && <div className="text-xs text-red-500">{error}</div>}
        
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>{content.length}/500</span>
        </div>
      </form>
    </div>
  )
}
