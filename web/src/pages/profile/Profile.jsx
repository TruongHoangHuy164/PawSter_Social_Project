import React, { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "../../state/auth.jsx";
import { api, threadApi } from "../../utils/api.js";
import ThreadItem from "../../ui/ThreadItem.jsx";
import RepostItem from "../../ui/RepostItem.jsx";

/* UI-ONLY profile redesign: cover image (local), avatar (local), bio, website, tabs. */

const TABS = [
  { key: "threads", label: "Paw" },
  { key: "replies", label: "Paw trả lời" },
  { key: "media", label: "File phương tiện" },
  { key: "favorites", label: "Paw yêu thích" },
];

export default function Profile() {
  const { user, setUser, token } = useAuth();
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [cover, setCover] = useState(null); // preview (if changed)
  const [avatar, setAvatar] = useState(null); // preview (if changed)
  const [remoteAvatar, setRemoteAvatar] = useState(null); // existing signed URL
  const [remoteCover, setRemoteCover] = useState(null);
  const avatarFileRef = useRef(null);
  const coverFileRef = useRef(null);
  const [activeTab, setActiveTab] = useState("threads");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [threads, setThreads] = useState([]);
  const [reposts, setReposts] = useState([]);
  const [comments, setComments] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [repostsLoaded, setRepostsLoaded] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [showEdit, setShowEdit] = useState(false);


  const proExpiryStr = React.useMemo(() => {
    if (!user?.proExpiry) return "";
    try {
      const d = new Date(user.proExpiry);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleString("vi-VN");
    } catch {
      return "";
    }
  }, [user?.proExpiry]);

  // Fetch threads and reposts for the Paw tab
  React.useEffect(() => {
    if (!token || !user || loaded) return;
    (async () => {
      try {
        // Fetch both threads and reposts
        const [threadsRes, repostsRes] = await Promise.all([
          api.get(`/threads?author=${user._id}`, token),
          threadApi.getReposts(user._id, token)
        ]);
        
        // Keep threads as original threads only - filter to ensure only user's threads
        const userThreads = (threadsRes.data.data || []).filter(thread => 
          thread.author && thread.author._id === user._id
        );
        
        console.log('Profile threads loaded:', {
          total: threadsRes.data.data?.length || 0,
          filtered: userThreads.length,
          userId: user._id,
          sample: userThreads.slice(0, 2).map(t => ({
            id: t._id,
            authorId: t.author?._id,
            content: t.content?.slice(0, 30)
          }))
        });
        
        setThreads(userThreads);
        
        // Keep reposts separate with isRepost flag for display
        const userReposts = (repostsRes.data.data || [])
          .filter(thread => {
            // Only include if this is actually a repost (has repostedBy or repostedAt)
            return thread.repostedBy || thread.repostedAt || thread.isRepost;
          })
          .map(thread => ({
            ...thread,
            isRepost: true
          }));
        
        console.log('Profile reposts loaded:', {
          total: repostsRes.data.data?.length || 0,
          filtered: userReposts.length,
          sample: userReposts.slice(0, 2).map(r => ({
            id: r._id,
            repostedBy: r.repostedBy?.username,
            repostedAt: r.repostedAt,
            hasIsRepost: r.isRepost
          }))
        });
        
        // Also check localStorage for any local reposts
        const localStorageReposts = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(`repost_repost_${user._id}_`)) {
            try {
              const repostData = JSON.parse(localStorage.getItem(key) || '{}');
              if (repostData.repostTimestamp) {
                // Find the original thread - this could be any thread, not just user's threads
                const originalThreadId = key.replace(`repost_repost_${user._id}_`, '');
                // We need to fetch this thread separately since it might not be user's thread
                // For now, skip localStorage reposts in profile view to avoid showing others' threads
                console.log('Skipping localStorage repost to avoid showing others threads:', originalThreadId);
              }
            } catch (e) {
              console.error('Error parsing localStorage repost:', e);
            }
          }
        }
        
        console.log('LocalStorage reposts found:', localStorageReposts.length);
        
        // Only use backend reposts for now (localStorage reposts might reference others' threads)
        setReposts(userReposts);
        
        setLoaded(true);
        setRepostsLoaded(true);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [token, user, loaded]);

  // Fetch comments when replies tab is active
  React.useEffect(() => {
    if (!token || !user || activeTab !== "replies" || commentsLoaded) return;
    (async () => {
      try {
        const res = await api.get(`/comments/user/${user._id}`, token);
        setComments(res.data.data || []);
        setCommentsLoaded(true);
      } catch (e) {
        console.error("Failed to fetch comments:", e);
      }
    })();
  }, [token, user, activeTab, commentsLoaded]);

  // Fetch favorites when favorites tab is active
  React.useEffect(() => {
    if (!token || !user || activeTab !== "favorites" || favoritesLoaded) return;
    (async () => {
      try {
        const res = await threadApi.getFavorites(user._id, token);
        setFavorites(res.data.data || []);
        setFavoritesLoaded(true);
      } catch (e) {
        console.error("Failed to fetch favorites:", e);
      }
    })();
  }, [token, user, activeTab, favoritesLoaded]);

  const mediaThreads = useMemo(
    () => threads.filter((t) => t.media && t.media.length > 0),
    [threads]
  );

  const handleFile = (e, setFn) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => setFn(ev.target.result);
    r.readAsDataURL(f);
  };

  // fetch profile from backend (includes signed URLs)
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await api.get("/users/me/profile", token);
        const d = res.data.data;
        setUsername(d.username);
        setBio(d.bio || "");
        setWebsite(d.website || "");
        setRemoteAvatar(d.avatarUrl || null);
        setRemoteCover(d.coverUrl || null);
        // update auth user base fields (username maybe changed elsewhere)
        setUser((u) => ({
          ...(u || {}),
          username: d.username,
          avatarKey: d.avatarKey,
          coverKey: d.coverKey,
          bio: d.bio,
          website: d.website,
          friends: d.friends,
          friendLimit: d.friendLimit,
          isPro: d.isPro,
          // Keep auth header avatar in sync with Profile signed URL
          avatarUrl: d.avatarUrl || (u && u.avatarUrl) || null,
          coverUrl: d.coverUrl || (u && u.coverUrl) || null,
        }));
      } catch (e) {
        console.error("Profile fetch failed", e);
      }
    })();
  }, [token, setUser]);

  const buildFile = (inputRef) => inputRef.current?.files?.[0] || null;

  const saveProfile = async () => {
    setSaving(true);
    setMsg("");
    try {
      const form = new FormData();
      form.append("username", username);
      form.append("bio", bio);
      form.append("website", website);
      const avFile = buildFile(avatarFileRef);
      if (avFile) form.append("avatar", avFile);
      const cvFile = buildFile(coverFileRef);
      if (cvFile) form.append("cover", cvFile);
      const res = await api.rawPatch("/users/me/profile", form, token);
      const d = res.data.data;
      setRemoteAvatar(d.avatarUrl || null);
      setRemoteCover(d.coverUrl || null);
      setUser((u) => ({
        ...(u || {}),
        username: d.username,
        avatarKey: d.avatarKey,
        coverKey: d.coverKey,
        bio: d.bio,
        website: d.website,
        // Update signed URLs so header avatar updates instantly
        avatarUrl: d.avatarUrl || (u && u.avatarUrl) || null,
        coverUrl: d.coverUrl || (u && u.coverUrl) || null,
      }));
      setMsg("Đã lưu");
    } catch (e) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="w-full mx-auto p-4 space-y-6 page-panel">
      {/* COVER SECTION */}
      <div className="relative h-56 rounded-3xl overflow-hidden border-2 border-black/10 dark:border-white/10 bg-neutral-100 dark:bg-neutral-900 shadow-lg">
        {cover ? (
          <img src={cover} alt="cover" className="object-cover w-full h-full" />
        ) : remoteCover ? (
          <img
            src={remoteCover}
            alt="cover"
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <svg
                className="w-16 h-16 mx-auto text-neutral-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm text-neutral-500 font-medium">
                Chưa có ảnh bìa
              </span>
            </div>
          </div>
        )}
        <label className="absolute top-4 right-4 px-4 py-2 rounded-xl cursor-pointer backdrop-blur-md bg-white/90 dark:bg-black/90 border border-black/10 dark:border-white/10 text-sm font-semibold shadow-lg hover:scale-105 transition-transform duration-200">
          📷 Đổi bìa
          <input
            ref={coverFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e, setCover)}
          />
        </label>
      </div>
      {/* AVATAR overlaps */}
      <div className="relative px-4 -mt-20 flex items-end gap-6">
        <div className="relative group">
          <div className="w-36 h-36 rounded-full ring-4 ring-white dark:ring-neutral-900 bg-white dark:bg-neutral-800 overflow-hidden flex items-center justify-center shadow-2xl relative border-4 border-white/50 dark:border-black/50">
            {avatar ? (
              <img
                src={avatar}
                alt="avatar"
                className="object-cover w-full h-full"
              />
            ) : remoteAvatar ? (
              <img
                src={remoteAvatar}
                alt="avatar"
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="text-neutral-400 text-4xl font-bold">
                {user.username?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </div>
          <label className="absolute bottom-2 right-2 w-10 h-10 rounded-full cursor-pointer backdrop-blur-md bg-white/90 dark:bg-black/90 border-2 border-white dark:border-black shadow-lg flex items-center justify-center hover:scale-110 transition-transform duration-200">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <input
              ref={avatarFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e, setAvatar)}
            />
          </label>
        </div>
        <div className="pb-4 flex-1 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold">{user.username}</span>
            {user.isPro && (
              <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border-2 border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 font-bold backdrop-blur-sm">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>PRO</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowEdit((v) => !v)}
              title="Chỉnh sửa hồ sơ"
              className="ml-1 px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 text-sm font-bold bg-white/50 dark:bg-black/50 hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </button>
          </div>
          <div className="text-neutral-500 text-sm font-medium">
            @{user.username}
          </div>

          {bio && (
            <div className="text-sm text-neutral-700 dark:text-neutral-300 font-medium whitespace-pre-wrap">
              {bio}
            </div>
          )}
          {website && (
            <div className="text-sm font-semibold">
              <span className="text-neutral-500 mr-1">Website:</span>
              <a
                className="text-black dark:text-white hover:underline"
                target="_blank"
                rel="noreferrer"
                href={website}
              >
                {website}
              </a>
            </div>
          )}

          {/* Stats Cards */}
          <div className="flex flex-wrap gap-3 mt-2">
            <div className="px-4 py-2 rounded-xl bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 backdrop-blur-sm">
              <div className="text-xs text-neutral-500 font-medium">
                Người theo dõi
              </div>
              <div className="text-lg font-bold">
                {user.followers?.length || 0}
              </div>
            </div>
            <div className="px-4 py-2 rounded-xl bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 backdrop-blur-sm">
              <div className="text-xs text-neutral-500 font-medium">
                Đang theo dõi
              </div>
              <div className="text-lg font-bold">
                {user.following?.length || 0}
              </div>
            </div>
            <div className="px-4 py-2 rounded-xl bg-white/50 dark:bg-black/50 border border-black/10 dark:border-white/10 backdrop-blur-sm">
              <div className="text-xs text-neutral-500 font-medium">Bạn bè</div>
              <div className="text-lg font-bold">
                {user.friends?.length || 0}
                <span className="text-sm text-neutral-400 font-normal">
                  {" "}
                  / {user.friendLimit || 0}
                </span>
              </div>
            </div>
          </div>

          {user.isPro && proExpiryStr && (
            <div className="text-xs text-neutral-500 font-medium mt-2">
              🎯 Pro hết hạn: {proExpiryStr}
            </div>
          )}
        </div>
      </div>
      
      {/* EDIT FIELDS (hidden by default, toggle via ... button) */}
      {showEdit && (
      <div className="bg-white/30 dark:bg-black/30 border-2 border-black/10 dark:border-white/10 rounded-3xl p-6 space-y-6 card backdrop-blur-sm shadow-lg">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          Chỉnh sửa hồ sơ
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400 font-bold flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full text-sm rounded-xl bg-white/50 dark:bg-black/50 border-2 border-black/10 dark:border-white/10 focus:ring-2 focus:ring-black/30 dark:focus:ring-white/30 focus:border-transparent px-4 py-3 outline-none font-medium transition-all duration-200"
            />
          </div>
          <div className="space-y-3">
            <label className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400 font-bold flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
              Website
            </label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
              className="w-full text-sm rounded-xl bg-white/50 dark:bg-black/50 border-2 border-black/10 dark:border-white/10 focus:ring-2 focus:ring-black/30 dark:focus:ring-white/30 focus:border-transparent px-4 py-3 outline-none font-medium transition-all duration-200"
            />
          </div>
          <div className="space-y-3 md:col-span-2">
            <label className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400 font-bold flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                />
              </svg>
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full resize-none text-sm rounded-xl bg-white/50 dark:bg-black/50 border-2 border-black/10 dark:border-white/10 focus:ring-2 focus:ring-black/30 dark:focus:ring-white/30 focus:border-transparent px-4 py-3 outline-none font-medium transition-all duration-200"
              placeholder="Giới thiệu ngắn về bạn..."
            />
          </div>
        </div>
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-3">
            <button
              disabled={saving}
              onClick={saveProfile}
              className="px-8 py-3.5 rounded-xl bg-black dark:bg-white text-white dark:text-black disabled:opacity-50 text-sm font-bold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
            <button
              disabled={saving}
              onClick={() => {
                // Reset form to original values
                setUsername(user?.username || "");
                setBio(user?.bio || "");
                setWebsite(user?.website || "");
                setCover(null);
                setAvatar(null);
                setShowEdit(false);
                setMsg("");
                // Clear file inputs
                if (avatarFileRef.current) avatarFileRef.current.value = "";
                if (coverFileRef.current) coverFileRef.current.value = "";
              }}
              className="px-6 py-3.5 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 disabled:opacity-50 text-sm font-bold hover:bg-neutral-300 dark:hover:bg-neutral-700 transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Huỷ
            </button>
          </div>
          {msg && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
              <svg
                className="w-4 h-4 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm text-green-600 dark:text-green-400 font-semibold">
                {msg}
              </span>
            </div>
          )}
        </div>
      </div>
      )}
      {/* TABS */}
      <div className="border-b border-black/10 dark:border-white/10 grid grid-cols-4 px-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-2 py-3.5 relative font-bold text-sm flex items-center justify-center gap-1 rounded-t-xl transition-all duration-200 ${
              activeTab === t.key
                ? "text-black dark:text-white bg-black/5 dark:bg-white/5"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            {t.key === "threads" && "📝"}
            {t.key === "replies" && "💬"}
            {t.key === "media" && "📁"}
            {t.key === "reposts" && "🔄"}
            {t.key === "favorites" && "⭐"}
            {t.label}
            {activeTab === t.key && (
              <span className="absolute left-0 right-0 -bottom-px h-1 bg-black dark:bg-white rounded-t" />
            )}
          </button>
        ))}
      </div>
      {/* TAB CONTENT */}
      <div className="space-y-4">
        {activeTab === "threads" &&
          (() => {
            // Combine threads and reposts, then sort by date
            // threads = user's own threads only
            // reposts = threads that user reposted (can be from anyone)
            const combined = [
              // User's own threads
              ...threads.map(t => ({ ...t, isRepost: false })),
              // User's reposts (of others' threads)
              ...reposts.map(r => {
                // Get repost timestamp from localStorage
                const repostId = `repost_${user._id}_${r._id}`;
                const repostData = JSON.parse(localStorage.getItem(`repost_${repostId}`) || '{}');
                const repostTimestamp = repostData.repostTimestamp || r.repostedAt || new Date().toISOString();
                return {
                  ...r,
                  isRepost: true, // Ensure isRepost is true for reposts
                  sortDate: repostTimestamp // Use repost time for sorting
                };
              })
            ].sort((a, b) => {
              const dateA = a.sortDate || a.createdAt;
              const dateB = b.sortDate || b.createdAt;
              return new Date(dateB) - new Date(dateA);
            });
            
            console.log('Profile combined data:', {
              totalCombined: combined.length,
              threads: threads.length,
              reposts: reposts.length,
              combinedSample: combined.slice(0, 3).map(t => ({ 
                id: t._id, 
                isRepost: t.isRepost, 
                title: t.content?.slice(0, 50) 
              }))
            });
            
            return combined.length ? (
              combined.map((t) => (
                t.isRepost ? (
                  <RepostItem 
                    key={`repost_${t.repostId || t._id}`} 
                    repost={t}
                    onDelete={(repostId) => {
                      console.log('Profile: Deleting repost with ID:', repostId);
                      setReposts(prev => {
                        const newReposts = prev.filter(r => {
                          // Check against the actual MongoDB repost ID or formatted ID
                          if (r.repostId && (r.repostId === repostId || repostId.includes(r.repostId))) {
                            console.log('Removing repost from Profile:', r.repostId);
                            return false;
                          }
                          if (r._id === repostId) {
                            console.log('Removing repost from Profile by _id:', r._id);
                            return false;
                          }
                          return true;
                        });
                        console.log('Profile reposts after deletion:', newReposts.length);
                        return newReposts;
                      });
                    }}
                  />
                ) : (
                  <ThreadItem key={`thread_${t._id}`} thread={t} />
                )
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-20 h-20 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-4">
                  <span className="text-4xl">📝</span>
                </div>
                <div className="text-base text-neutral-600 dark:text-neutral-400 font-bold">
                  Chưa có thread
                </div>
                <div className="text-sm text-neutral-500 dark:text-neutral-500 font-medium mt-1">
                  Hãy chia sẻ suy nghĩ của bạn
                </div>
              </div>
            );
          })()}
        {activeTab === "media" &&
          (mediaThreads.length ? (
            mediaThreads.map((t) => <ThreadItem key={t._id} thread={t} />)
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-20 h-20 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-4">
                <span className="text-4xl">📁</span>
              </div>
              <div className="text-base text-neutral-600 dark:text-neutral-400 font-bold">
                Không có media
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-500 font-medium mt-1">
                Chưa có hình ảnh hoặc video nào
              </div>
            </div>
          ))}
        {activeTab === "replies" &&
          (comments.length ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment._id}
                  className="card p-5 space-y-3 rounded-2xl bg-white/50 dark:bg-black/50 border-2 border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 transition-all duration-200"
                >
                  {/* Comment Header */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold flex-shrink-0 ring-2 ring-black/10 dark:ring-white/10">
                      {comment.author?.username?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold">
                          {comment.author?.username || "Unknown"}
                        </span>
                        {comment.author?.isPro && (
                          <span className="text-xs px-2 py-0.5 rounded-md border border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 font-bold">
                            PRO
                          </span>
                        )}
                        <span className="text-xs text-gray-500 font-bold">
                          •
                        </span>
                        <span className="text-xs text-gray-500 font-semibold">
                          {new Date(comment.createdAt).toLocaleString("vi-VN")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Original Thread Context */}
                  {comment.threadId && (
                    <div className="ml-13 pl-4 border-l-2 border-black/20 dark:border-white/20 rounded-l">
                      <div className="text-xs text-neutral-600 dark:text-neutral-400 mb-1 flex items-center gap-2 font-bold">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                        </svg>
                        <span>
                          Trả lời bài viết của{" "}
                          <span className="font-extrabold">
                            {comment.threadId.author?.username || "Unknown"}
                          </span>
                        </span>
                      </div>
                      <div className="text-sm text-neutral-700 dark:text-neutral-300 line-clamp-2 mb-2 font-semibold">
                        {comment.threadId.content}
                      </div>
                    </div>
                  )}

                  {/* Comment Content */}
                  <div className="ml-13">
                    <div className="bg-black/5 dark:bg-white/5 rounded-xl p-4 border border-black/10 dark:border-white/10">
                      <div className="text-sm whitespace-pre-wrap break-words font-medium">
                        {comment.content}
                      </div>

                      {/* Comment Media */}
                      {comment.media && comment.media.length > 0 && (
                        <div
                          className="mt-3 grid gap-2"
                          style={{
                            gridTemplateColumns:
                              comment.media.length === 1
                                ? "1fr"
                                : "repeat(2, 1fr)",
                          }}
                        >
                          {comment.media.map((media, idx) => (
                            <div
                              key={idx}
                              className="rounded-xl overflow-hidden border-2 border-black/10 dark:border-white/10"
                            >
                              {media.type === "image" && (
                                <img
                                  src={`${import.meta.env.VITE_API_URL}/media/${
                                    media.key
                                  }`}
                                  alt="Comment media"
                                  className="w-full h-auto object-cover"
                                />
                              )}
                              {media.type === "video" && (
                                <video
                                  src={`${import.meta.env.VITE_API_URL}/media/${
                                    media.key
                                  }`}
                                  controls
                                  className="w-full h-auto"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Comment Stats */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-neutral-600 dark:text-neutral-400">
                      <div className="flex items-center gap-1.5 font-bold">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill={
                            comment.likesCount > 0 ? "currentColor" : "none"
                          }
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                        <span>{comment.likesCount || 0}</span>
                      </div>
                      {comment.threadId && (
                        <a
                          href={`/thread/${comment.threadId._id}`}
                          className="flex items-center gap-1 underline hover:opacity-80 transition-colors font-bold"
                        >
                          <span>Xem bài viết gốc</span>
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-20 h-20 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-4">
                <span className="text-4xl">💬</span>
              </div>
              <div className="text-base text-neutral-600 dark:text-neutral-400 font-bold">
                Bạn chưa có phản hồi nào
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-500 font-medium mt-1">
                Các bình luận của bạn sẽ hiển thị ở đây
              </div>
            </div>
          ))}

        {activeTab === "favorites" &&
          (favorites.length ? (
            <div className="space-y-4">
              {favorites.map((t) => (
                <div key={t._id} className="space-y-3">
                  <div className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-2 font-bold px-2">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon>
                    </svg>
                    <span>⭐ Bài viết yêu thích</span>
                  </div>
                  <ThreadItem 
                    thread={t} 
                    onDelete={(threadId) => {
                      setFavorites(prev => prev.filter(thread => thread._id !== threadId));
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-20 h-20 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-4">
                <span className="text-4xl">⭐</span>
              </div>
              <div className="text-base text-neutral-600 dark:text-neutral-400 font-bold">
                Bạn chưa có bài viết yêu thích nào
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-500 font-medium mt-1">
                Các bài viết bạn yêu thích sẽ hiển thị ở đây
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
