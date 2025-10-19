import React, { useEffect, useState } from 'react';
import { api } from '../../utils/api.js';
import { useAuth } from '../../state/auth.jsx';

// Modal component để hiển thị chi tiết thread
const ThreadDetailModal = ({ thread, isOpen, onClose, onUpdate }) => {
  const { token } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

  useEffect(() => {
    if (thread) {
      setEditedContent(thread.content);
    }
  }, [thread]);

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type: '', message: '' });
    }, 3000);
  };

  const handleSaveEdit = async () => {
    if (!editedContent.trim()) {
      showNotification('error', 'Nội dung không được để trống!');
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.patch(`/admin/threads/${thread._id}`, {
        content: editedContent
      }, token);
      
      if (response.data.success) {
        showNotification('success', 'Cập nhật nội dung thành công!');
        setIsEditing(false);
        if (onUpdate) onUpdate();
      } else {
        showNotification('error', 'Lỗi: ' + response.data.message);
      }
    } catch (error) {
      showNotification('error', 'Lỗi khi cập nhật: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedContent(thread.content);
    setIsEditing(false);
  };

  const handleDeleteThread = async () => {
    setIsSaving(true);
    try {
      const response = await api.delete(`/admin/threads/${thread._id}`, token);
      
      if (response.data.success) {
        showNotification('success', 'Xóa bài viết thành công!');
        setShowDeleteConfirm(false);
        onClose();
        if (onUpdate) onUpdate();
      } else {
        showNotification('error', 'Lỗi: ' + response.data.message);
      }
    } catch (error) {
      showNotification('error', 'Lỗi khi xóa: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };



  if (!isOpen || !thread) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto w-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4 border-b pb-4">
            <h2 className="text-xl font-bold text-gray-800">📖 Chi tiết bài viết</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Thread ID */}
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <span className="text-sm text-gray-600">Thread ID: </span>
            <span className="font-mono text-sm">{thread._id}</span>
          </div>

          {/* Full Content */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-700">📄 Nội dung đầy đủ:</h3>
            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                  placeholder="Nhập nội dung bài viết..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 transition-colors"
                  >
                    {isSaving ? '⏳ Đang lưu...' : '✅ Lưu thay đổi'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 transition-colors"
                  >
                    ❌ Hủy
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg border">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{editedContent}</p>
              </div>
            )}
          </div>

          {/* Author Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-700">👤 Thông tin tác giả:</h3>
            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
              <div>
                <span className="text-sm text-gray-600">Username:</span>
                <p className="font-medium">{thread.author?.username || 'N/A'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Email:</span>
                <p className="font-medium">{thread.author?.email || 'N/A'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Admin:</span>
                <p className="font-medium">
                  {thread.author?.isAdmin ? '✅ Có' : '❌ Không'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Pro User:</span>
                <p className="font-medium">
                  {thread.author?.isPro ? '💎 Có' : '👤 Không'}
                </p>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-700">📊 Thống kê:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-green-50 rounded-lg">
              <div>
                <span className="text-sm text-gray-600">Độ dài:</span>
                <p className="font-medium">{thread.stats?.contentLength || thread.content?.length || 0} ký tự</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Media:</span>
                <p className="font-medium">{thread.stats?.mediaCount || thread.media?.length || 0} files</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Tạo lúc:</span>
                <p className="font-medium text-xs">{new Date(thread.createdAt).toLocaleString('vi-VN')}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Tạo cách đây:</span>
                <p className="font-medium">{thread.stats?.createdAgo || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Content Analysis */}
          {thread.content && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 text-gray-700">🔍 Phân tích nội dung:</h3>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Loại:</span>
                    <span className="ml-2 font-medium">
                      {/javascript|python|react|node|api|function|class|import|mongodb|database/i.test(thread.content) 
                        ? '💻 Kỹ thuật/Lập trình' 
                        : '💬 Thảo luận chung'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Ngôn ngữ:</span>
                    <span className="ml-2 font-medium">
                      {/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(thread.content)
                        ? '🇻🇳 Tiếng Việt'
                        : '🇺🇸 Tiếng Anh'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Links:</span>
                    <span className="ml-2 font-medium">
                      {/https?:\/\/|www\./i.test(thread.content) ? '⚠️ Có chứa link' : '✅ Không có link'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Spam Risk:</span>
                    <span className="ml-2 font-medium">
                      {/spam|quảng cáo|bán hàng|kiếm tiền/i.test(thread.content) ? '🚨 Cao' : '✅ Thấp'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Admin Actions */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">🎯 Hành động admin:</h3>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setIsEditing(!isEditing)}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {isEditing ? '👁️ Xem bài viết' : '📝 Sửa nội dung'}
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSaving}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                🗑️ Xóa bài viết
              </button>
            </div>
          </div>


        </div>

        {/* Notification */}
        {notification.show && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
            notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            <div className="flex items-center">
              <span className="mr-2">
                {notification.type === 'success' ? '✅' : '❌'}
              </span>
              <span>{notification.message}</span>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="text-center">
                <div className="text-6xl mb-4">🗑️</div>
                <h3 className="text-lg font-semibold mb-2">Xác nhận xóa bài viết</h3>
                <p className="text-gray-600 mb-6">
                  Bạn có chắc chắn muốn xóa bài viết này không?<br/>
                  <span className="font-medium text-red-600">Hành động này không thể hoàn tác!</span>
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isSaving}
                    className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleDeleteThread}
                    disabled={isSaving}
                    className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    {isSaving ? '⏳ Đang xóa...' : '🗑️ Xác nhận xóa'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
};

export default function Threads(){
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('content'); // content, author, id
  const [err, setErr] = useState('');
  const [selectedThread, setSelectedThread] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = async()=>{
    try{ 
      const res = await api.get('/admin/threads', token); 
      setItems(res.data.data);
      setFilteredItems(res.data.data); // Initialize filtered items
    }catch(e){ 
      setErr(e.message);
    } 
  };

  // Search function
  const handleSearch = (term, type) => {
    setSearchTerm(term);
    setSearchType(type);
    
    if (!term.trim()) {
      setFilteredItems(items);
      return;
    }

    const filtered = items.filter(thread => {
      const searchLower = term.toLowerCase();
      
      switch(type) {
        case 'content':
          return thread.content?.toLowerCase().includes(searchLower);
        case 'author':
          return thread.author?.username?.toLowerCase().includes(searchLower) || 
                 thread.author?.email?.toLowerCase().includes(searchLower);
        case 'id':
          return thread._id?.toLowerCase().includes(searchLower);
        default:
          return thread.content?.toLowerCase().includes(searchLower);
      }
    });

    setFilteredItems(filtered);
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setFilteredItems(items);
  };

  useEffect(()=>{ load(); }, [token]);
  
  // Update filtered items when items change
  useEffect(() => {
    if (searchTerm) {
      handleSearch(searchTerm, searchType);
    } else {
      setFilteredItems(items);
    }
  }, [items]);

  const del = async(id)=>{
    // Sử dụng modal confirmation thay vì confirm() - sẽ cập nhật sau
    if (!window.confirm('Xóa bài viết này?')) return;
    try{ await api.del(`/admin/threads/${id}`, token); await load(); }catch(e){ console.error('Delete error:', e.message); }
  };

  // Function để lấy chi tiết thread
  const viewDetail = async(threadId) => {
    setLoadingDetail(true);
    try {
      const res = await api.get(`/admin/threads/${threadId}`, token);
      setSelectedThread(res.data.data);
      setIsModalOpen(true);
    } catch (e) {
      console.error('Không thể tải chi tiết:', e.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedThread(null);
  };

  return (
    <div className="card p-4 overflow-auto">
      {err && <div className="text-red-500 mb-2">{err}</div>}
      
      {/* Search Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">🔍 Tìm kiếm bài viết</h3>
        
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Type Selector */}
          <select
            value={searchType}
            onChange={(e) => {
              setSearchType(e.target.value);
              if (searchTerm) {
                handleSearch(searchTerm, e.target.value);
              }
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="content">📝 Nội dung</option>
            <option value="author">👤 Tác giả</option>
            <option value="id">🆔 Thread ID</option>
          </select>

          {/* Search Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value, searchType)}
              placeholder={
                searchType === 'content' ? 'Tìm theo nội dung bài viết...' :
                searchType === 'author' ? 'Tìm theo username hoặc email...' :
                'Tìm theo Thread ID...'
              }
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              🔍
            </div>
          </div>

          {/* Clear Button */}
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              ❌ Xóa
            </button>
          )}
        </div>

        {/* Search Results Info */}
        <div className="mt-3 text-sm text-gray-600">
          {searchTerm ? (
            <>
              🔍 Tìm thấy <span className="font-medium text-blue-600">{filteredItems.length}</span> kết quả 
              cho "<span className="font-medium">{searchTerm}</span>" 
              trong <span className="font-medium">{searchType === 'content' ? 'nội dung' : searchType === 'author' ? 'tác giả' : 'Thread ID'}</span>
            </>
          ) : (
            <>📊 Hiển thị tất cả <span className="font-medium text-green-600">{items.length}</span> bài viết</>
          )}
        </div>
      </div>

      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="p-2 text-black font-semibold">Tác giả</th>
            <th className="p-2 text-black font-semibold">Nội dung</th>
            <th className="p-2 text-black font-semibold">Media</th>
            <th className="p-2 text-black font-semibold">Thời gian</th>
            <th className="p-2 text-black font-semibold">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.length === 0 ? (
            <tr>
              <td colSpan="5" className="p-8 text-center text-gray-500">
                {searchTerm ? (
                  <div>
                    <div className="text-4xl mb-2">🔍</div>
                    <div>Không tìm thấy bài viết nào khớp với "{searchTerm}"</div>
                    <button 
                      onClick={clearSearch}
                      className="mt-2 px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      Xem tất cả bài viết
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-2">📄</div>
                    <div>Không có bài viết nào</div>
                  </div>
                )}
              </td>
            </tr>
          ) : (
            filteredItems.map(t=> (
              <tr key={t._id} className="border-t border-[var(--panel-border)]">
                <td className="p-2">{t.author?.username || '—'}</td>
                <td className="p-2 max-w-[360px] truncate">
                  {/* Highlight search term in content */}
                  {searchTerm && searchType === 'content' ? (
                    <span dangerouslySetInnerHTML={{
                      __html: t.content.replace(
                        new RegExp(`(${searchTerm})`, 'gi'),
                        '<mark style="background: yellow; padding: 1px 2px; border-radius: 2px;">$1</mark>'
                      )
                    }} />
                  ) : (
                    t.content
                  )}
                </td>
                <td className="p-2">{t.media?.length||0}</td>
                <td className="p-2 whitespace-nowrap">{new Date(t.createdAt).toLocaleString()}</td>
                <td className="p-2 space-x-1">
                  <button 
                    onClick={() => viewDetail(t._id)}
                    disabled={loadingDetail}
                    className="px-2 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {loadingDetail ? '⏳' : '👁️'} Xem chi tiết
                  </button>
                  <button 
                    onClick={() => del(t._id)} 
                    className="px-2 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >
                    🗑️ Xóa
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Thread Detail Modal */}
      <ThreadDetailModal 
        thread={selectedThread}
        isOpen={isModalOpen}
        onClose={closeModal}
        onUpdate={load}
      />
    </div>
  );
}
