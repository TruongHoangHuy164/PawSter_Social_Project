import React, { useState, useEffect } from 'react';
import { useAuth } from '../state/auth.jsx';
import UpgradeModal from './UpgradeModal.jsx';

export default function UpgradeBanner() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [forceHide, setForceHide] = useState(false);

  // Check for payment completion on component mount
  useEffect(() => {
    const pendingPayment = localStorage.getItem('pendingPayment');
    if (pendingPayment && user?.isPro) {
      // Payment completed successfully, remove from localStorage and hide banner
      localStorage.removeItem('pendingPayment');
      setForceHide(true);
      
      // Show success notification
      setTimeout(() => {
        alert('🎉 Chúc mừng! Tài khoản của bạn đã được nâng cấp Pro thành công!');
      }, 500);
    }
  }, [user?.isPro]);

  // Force hide banner if payment was just completed
  if (forceHide) {
    return null;
  }

  // Không hiện banner nếu user đã Pro và còn hơn 7 ngày
  if (user?.isPro && user?.proExpiry) {
    const expiryDate = new Date(user.proExpiry);
    const now = new Date();
    const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysLeft > 7) {
      return null; // Không hiện banner nếu còn hơn 7 ngày
    }
  }

  // Không hiện banner nếu user đã Pro nhưng không có proExpiry (Pro vĩnh viễn)
  if (user?.isPro && !user?.proExpiry) {
    return null;
  }

  const getRemainingDays = () => {
    if (!user?.isPro || !user?.proExpiry) return null;
    
    const expiryDate = new Date(user.proExpiry);
    const now = new Date();
    const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 0) return 'Đã hết hạn';
    if (daysLeft === 1) return 'Còn 1 ngày';
    return `Còn ${daysLeft} ngày`;
  };

  const remainingDays = getRemainingDays();

  return (
    <>
      <div className="sticky top-0 z-40 bg-black dark:bg-white text-white dark:text-black border-b border-black/10 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">⭐</span>
                <span className="font-semibold text-sm">
                  {user?.isPro 
                    ? `Pro ${remainingDays}` 
                    : 'Nâng cấp Pro'
                  }
                </span>
              </div>
              <div className="text-xs opacity-80">
                {user?.isPro 
                  ? 'Gia hạn ngay để không bị gián đoạn dịch vụ'
                  : 'Mở khóa tính năng đặc quyền'
                }
              </div>
            </div>
            
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-1.5 rounded-xl bg-white dark:bg-black text-black dark:text-white text-sm font-semibold hover:scale-105 active:scale-95 transition-all duration-200 border border-white/20 dark:border-black/20"
            >
              {user?.isPro ? 'Gia hạn' : 'Nâng cấp'}
            </button>
          </div>
        </div>
      </div>

      <UpgradeModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </>
  );
}