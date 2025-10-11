import React, { useState } from "react";

export default function Avatar({ user, size = "md" }) {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg",
  };

  // Show initials if no avatar URL or image failed to load
  if (!user?.avatarUrl || imageError) {
    return (
      <div
        className={`${
          sizeClasses[size]
        } bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-medium text-white shadow-md ring-2 ${
          user?.isPro ? "ring-amber-400" : "ring-neutral-700"
        }`}
      >
        {user?.username?.[0]?.toUpperCase() || "?"}
      </div>
    );
  }

  // Show avatar image
  return (
    <img
      src={user.avatarUrl}
      alt={`${user.username}'s avatar`}
      className={`${
        sizeClasses[size]
      } rounded-full object-cover border-2 border-neutral-700 shadow-md ring-2 ${
        user?.isPro ? "ring-amber-400" : "ring-neutral-800"
      }`}
      onError={() => setImageError(true)}
    />
  );
}
