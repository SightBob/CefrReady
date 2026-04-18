'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Layers, RefreshCw, Filter, MousePointerClick, Star } from 'lucide-react';
import { resetProductTour } from './ProductTour';
import type { TourStep } from './ProductTour';

const ProductTour = dynamic(() => import('./ProductTour'), { ssr: false });

const STORAGE_KEY = 'cefrready-tour-flashcards-completed';

// ─── Tour Steps สำหรับหน้า Flashcards ────────────────────────────────────

const FLASHCARDS_TOUR_STEPS: TourStep[] = [
  {
    target: null,
    title: 'คลังคำศัพท์ส่วนตัว 🗂️',
    description: 'Flashcard ทุกใบมาจากคำศัพท์ที่คุณคลิกระหว่างทำข้อสอบ — ที่นี่ช่วยให้ทบทวนได้ตามสถานะ',
    icon: <Layers className="w-6 h-6" />,
  },
  {
    target: 'fc-view-toggle',
    title: 'สลับโหมดดูและโหมดฝึก',
    description: 'Grid — ดูภาพรวมทุกคำ | Review — ฝึกทบทวนทีละใบ พลิก Card เพื่อดูความหมายและตัดสินว่าจำได้หรือยัง',
    icon: <RefreshCw className="w-6 h-6" />,
    position: 'bottom',
  },
  {
    target: 'fc-filter-tabs',
    title: 'กรองตามสถานะการจำ',
    description: 'New → Learning → Mastered — ใช้กรองคำที่ยังต้องฝึก เพื่อโฟกัสกับคำที่ยังจำไม่ได้',
    icon: <Filter className="w-6 h-6" />,
    position: 'bottom',
  },
  {
    target: 'fc-card-area',
    title: 'คลิกการ์ดเพื่อพลิกดูความหมาย',
    description: 'ในโหมด Review ให้กดที่การ์ดเพื่อพลิกดูความหมาย แล้วกด ✓ (จำได้) หรือ ✗ (จำไม่ได้) เพื่ออัปเดตสถานะ',
    icon: <MousePointerClick className="w-6 h-6" />,
    position: 'top',
    hint: (
      <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-start gap-2">
        <Star className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-800 leading-relaxed">
          <strong>เคล็ดลับ:</strong> ทบทวน Flashcard ทุกวัน 10 นาที ดีกว่าท่องหนักๆ วันเดียว!
        </p>
      </div>
    ),
  },
  {
    target: 'fc-add-hint',
    title: 'เพิ่มคำศัพท์ได้จากข้อสอบ',
    description: 'Flashcard ใหม่จะปรากฏที่นี่อัตโนมัติเมื่อคุณคลิกบันทึกคำศัพท์ระหว่างทำข้อสอบ — ไม่ต้องพิมพ์เอง!',
    icon: <Layers className="w-6 h-6" />,
    position: 'top',
  },
];

// ─── Component ────────────────────────────────────────────────────────────

export default function FlashcardsTour() {
  const [showTour, setShowTour] = useState(false);
  const [forceOpen, setForceOpen] = useState(false);

  useEffect(() => {
    try {
      const completed = localStorage.getItem(STORAGE_KEY);
      if (!completed) {
        const timer = setTimeout(() => setShowTour(true), 1000);
        return () => clearTimeout(timer);
      }
    } catch { /* ignore */ }

    const handleReplay = () => {
      resetProductTour(STORAGE_KEY);
      setForceOpen(true);
      setShowTour(true);
    };
    window.addEventListener('cefrready-start-flashcards-tour', handleReplay);
    return () => window.removeEventListener('cefrready-start-flashcards-tour', handleReplay);
  }, []);

  return showTour ? (
    <ProductTour
      steps={FLASHCARDS_TOUR_STEPS}
      storageKey={STORAGE_KEY}
      forceOpen={forceOpen}
      onComplete={() => { setShowTour(false); setForceOpen(false); }}
    />
  ) : null;
}
