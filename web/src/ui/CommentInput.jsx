"use client"

import { useState } from "react"
import { commentApi } from "../utils/api.js"
import { useAuth } from "../state/auth.jsx"

export default function CommentInput({ threadId, onCommentCreated }) {
  const { token } = useAuth()
  const [content, setContent] = useState('')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
        // Comment will be created via WebSocket event
      } else {
        await commentApi.createComment({
          threadId,
          content: content.trim()
        }, token)
        // Comment will be created via WebSocket event
      }
      
      setContent('')
      setFiles([])
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
    <div className="pt-3 border-t border-gray-100">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Viết bình luận..."
              className="w-full resize-none border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              rows={2}
              maxLength={500}
            />
          </div>
          <button
            type="submit"
            disabled={loading || (!content.trim() && files.length === 0)}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-40 text-sm font-medium"
          >
            {loading ? 'Gửi...' : 'Gửi'}
          </button>
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
            <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
              {files.map((file, i) => {
                const url = URL.createObjectURL(file)
                const type = file.type.startsWith('image/') ? 'image' : 
                            file.type.startsWith('video/') ? 'video' : 
                            file.type.startsWith('audio/') ? 'audio' : 'other'
                
                return (
                  <div key={i} className="relative group rounded overflow-hidden border border-gray-200 p-1 flex items-center justify-center bg-white">
                    {type === 'image' && <img src={url} alt={file.name} className="object-cover w-full h-16" />}
                    {type === 'video' && <video src={url} className="w-full h-16 object-cover" muted />}
                    {type === 'audio' && <span className="text-[10px] text-gray-400 truncate">🎵 {file.name}</span>}
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-[10px] opacity-0 group-hover:opacity-100"
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
