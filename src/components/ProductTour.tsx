'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, BookOpen, Layers, GraduationCap, MousePointerClick } from 'lucide-react';

// ─── Tour Step Definition ────────────────────────────────────────────────────

export interface TourStep {
  target: string | null; // data-tour attribute value, null = center modal
  title: string;
  description: string;
  icon: React.ReactNode;
  position?: 'bottom' | 'top' | 'left' | 'right';
  hint?: React.ReactNode; // optional extra hint block below description
}

const DEFAULT_STEPS: TourStep[] = [
  {
    target: null,
    title: 'ยินดีต้อนรับสู่ CEFR Ready! 🎉',
    description: 'มาดูกันว่ามีอะไรช่วยเตรียมสอบ CEFR ได้บ้าง ใช้เวลาแค่ 30 วินาที!',
    icon: <GraduationCap className="w-6 h-6" />,
  },
  {
    target: 'nav-tests',
    title: 'ข้อสอบ CEFR ครบทุกทักษะ',
    description: 'ข้อสอบ 4 ประเภท: Focus on Form, Focus on Meaning, Form & Meaning และ Listening — พร้อมคำอธิบายทุกข้อ',
    icon: <BookOpen className="w-6 h-6" />,
    position: 'bottom',
  },
  {
    target: 'nav-mustknow',
    title: 'สรุปเนื้อหาก่อนสอบ',
    description: 'รวมไวยากรณ์และคำศัพท์สำคัญที่ต้องรู้ แบ่งตามระดับ CEFR ตั้งแต่ A1 ถึง C2',
    icon: <Sparkles className="w-6 h-6" />,
    position: 'bottom',
  },
  {
    target: 'nav-flashcards',
    title: '💡 ฟีเจอร์ลับ! คลิกคำศัพท์ → Flashcard',
    description: 'ตอนทำข้อสอบ ลองคลิกที่คำศัพท์ภาษาอังกฤษดูสิ! ระบบจะแสดงความหมายและให้บันทึกเป็น Flashcard ส่วนตัวได้เลย',
    icon: <MousePointerClick className="w-6 h-6" />,
    position: 'bottom',
    hint: (
      <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
        <MousePointerClick className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>ลองดู:</strong> ตอนทำข้อสอบ เอาเมาส์ชี้ที่คำศัพท์ภาษาอังกฤษ → จะมีไฮไลท์สีเหลือง → คลิกเลย!
        </p>
      </div>
    ),
  },
  {
    target: 'hero-cta',
    title: 'พร้อมแล้ว! เริ่มทำข้อสอบเลย 🚀',
    description: 'ลองทำตัวอย่างก่อนได้เลย ไม่ต้องสมัครสมาชิก หรือจะล็อกอินเพื่อบันทึกผลก็ได้',
    icon: <Layers className="w-6 h-6" />,
    position: 'top',
  },
];

export const STORAGE_KEY_HOME = 'cefrready-tour-completed';

// ─── Main Component ──────────────────────────────────────────────────────────

interface ProductTourProps {
  steps?: TourStep[];
  storageKey?: string;
  onComplete?: () => void;
  forceOpen?: boolean;
}

