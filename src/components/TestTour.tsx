'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MousePointerClick, BookmarkPlus, Star } from 'lucide-react';
import { resetProductTour } from './ProductTour';
import type { TourStep } from './ProductTour';

const ProductTour = dynamic(() => import('./ProductTour'), { ssr: false });

const STORAGE_KEY = 'cefrready-tour-test-completed';

// ─── Tour Steps สำหรับหน้าข้อสอบ ────────────────────────────────────

const TEST_TOUR_STEPS: TourStep[] = [
  {
    target: null,
    title: 'ยินดีต้อนรับสู่ข้อสอบ! 📝',
    description: 'ก่อนเริ่มทำข้อสอบ มาดูฟีเจอร์พิเศษที่จะช่วยให้คุณเรียนรู้ได้ดียิ่งขึ้น',
    icon: <Star className="w-6 h-6" />,
  },
  {
    target: 'test-article-text',
    title: 'คลิกคำศัพท์เพื่อแปลได้ทันที! 🔍',
    description: 'คลิกที่คำศัพท์ภาษาอังกฤษใดๆ ก็ได้ในบทความ เพื่อดูคำแปลภาษาไทยและความหมาย แล้วกดบันทึกเป็น Flashcard ได้เลย',
    icon: <MousePointerClick className="w-6 h-6" />,
    position: 'bottom',
    hint: (
      <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
        <BookmarkPlus className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>เคล็ดลับ:</strong> คำที่บันทึกจะถูกเพิ่มเข้า Flashcard อัตโนมัติ ทบทวนได้ทุกเมื่อ!
        </p>
      </div>
    ),
  },
];

// ─── Component ────────────────────────────────────────────────────────────

export default function TestTour() {
  const [showTour, setShowTour] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);

  useEffect(() => {
    try {
      const completed = localStorage.getItem(STORAGE_KEY);
      if (!completed) {
        const timer = setTimeout(() => setShowTour(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch { /* ignore */ }

    const handleReplay = () => {
      resetProductTour(STORAGE_KEY);
      setForceOpen(true);
      setShowTour(true);
    };
    window.addEventListener('cefrready-start-test-tour', handleReplay);
    return () => window.removeEventListener('cefrready-start-test-tour', handleReplay);
  }, []);

  return showTour ? (
    <ProductTour
      steps={TEST_TOUR_STEPS}
      storageKey={STORAGE_KEY}
      forceOpen={forceOpen}
      onComplete={() => { setShowTour(false); setForceOpen(false); }}
    />
  ) : null;
}
