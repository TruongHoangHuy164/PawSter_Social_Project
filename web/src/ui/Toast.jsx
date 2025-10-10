import React, { useState, useEffect } from "react";

export default function Toast({
  message,
  type = "info",
  duration = 5000,
  onClose,
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose && onClose(), 300); // Wait for animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const typeStyles = {
    success: "bg-green-600 border-green-500",
    error: "bg-red-600 border-red-500",
    warning: "bg-yellow-600 border-yellow-500",
    info: "bg-blue-600 border-blue-500",
  };

  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };

  if (!visible && duration > 0) {
    return (
      <div className="fixed top-4 right-4 transform transition-all duration-300 translate-x-full opacity-0 pointer-events-none">
        <div
          className={`${typeStyles[type]} text-white px-4 py-3 rounded-lg shadow-lg border-l-4 max-w-sm`}
        >
          <div className="flex items-start space-x-3">
            <span className="text-lg">{icons[type]}</span>
            <p className="text-sm">{message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 transform transition-all duration-300">
      <div
        className={`${typeStyles[type]} text-white px-4 py-3 rounded-lg shadow-lg border-l-4 max-w-sm`}
      >
        <div className="flex items-start justify-between space-x-3">
          <div className="flex items-start space-x-3">
            <span className="text-lg">{icons[type]}</span>
            <p className="text-sm">{message}</p>
          </div>
          {onClose && (
            <button
              onClick={() => {
                setVisible(false);
                setTimeout(() => onClose(), 300);
              }}
              className="text-white hover:text-gray-200 ml-2"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
