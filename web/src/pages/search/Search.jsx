import React, { useState } from 'react';
import { api } from '../../utils/api.js';
import { useAuth } from '../../state/auth.jsx';

export default function Search(){
  const { token } = useAuth();
  const [q,setQ] = useState('');
  const [results,setResults] = useState([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState(null);

  const submit = async (e)=>{
    e.preventDefault();
    if(!q.trim()) return;
    setLoading(true); setError(null);
    try {
      // Placeholder: no backend endpoint yet; simulate empty result
      // const res = await api.get(`/search?q=${encodeURIComponent(q)}`, token);
      // setResults(res.data.data);
      setTimeout(()=>{ setResults([]); setLoading(false); }, 400);
    } catch(e){
      setError('Lỗi tìm kiếm'); setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-lg font-semibold">Tìm kiếm</h1>
      <form onSubmit={submit} className="flex gap-2">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Nhập từ khoá..." className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm outline-none focus:border-violet-500" />
        <button className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded text-sm">Tìm</button>
      </form>
      {loading && <div className="text-sm text-neutral-400">Đang tìm...</div>}
      {error && <div className="text-sm text-red-400">{error}</div>}
      {!loading && !error && results.length === 0 && <div className="text-sm text-neutral-500">Không có kết quả</div>}
    </div>
  );
}
