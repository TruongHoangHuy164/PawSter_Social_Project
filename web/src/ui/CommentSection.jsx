"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { commentApi, api } from "../utils/api.js"
import { useAuth } from "../state/auth.jsx"
import { useSocket } from "../state/socket.jsx"
import ProBadge from "./ProBadge.jsx"
import ReplyInput from "./ReplyInput.jsx"

export default function CommentSection({ threadId, onCommentCountChange }) {
  const { user, token } = useAuth()
  const { socket, connected } = useSocket()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalComments, setTotalComments] = useState(0)
  const [showComposer, setShowComposer] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const [expandedReplies, setExpandedReplies] = useState(new Set())
  const [reloadingForParent, setReloadingForParent] = useState(false)

  const loadComments = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      setError('')

      console.log('📡 Loading comments:', { threadId, page: pageNum, append });
      // Luôn load 3 comments mỗi lần (không phân biệt trang đầu hay không)
      const response = await commentApi.getComments(threadId, pageNum, 3, null, token)
      const newComments = response.data.data || []
      console.log('📝 Loaded comments:', newComments.length);
      
      if (append) {
        setComments(prev => [...prev, ...newComments])
      } else {
        setComments(prev => {
          // First, try to merge any temporary replies that might exist
          const tempReplies = prev.filter(c => c.isTemporaryReply);
          const mergedComments = [...newComments];
          
          if (tempReplies.length > 0) {
            console.log('🔄 Merging temporary replies with loaded comments...');
            
            tempReplies.forEach(tempReply => {
              const parentIndex = mergedComments.findIndex(c => c._id === tempReply.originalParentId);
              if (parentIndex !== -1) {
                console.log('✅ Found parent for temporary reply, merging...');
                mergedComments[parentIndex] = {
                  ...mergedComments[parentIndex],
                  replies: [...(mergedComments[parentIndex].replies || []), {
                    ...tempReply,
                    isTemporaryReply: false,
                    originalParentId: undefined
                  }],
                  repliesCount: (mergedComments[parentIndex].repliesCount || 0) + 1
                };
                
                // Auto-expand the parent
                setExpandedReplies(prevExpanded => {
                  const newSet = new Set(prevExpanded);
                  newSet.add(tempReply.originalParentId);
                  return newSet;
                });
              } else {
                console.log('⚠️ Parent still not found for temporary reply, discarding...');
                // Don't keep temporary replies if parent is still not found
              }
            });
          }
          
          return mergedComments;
        });
      }

      setHasMore(newComments.length === 3 && (append ? comments.length + newComments.length < (response.data.pagination?.total || 0) : newComments.length < (response.data.pagination?.total || 0)))
      setPage(pageNum)
      
      // Update comment count and total
      if (pageNum === 1) {
        setTotalComments(response.data.pagination?.total || newComments.length)
        if (onCommentCountChange) {
          onCommentCountChange(response.data.pagination?.total || newComments.length)
        }
      }
    } catch (err) {
      console.error('Load comments failed', err)
      setError(err.message || 'Lỗi tải bình luận')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [threadId, token, onCommentCountChange])

  useEffect(() => {
    if (threadId) {
      loadComments(1)
    }
  }, [threadId, loadComments])

  // WebSocket event listeners
  useEffect(() => {
    console.log('🔧 Setting up WebSocket listeners:', {
      hasSocket: !!socket,
      threadId,
      connected
    });
    
    if (!socket || !threadId) {
      console.log('⏸️ Skipping WebSocket setup - missing socket or threadId');
      return
    }

    // Join thread room
    console.log('🏠 Joining thread room:', threadId);
    socket.emit('join_thread', threadId)

    // Listen for join confirmation
    const handleJoinedThread = (data) => {
      console.log('✅ Joined thread room confirmed:', data);
    }

    // Handle broadcast events (fallback)
    const handleBroadcastComment = (data) => {
      console.log('📢 Received broadcast comment:', data);
      if (data.threadId === threadId) {
        console.log('🎯 Broadcast comment matches current thread, processing...');
        handleNewComment(data);
      }
    }

    // Listen for new comments
    const handleNewComment = (data) => {
      console.log('🔔 Received new_comment event:', {
        eventData: data,
        currentThreadId: threadId,
        matches: data.threadId === threadId
      });
      
      if (data.threadId === threadId) {
        const newComment = data.comment
        console.log('🔍 Processing comment:', {
          commentId: newComment._id,
          parentId: newComment.parentId,
          isReply: !!newComment.parentId,
          content: newComment.content?.substring(0, 50) + '...'
        });
        
        // Add new comment to the list
        setComments(prev => {
          console.log('📋 Current comments count:', prev.length);
          
          // Check if comment already exists (avoid duplicates)
          const exists = prev.some(comment => comment._id === newComment._id)
          if (exists) {
            console.log('⚠️ Comment already exists, skipping:', newComment._id);
            return prev
          }
          
          if (newComment.parentId) {
            // This is a reply, add it to the parent comment
            console.log('💬 Adding reply to parent:', newComment.parentId);
            
            // Extract parentId string from object if needed
            const parentId = typeof newComment.parentId === 'object' ? newComment.parentId._id : newComment.parentId;
            console.log('🔍 Extracted parentId:', parentId);
            console.log('📋 Available comment IDs:', prev.map(c => c._id));
            
            let foundParent = false;
            const updated = prev.map(comment => {
              if (comment._id === parentId) {
                foundParent = true;
                console.log('✅ Found parent comment, current replies:', comment.replies?.length || 0);
                // Check if reply already exists to prevent duplicates
                const replyExists = comment.replies?.some(reply => reply._id === newComment._id);
                if (replyExists) {
                  console.log('⚠️ Reply already exists, skipping:', newComment._id);
                  return comment;
                }
                // Add new reply to the BEGINNING of replies list (most recent first)
                const updatedReplies = [newComment, ...(comment.replies || [])];
                console.log('✅ Updated replies count:', updatedReplies.length);
                return {
                  ...comment,
                  replies: updatedReplies,
                  repliesCount: (comment.repliesCount || 0) + 1
                }
              }
              return comment
            })
            
            if (!foundParent) {
              console.log('❌ Parent comment not found in current list:', parentId);
              console.log('🔍 Searching in all comments including nested replies...');
              
              // Search for parent in nested replies as well
              let foundInReplies = false;
              const updatedWithNestedReply = prev.map(comment => {
                if (comment.replies) {
                  const replyExists = comment.replies.some(reply => reply._id === parentId);
                  if (replyExists) {
                    foundInReplies = true;
                    console.log('✅ Found parent in nested replies, treating as nested reply');
                    // Check if the nested reply already exists
                    const nestedReplyExists = comment.replies.some(reply => reply._id === newComment._id);
                    if (nestedReplyExists) {
                      console.log('⚠️ Nested reply already exists, skipping:', newComment._id);
                      return comment;
                    }
                    // This would be a nested reply to a reply - add to beginning for newest first
                    return {
                      ...comment,
                      replies: [newComment, ...comment.replies],
                      repliesCount: (comment.repliesCount || 0) + 1
                    };
                  }
                }
                return comment;
              });
              
              if (foundInReplies) {
                return updatedWithNestedReply;
              }
              
              console.log('💡 Parent truly not found, reloading comments to find it...');
              
              // Try to load more comments to find the parent immediately
              if (!reloadingForParent) {
                setReloadingForParent(true);
                setTimeout(() => {
                  console.log('🔄 Loading more comments to find parent...');
                  loadComments(1);
                  setTimeout(() => setReloadingForParent(false), 3000);
                }, 100); // Reduced delay for faster loading
              }
              
              // For now, don't add temporary comment - just wait for reload
              console.log('⏳ Waiting for parent to be loaded, not adding temporary comment');
              return prev;
            }
            
            // Auto-expand replies for the parent comment and scroll if needed
            setExpandedReplies(prevExpanded => {
              const newSet = new Set(prevExpanded)
              newSet.add(parentId)
              console.log('🎯 Auto-expanding replies for parent:', parentId);
              
              // Small delay to ensure DOM updates, then scroll to new reply
              setTimeout(() => {
                const newReplyElement = document.querySelector(`[data-comment-id="${newComment._id}"]`);
                if (newReplyElement) {
                  console.log('📍 Scrolling to new reply:', newComment._id);
                  newReplyElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else {
                  console.log('❌ Could not find new reply element for scrolling:', newComment._id);
                }
              }, 100);
              
              return newSet
            })
            
            console.log('📝 Updated comments with new reply');
            return updated
          } else {
            // This is a top-level comment
            console.log('💬 Adding new top-level comment');
            return [newComment, ...prev]
          }
        })

        // Update comment count only for top-level comments
        if (onCommentCountChange && !newComment.parentId) {
          setTotalComments(prev => prev + 1)
          onCommentCountChange(prev => prev + 1)
        }
      } else {
        console.log('🚫 Ignoring comment for different thread:', data.threadId, 'vs', threadId);
      }
    }

    // Listen for comment deletions
    const handleCommentDeleted = (data) => {
      if (data.threadId === threadId) {
        setComments(prev => {
          if (data.parentId) {
            // Extract parentId string from object if needed
            const parentId = typeof data.parentId === 'object' ? data.parentId._id : data.parentId;
            
            // Remove reply from parent comment
            return prev.map(comment => {
              if (comment._id === parentId) {
                return {
                  ...comment,
                  replies: comment.replies?.filter(reply => reply._id !== data.commentId) || [],
                  repliesCount: Math.max(0, (comment.repliesCount || 0) - 1)
                }
              }
              return comment
            })
          } else {
            // Remove top-level comment
            const filtered = prev.filter(comment => comment._id !== data.commentId)
            
            // Update comment count
            if (onCommentCountChange && filtered.length < prev.length) {
              setTotalComments(prev => Math.max(0, prev - 1))
              onCommentCountChange(prev => Math.max(0, prev - 1))
            }
            
            return filtered
          }
        })
      }
    }

    // Listen for comment likes
    const handleCommentLiked = (data) => {
      if (data.threadId === threadId) {
        setComments(prev => prev.map(comment => {
          if (comment._id === data.commentId) {
            return { ...comment, isLiked: data.isLiked, likesCount: data.likesCount }
          }
          // Also update in replies
          if (comment.replies) {
            comment.replies = comment.replies.map(reply => {
              if (reply._id === data.commentId) {
                return { ...reply, isLiked: data.isLiked, likesCount: data.likesCount }
              }
              return reply
            })
          }
          return comment
        }))
      }
    }

    socket.on('joined_thread', handleJoinedThread)
    socket.on('new_comment', handleNewComment)
    socket.on('new_comment_broadcast', handleBroadcastComment)
    socket.on('comment_deleted', handleCommentDeleted)
    socket.on('comment_liked', handleCommentLiked)

    console.log('✅ WebSocket event listeners registered for thread:', threadId);

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up WebSocket listeners for thread:', threadId);
      socket.emit('leave_thread', threadId)
      socket.off('joined_thread', handleJoinedThread)
      socket.off('new_comment', handleNewComment)
      socket.off('new_comment_broadcast', handleBroadcastComment)
      socket.off('comment_deleted', handleCommentDeleted)
      socket.off('comment_liked', handleCommentLiked)
    }
  }, [socket, threadId, onCommentCountChange])

  const handleCreateComment = async (content, files, parentId = null) => {
    try {
      await commentApi.createComment({
        threadId,
        content,
        parentId,
        files
      }, token)

      // Comment will be added via WebSocket event
      setReplyingTo(null)
      setShowComposer(false)
    } catch (err) {
      console.error('Create comment failed', err)
      throw err
    }
  }

  const handleDeleteComment = async (commentId, parentId = null) => {
    if (!confirm('Xóa bình luận này?')) return

    try {
      await commentApi.deleteComment(commentId, token)
      // Comment will be removed via WebSocket event
    } catch (err) {
      console.error('Delete comment failed', err)
    }
  }

  const handleToggleLike = async (commentId) => {
    try {
      await commentApi.toggleLike(commentId, token)
      // Like status will be updated via WebSocket event
    } catch (err) {
      console.error('Toggle like failed', err)
    }
  }

  const loadMoreComments = () => {
    if (!loadingMore && hasMore) {
      loadComments(page + 1, true)
    }
  }

  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev)
      if (newSet.has(commentId)) {
        newSet.delete(commentId)
      } else {
        newSet.add(commentId)
      }
      return newSet
    })
  }

  return (
    <div className="space-y-4">
      {/* WebSocket Connection Status */}
      {!connected && (
        <div className="text-center py-2">
          <div className="inline-flex items-center gap-2 text-xs text-[color:var(--muted)] bg-white/60 px-3 py-1 rounded-full border" style={{borderColor:'var(--panel-border)'}}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{background:'var(--pet-accent)'}}></div>
            Đang kết nối...
          </div>
        </div>
      )}
      
      {/* Comments List */}
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
          <span className="ml-2 text-xs muted">Đang tải bình luận...</span>
        </div>
      ) : error ? (
        <div className="text-center py-4">
          <p className="text-xs text-red-500">{error}</p>
          <button 
            onClick={() => loadComments(1)}
            className="mt-1 text-xs px-2 py-1 rounded bg-violet-600 text-white hover:bg-violet-500"
          >
            Thử lại
          </button>
        </div>
      ) : comments.length === 0 ? (
        // Không hiển thị gì khi chưa có comments để giao diện gọn gàng hơn
        null
      ) : (
        <>
          {comments.map(comment => (
            <CommentItem
              key={comment._id}
              comment={comment}
              onReply={(commentId) => setReplyingTo(commentId)}
              onDelete={handleDeleteComment}
              onToggleLike={handleToggleLike}
              onLoadReplies={toggleReplies}
              expandedReplies={expandedReplies}
              user={user}
              token={token}
              isTemporary={comment.isTemporaryReply}
            />
          ))}
          
          {hasMore && (
            <div className="text-center">
              <button
                onClick={loadMoreComments}
                disabled={loadingMore}
                className="btn-lux text-sm disabled:opacity-50"
              >
                {loadingMore ? 'Đang tải...' : `Hiển thị thêm bình luận (còn ${totalComments - comments.length})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Comment Item Component
function CommentItem({ comment, onReply, onDelete, onToggleLike, onLoadReplies, expandedReplies, user, token, isTemporary = false }) {
  const [signed, setSigned] = useState({})
  const [loadingIdx, setLoadingIdx] = useState({})
  const [errorIdx, setErrorIdx] = useState({})
  const [showReplyComposer, setShowReplyComposer] = useState(false)
  const [loadingReplies, setLoadingReplies] = useState(false)
  const [replies, setReplies] = useState(comment.replies || [])
  const [repliesPage, setRepliesPage] = useState(1)
  const [hasMoreReplies, setHasMoreReplies] = useState(false)
  const [totalReplies, setTotalReplies] = useState(comment.repliesCount || 0)

  const isOwner = user && comment.author && comment.author._id === user._id
  const hasReplies = (comment.repliesCount || 0) > 0
  const isExpanded = expandedReplies.has(comment._id)
  const showReplies = replies.length > 0

  // Update replies when comment.replies changes (from WebSocket updates)
  useEffect(() => {
    console.log('🔄 CommentItem: Updating replies from prop changes:', comment.replies?.length || 0);
    setReplies(comment.replies || [])
    setTotalReplies(comment.repliesCount || 0)
    // Check if we need to show "load more" for replies
    setHasMoreReplies((comment.repliesCount || 0) > (comment.replies || []).length)
  }, [comment.replies, comment.repliesCount])

  const fetchSigned = useCallback(async (i) => {
    if (signed[i] || loadingIdx[i]) return
    setLoadingIdx((s) => ({ ...s, [i]: true }))
    try {
      const res = await api.get(`/media/comment/${comment._id}/${i}`, token)
      const url = res.data.data.url
      setSigned((s) => ({ ...s, [i]: url }))
    } catch (e) {
      console.error("Fetch signed failed", e)
      setErrorIdx((s) => ({ ...s, [i]: true }))
    } finally {
      setLoadingIdx((s) => ({ ...s, [i]: false }))
    }
  }, [signed, loadingIdx, comment._id, token])

  // Preload images
  useEffect(() => {
    if (comment.media?.length) {
      comment.media.forEach((m, i) => {
        if (m.type === "image") fetchSigned(i)
      })
    }
  }, [comment.media, fetchSigned])

  const handleLoadReplies = async () => {
    if (showReplies) {
      onLoadReplies(comment._id)
      return
    }

    try {
      setLoadingReplies(true)
      const response = await commentApi.getReplies(comment._id, 1, 3, token) // Load first 3 replies
      const loadedReplies = response.data.data || []
      setReplies(loadedReplies)
      setRepliesPage(1)
      setHasMoreReplies(response.data.pagination?.total > 3)
      onLoadReplies(comment._id)
    } catch (err) {
      console.error('Load replies failed', err)
    } finally {
      setLoadingReplies(false)
    }
  }

  const handleLoadMoreReplies = async () => {
    try {
      setLoadingReplies(true)
      const nextPage = repliesPage + 1
      const response = await commentApi.getReplies(comment._id, nextPage, 3, token) // Load 3 more replies
      const moreReplies = response.data.data || []
      setReplies(prev => [...prev, ...moreReplies])
      setRepliesPage(nextPage)
      setHasMoreReplies(response.data.pagination?.page < response.data.pagination?.pages)
    } catch (err) {
      console.error('Load more replies failed', err)
    } finally {
      setLoadingReplies(false)
    }
  }

  const handleDeleteReply = (replyId) => {
    setReplies(prev => prev.filter(reply => reply._id !== replyId))
  }

  // Helper function để render comment content với highlight @mentions
  const renderCommentContent = (content) => {
    if (!content) return null
    
    // Regex để tìm @username (bắt đầu bằng @ và theo sau bởi alphanumeric characters)
    const mentionRegex = /@(\w+)/g
    const parts = content.split(mentionRegex)
    
    return parts.map((part, index) => {
      // Nếu index lẻ thì đây là username được mention
      if (index % 2 === 1) {
        return (
          <span 
            key={index} 
            className="text-violet-600 font-medium"
            style={{ color: '#7c3aed' }}
          >
            @{part}
          </span>
        )
      }
      return part
    })
  }

  return (
    <div 
      className={`border-l-2 pl-4 space-y-3 ${isTemporary ? 'border-orange-300 bg-orange-50/30' : 'border-gray-100'}`}
      data-comment-id={comment._id}
    >
      {/* Temporary reply indicator */}
      {isTemporary && (
        <div className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full inline-block">
          💬 Reply đang chờ parent comment được tải
        </div>
      )}
      {/* Comment Header */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-base" style={{ color: "#000" }}>
          {comment.author?.username || "Unknown"}
        </span>
        {comment.author?.isPro && <ProBadge />}
        <span className="text-xs muted">{new Date(comment.createdAt).toLocaleString("vi-VN")}</span>
        {isOwner && (
          <button
            onClick={() => onDelete(comment._id)}
            className="ml-auto text-xs px-2 py-1 rounded text-red-600 hover:bg-red-50"
          >
            Xóa
          </button>
        )}
      </div>

      {/* Comment Content */}
      <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#2b1b22" }}>
        {renderCommentContent(comment.content)}
      </div>

      {/* Comment Media */}
      {comment.media && comment.media.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {comment.media.map((media, i) => {
            const url = signed[i]
            const loading = loadingIdx[i]
            const error = errorIdx[i]

            if (media.type === "image") {
              return (
                <div key={i} className="w-24 h-24 rounded overflow-hidden border border-gray-200">
                  {!url && !error && (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                    </div>
                  )}
                  {error && (
                    <div className="w-full h-full flex items-center justify-center text-xs text-red-500">
                      Lỗi
                    </div>
                  )}
                  {url && (
                    <img
                      src={url}
                      alt="Comment media"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )
            }

            if (media.type === "video") {
              return (
                <div key={i} className="w-32 h-24 rounded overflow-hidden border border-gray-200">
                  {!url && !error && (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50 text-xs">
                      Video
                    </div>
                  )}
                  {error && (
                    <div className="w-full h-full flex items-center justify-center text-xs text-red-500">
                      Lỗi
                    </div>
                  )}
                  {url && (
                    <video
                      src={url}
                      controls
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )
            }

            if (media.type === "audio") {
              return (
                <div key={i} className="w-48 h-12 rounded border border-gray-200 p-2">
                  {!url && !error && (
                    <div className="text-xs text-gray-500">Audio</div>
                  )}
                  {error && (
                    <div className="text-xs text-red-500">Lỗi</div>
                  )}
                  {url && (
                    <audio controls src={url} className="w-full h-full" />
                  )}
                </div>
              )
            }

            return (
              <div key={i} className="w-24 h-24 rounded border border-gray-200 flex items-center justify-center text-xs text-gray-500">
                File
              </div>
            )
          })}
        </div>
      )}

      {/* Comment Actions */}
      <div className="flex items-center gap-4 text-xs">
        <button
          onClick={() => onToggleLike(comment._id)}
          className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 ${
            comment.isLiked ? 'text-red-500' : 'text-gray-500'
          }`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill={comment.isLiked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          {comment.likesCount || 0}
        </button>
        
        <button
          onClick={() => setShowReplyComposer(!showReplyComposer)}
          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 text-gray-500"
        >
          <svg
            width="14"
            height="14"
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
          Trả lời
        </button>

        {hasReplies && (
          <button
            onClick={handleLoadReplies}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 text-gray-500"
          >
            {loadingReplies ? (
              <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full"></div>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points={isExpanded ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}></polyline>
              </svg>
            )}
            {isExpanded ? 'Ẩn' : 'Xem'} {comment.repliesCount || 0} phản hồi{(comment.repliesCount || 0) > 1 ? '' : ''}
          </button>
        )}
      </div>

      {/* Reply Input */}
      {showReplyComposer && (
        <ReplyInput
          threadId={comment.threadId}
          parentId={comment._id}
          parentComment={comment}
          onCancel={() => setShowReplyComposer(false)}
          placeholder={`Trả lời ${comment.author?.username}...`}
        />
      )}

      {/* Replies */}
      {isExpanded && showReplies && (
        <div className="ml-4 space-y-2">
          {replies.map(reply => (
            <CommentItem
              key={reply._id}
              comment={reply}
              onReply={() => {}} // No nested replies for now
              onDelete={handleDeleteReply}
              onToggleLike={onToggleLike}
              onLoadReplies={() => {}}
              expandedReplies={new Set()}
              user={user}
              token={token}
            />
          ))}
          
          {/* Show more replies button */}
          {hasMoreReplies && (
            <div className="text-center mt-2">
              <button
                onClick={handleLoadMoreReplies}
                disabled={loadingReplies}
                className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-600"
              >
                {loadingReplies ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full"></div>
                    Đang tải...
                  </div>
                ) : (
                  `Hiển thị thêm ${(comment.repliesCount || 0) - replies.length} phản hồi`
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