export default function ProductTour({
  steps = DEFAULT_STEPS,
  storageKey = STORAGE_KEY_HOME,
  onComplete,
  forceOpen = false,
}: ProductTourProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [arrowPosition, setArrowPosition] = useState<'top' | 'bottom' | 'left' | 'right' | 'none'>('top');
  const [arrowLeft, setArrowLeft] = useState<number | string>('50%');
  const [animKey, setAnimKey] = useState(0); // force re-animate tooltip on step change
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      setCurrentStep(0);
      return;
    }
    try {
      const completed = localStorage.getItem(storageKey);
      if (!completed) {
        const timer = setTimeout(() => setIsOpen(true), 800);
        return () => clearTimeout(timer);
      }
    } catch { /* ignore */ }
  }, [forceOpen, storageKey]);

  const positionElements = useCallback(() => {
    const step = steps[currentStep];
    if (!step || !isOpen) return;

    if (!step.target) {
      setSpotlightRect(null);
      setTooltipStyle({
        position: 'fixed',
        top: '0',
        bottom: '0',
        left: '0',
        right: '0',
        margin: 'auto',
        height: 'max-content',
        maxWidth: '420px',
        width: 'calc(100% - 32px)',
      });
      setArrowPosition('top'); // Hidden for welcome step anyway
      setArrowLeft('50%');
      return;
    }

    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) {
      setSpotlightRect(null);
      setTooltipStyle({
        position: 'fixed',
        top: '0',
        bottom: '0',
        left: '0',
        right: '0',
        margin: 'auto',
        height: 'max-content',
        maxWidth: '420px',
        width: 'calc(100% - 32px)',
      });
      setArrowPosition('top');
      setArrowLeft('50%');
      return;
    }

    // Scroll element into view smoothly (center is best)
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

    // Wait a tick for scroll to settle
    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setSpotlightRect(rect);

      const isMobile = document.documentElement.clientWidth < 640;
      const padding = isMobile ? 12 : 16;
      const tooltipWidth = Math.min(420, document.documentElement.clientWidth - 32);
      
      // Get actual height if available, otherwise estimate
      const actualHeight = tooltipRef.current?.getBoundingClientRect().height || 220;
      const pos = step.position || 'bottom';

      let top: number | string = 0;
      let left = 0;
      let arrow: 'top' | 'bottom' | 'left' | 'right' | 'none' = 'top';
      const targetCenterX = rect.left + rect.width / 2;

      if (isMobile) {
        // Smart positioning for mobile
        if (rect.bottom + actualHeight + padding <= window.innerHeight - 16) {
          // Enough space below
          top = rect.bottom + padding;
          arrow = 'top';
        } else if (rect.top - actualHeight - padding >= 70) {
          // Enough space above (70px for header)
          top = rect.top - actualHeight - padding;
          arrow = 'bottom';
        } else {
          // Fallback: fix to bottom of screen if element is huge
          top = window.innerHeight - actualHeight - 16;
          arrow = 'none'; // Hide arrow when it's just floating at the bottom
        }
      } else {
        // Desktop positioning
        if (pos === 'bottom') {
          top = rect.bottom + padding;
          arrow = 'top';
        } else if (pos === 'top') {
          top = rect.top - actualHeight - padding;
          arrow = 'bottom';
        } else if (pos === 'right') {
          top = rect.top + rect.height / 2 - actualHeight / 2;
          arrow = 'left';
        } else if (pos === 'left') {
          top = rect.top + rect.height / 2 - actualHeight / 2;
          arrow = 'right';
        }
      }

      // Calculate horizontal position (ideal center is target center)
      left = targetCenterX - tooltipWidth / 2;

      // Special handling for left/right positions on desktop
      if (!isMobile && pos === 'right') {
        left = rect.right + padding;
      } else if (!isMobile && pos === 'left') {
        left = rect.left - tooltipWidth - padding;
      }

      // Clamp tooltip to viewport perfectly
      if (left < 16) left = 16;
      if (left + tooltipWidth > document.documentElement.clientWidth - 16) {
        left = document.documentElement.clientWidth - tooltipWidth - 16;
      }
      
      // Calculate where the arrow should point relative to the clamped tooltip
      let calculatedArrowLeft: number | string = '50%';
      if (arrow === 'top' || arrow === 'bottom') {
        const rawArrowOffset = targetCenterX - left;
        // Clamp arrow so it doesn't break rounded corners (min 24px from edge)
        calculatedArrowLeft = Math.max(24, Math.min(rawArrowOffset, tooltipWidth - 24));
      }

      if (typeof top === 'number') {
        if (top < 80) { 
          top = rect.bottom + padding; 
          arrow = 'top'; 
        }
        if (top + actualHeight > window.innerHeight - 16) {
          top = rect.top - actualHeight - padding;
          arrow = 'bottom';
        }
        // Final clamp to prevent overflowing top edge
        top = Math.max(80, top);
      }

      setArrowPosition(arrow as any);
      setArrowLeft(calculatedArrowLeft);
      setTooltipStyle({
        position: 'fixed',
        top: typeof top === 'number' ? `${top}px` : top,
        left: `${left}px`,
        width: `${tooltipWidth}px`,
        transform: 'none', // Reset transform from center position
      });
    }, 80);
  }, [currentStep, isOpen, steps]);

  useEffect(() => {
    if (!isOpen) return;
    setAnimKey(k => k + 1);
    positionElements();
    window.addEventListener('scroll', positionElements, true);
    window.addEventListener('resize', positionElements);
    return () => {
      window.removeEventListener('scroll', positionElements, true);
      window.removeEventListener('resize', positionElements);
    };
  }, [isOpen, currentStep, positionElements]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(s => s + 1);
    else handleComplete();
  };

  const handlePrev = () => { if (currentStep > 0) setCurrentStep(s => s - 1); };

  const handleComplete = () => {
    setIsOpen(false);
    try { localStorage.setItem(storageKey, 'true'); } catch { /* ignore */ }
    onComplete?.();
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  const step = steps[currentStep];
  const isWelcome = !step.target;
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="product-tour-overlay" aria-modal="true" role="dialog" aria-label="Product Tour">
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9998]" onClick={handleComplete}>
        <svg className="w-full h-full" style={{ position: 'absolute', top: 0, left: 0 }}>
          <defs>
            <mask id="tour-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {spotlightRect && (
                <rect
                  x={spotlightRect.left - 8}
                  y={spotlightRect.top - 6}
                  width={spotlightRect.width + 16}
                  height={spotlightRect.height + 12}
                  rx="12"
                  fill="black"
                  className="tour-spotlight-rect"
                />
              )}
            </mask>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#tour-spotlight-mask)" />
        </svg>

        {spotlightRect && (
          <div
            className="tour-spotlight-ring"
            style={{
              position: 'fixed',
              top: spotlightRect.top - 10,
              left: spotlightRect.left - 12,
              width: spotlightRect.width + 24,
              height: spotlightRect.height + 20,
              borderRadius: '14px',
              border: '2px solid rgba(99, 102, 241, 0.5)',
              boxShadow: '0 0 20px 4px rgba(99, 102, 241, 0.2)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div
        key={animKey}
        ref={tooltipRef}
        className="tour-tooltip"
        style={{ ...tooltipStyle, zIndex: 9999 }}
        onClick={e => e.stopPropagation()}
      >
        {!isWelcome && arrowPosition !== 'none' && (
          <div 
            className={`tour-arrow tour-arrow-${arrowPosition}`} 
            style={{ left: typeof arrowLeft === 'number' ? `${arrowLeft}px` : arrowLeft }}
          />
        )}

        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Gradient header */}
          <div className="bg-gradient-to-r from-primary-600 to-accent-600 px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 shrink-0 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white">
                {step.icon}
              </div>
              <h3 className="text-white font-bold text-base leading-tight">{step.title}</h3>
            </div>
            <button
              onClick={handleComplete}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white/70 hover:text-white"
              aria-label="ปิดทัวร์"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-4 sm:px-5 py-3 sm:py-4">
            <p className="text-slate-600 text-sm leading-relaxed">{step.description}</p>
            {step.hint}
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap-reverse sm:flex-nowrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-center sm:justify-start">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? 'w-6 h-2 bg-primary-500'
                      : i < currentStep
                      ? 'w-2 h-2 bg-primary-300'
                      : 'w-2 h-2 bg-slate-200'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  ก่อนหน้า
                </button>
              )}
              {isWelcome && (
                <button
                  onClick={handleComplete}
                  className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-600 font-medium transition-colors"
                >
                  ข้ามทัวร์
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-1.5 text-sm bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
              >
                {isLast ? 'เข้าใจแล้ว!' : isWelcome ? 'เริ่มทัวร์' : 'ถัดไป'}
                {!isLast && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function resetProductTour(storageKey = STORAGE_KEY_HOME) {
  try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
}
