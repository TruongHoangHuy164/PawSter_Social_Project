import React from 'react';

export default function Notification() {
  return (
    <div className="w-full mx-auto p-4 space-y-6">
      <h1 className="text-xl font-bold text-center">Thông báo</h1>
      
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔔</div>
        <p className="text-gray-500 dark:text-gray-400">
          Tính năng thông báo đang được phát triển
        </p>
      </div>
    </div>
  );
}