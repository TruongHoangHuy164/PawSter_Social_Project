import React, { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "../../state/auth.jsx";
import { api, threadApi } from "../../utils/api.js";
import ThreadItem from "../../ui/ThreadItem.jsx";

/* UI-ONLY profile redesign: cover image (local), avatar (local), bio, website, tabs. */

const TABS = [
  { key: "threads", label: "Paw" },
  { key: "replies", label: "Paw trả lời" },
  { key: "media", label: "File phương tiện" },
  { key: "reposts", label: "Paw đăng lại" },
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
  const [loaded, setLoaded] = useState(false);
  const [repostsLoaded, setRepostsLoaded] = useState(false);
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

  // Fetch threads once (simple load) for demonstration
  React.useEffect(() => {
    if (!token || loaded) return;
    (async () => {
      try {
        const res = await api.get("/threads", token);
        setThreads(res.data.data || []);
        setLoaded(true);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [token, loaded]);

  // Fetch reposts when reposts tab is active
  React.useEffect(() => {
    if (!token || !user || activeTab !== "reposts" || repostsLoaded) return;
    (async () => {
      try {
        const res = await threadApi.getReposts(user._id, token);
        setReposts(res.data.data || []);
        setRepostsLoaded(true);
      } catch (e) {
        console.error("Failed to fetch reposts:", e);
      }
    })();
  }, [token, user, activeTab, repostsLoaded]);

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
    <div className="max-w-3xl mx-auto p-4 space-y-6 page-panel">
      {/* COVER SECTION */}
      <div className="relative h-44 rounded-xl overflow-hidden border border-white/6 bg-gradient-to-b from-transparent to-transparent flex items-center justify-center text-neutral-600 card">
        {cover ? (
          <img src={cover} alt="cover" className="object-cover w-full h-full" />
        ) : remoteCover ? (
          <img
            src={remoteCover}
            alt="cover"
            className="object-cover w-full h-full"
          />
        ) : (
          <span className="text-sm">Chưa có ảnh bìa</span>
        )}
        <label
          className="absolute top-2 right-2 text-xs px-3 py-1 rounded cursor-pointer"
          style={{
            background: "color-mix(in srgb, var(--panel) 88%, black 6%)",
          }}
        >
          Đổi bìa
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
      <div className="relative pl-2 -mt-16 flex items-end gap-4">
        <div className="w-32 h-32 rounded-full ring-4 ring-neutral-200 bg-white overflow-hidden flex items-center justify-center text-muted text-sm relative">
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
            "No Avatar"
          )}
          <label
            className="absolute bottom-1 right-1 text-[10px] px-2 py-0.5 rounded cursor-pointer"
            style={{
              background: "color-mix(in srgb, var(--panel) 88%, black 6%)",
            }}
          >
            Sửa
            <input
              ref={avatarFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e, setAvatar)}
            />
          </label>
        </div>
        <div className="pb-4 flex-1 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xl font-semibold">
            {user.username}
          </div>
          <div className="text-neutral-400 text-sm">@{user.username}</div>
          <div className="flex gap-4 text-xs text-neutral-400">
            <span>
              <span className="text-neutral-200 font-medium">
                {user.friends?.length || 0}
              </span>{" "}
              người theo dõi
            </span>
            <span>
              <span className="text-neutral-200 font-medium">
                {user.friendLimit || 0}
              </span>{" "}
              giới hạn
            </span>
            {user.isPro && (
              <span className="text-violet-400 flex items-center gap-2">
                <span>PRO</span>
                {proExpiryStr && (
                  <span className="text-neutral-400">
                    (hết hạn: {proExpiryStr})
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
      {/* EDIT FIELDS */}
      <div className="bg-transparent border border-white/6 rounded-lg p-5 space-y-5 card">
        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-neutral-400">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full text-sm rounded bg-white border border-neutral-200 focus:border-[color:var(--accent)] focus:ring-[color:var(--accent)] px-3 py-2 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-neutral-400">
              Website
            </label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
              className="w-full text-sm rounded bg-white border border-neutral-200 focus:border-[color:var(--accent)] focus:ring-[color:var(--accent)] px-3 py-2 outline-none"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs uppercase tracking-wide text-neutral-400">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full resize-none text-sm rounded bg-white border border-neutral-200 focus:border-[color:var(--accent)] focus:ring-[color:var(--accent)] px-3 py-2 outline-none"
              placeholder="Giới thiệu ngắn..."
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            disabled={saving}
            onClick={saveProfile}
            className="px-5 py-2 rounded bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
          {msg && <div className="text-xs text-violet-400">{msg}</div>}
        </div>
        {website && (
          <div className="text-xs text-neutral-400">
            Website:{" "}
            <a
              className="text-violet-400 hover:underline"
              target="_blank"
              rel="noreferrer"
              href={website}
            >
              {website}
            </a>
          </div>
        )}
        {bio && (
          <div className="text-sm text-neutral-300 whitespace-pre-wrap">
            {bio}
          </div>
        )}
      </div>
      {/* TABS */}
      <div className="border-b border-white/6 flex gap-8 px-2 text-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`py-3 relative ${
              activeTab === t.key
                ? "text-white"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {t.label}
            {activeTab === t.key && (
              <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-violet-500 rounded-full" />
            )}
          </button>
        ))}
      </div>
      {/* TAB CONTENT */}
      <div className="space-y-4">
        {activeTab === "threads" &&
          (threads.length ? (
            threads.map((t) => <ThreadItem key={t._id} thread={t} />)
          ) : (
            <div className="text-sm text-neutral-500">Chưa có thread</div>
          ))}
        {activeTab === "media" &&
          (mediaThreads.length ? (
            mediaThreads.map((t) => <ThreadItem key={t._id} thread={t} />)
          ) : (
            <div className="text-sm text-neutral-500">Không có media</div>
          ))}
        {activeTab === "replies" && (
          <div className="text-sm text-neutral-500">
            (Chưa implement lọc replies)
          </div>
        )}
        {activeTab === "reposts" &&
          (reposts.length ? (
            reposts.map((t) => (
              <div key={t._id} className="space-y-2">
                <div className="text-xs text-neutral-400 flex items-center gap-2">
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
                    <polyline points="17 1 21 5 17 9"></polyline>
                    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                    <polyline points="7 23 3 19 7 15"></polyline>
                    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                  </svg>
                  <span>Bạn đã đăng lại</span>
                </div>
                <ThreadItem thread={t} />
              </div>
            ))
          ) : (
            <div className="text-sm text-neutral-500">Chưa có bài đăng lại</div>
          ))}
      </div>
    </div>
  );
}
