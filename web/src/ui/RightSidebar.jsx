import React, { useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import Avatar from "./Avatar.jsx";
import TrendingHashtags from "./TrendingHashtags.jsx";

const mockSuggestedUsers = [
  {
    id: 1,
    username: "Max",
    handle: "@cute_adventures",
    avatarUrl: "/api/placeholder/40/40",
    isFollowing: false,
  },
  {
    id: 2,
    username: "Bella",
    handle: "@bella_beauty",
    avatarUrl: "/api/placeholder/40/40",
    isFollowing: false,
  },
  {
    id: 3,
    username: "Charlie",
    handle: "@charlie_pup",
    avatarUrl: "/api/placeholder/40/40",
    isFollowing: false,
  },
];

export default function RightSidebar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [followingUsers, setFollowingUsers] = useState(new Set());

  const handleFollow = (userId) => {
    setFollowingUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  return (
    <aside className="hidden lg:block w-80 space-y-4">
      <div className="sticky top-4 space-y-4">
        {/* Search Bar */}
        <div className="bg-white dark:bg-black border border-black/10 dark:border-white/15 rounded-2xl p-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            <input
              type="text"
              placeholder="Search Pawster..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-900 border border-black/10 dark:border-white/15 rounded-xl text-sm placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
            />
          </div>
        </div>

        {/* Pawster Today - Trending Hashtags */}
        <TrendingHashtags />

        {/* Suggested for You */}
        <div className="bg-white dark:bg-black border border-black/10 dark:border-white/15 rounded-2xl p-4">
          <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">
            Suggested for You
          </h3>
          <div className="space-y-3">
            {mockSuggestedUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar
                    user={{
                      username: user.username,
                      avatarUrl: user.avatarUrl,
                    }}
                    size="sm"
                  />
                  <div>
                    <div className="text-sm font-medium text-black dark:text-white">
                      {user.username}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {user.handle}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleFollow(user.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    followingUsers.has(user.id)
                      ? "bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-700"
                      : "bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200"
                  }`}
                >
                  {followingUsers.has(user.id) ? "Following" : "Follow"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
