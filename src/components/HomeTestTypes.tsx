'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BookOpen,
  Clock,
  Headphones,
  Layers,
  LayoutGrid,
  PenTool,
  Sparkles,
  X,
} from 'lucide-react';
import type { SectionData } from '@/components/SectionCard';
import TestSetCard from '@/components/TestSetCard';

const TEST_TYPES = [
  { id: 'focus-form', name: 'Focus on form', color: 'from-blue-500 to-cyan-500', icon: PenTool },
  { id: 'focus-meaning', name: 'Focus on Meaning', color: 'from-emerald-500 to-teal-500', icon: BookOpen },
  { id: 'form-meaning', name: 'Form & Meaning', color: 'from-purple-500 to-pink-500', icon: Layers },
  { id: 'listening', name: 'Listening', color: 'from-orange-500 to-amber-500', icon: Headphones },
];

const FALLBACK_GRADIENT = 'from-slate-500 to-slate-600';

export default function HomeTestTypes({
  sections,
  isAuthenticated,
}: {
  sections: SectionData[];
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [selectedSection, setSelectedSection] = useState<SectionData | null>(null);

  useEffect(() => {
    if (!selectedSection) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedSection(null);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [selectedSection]);

  const sectionById = new Map(sections.map((s) => [s.id, s]));
  const activeSets = selectedSection?.testSets.filter((ts) => ts.isActive) ?? [];

  return (
    <>
      {TEST_TYPES.map((type) => {
        const Icon = type.icon;
        const section = sectionById.get(type.id);
        return (
          <button
            key={type.id}
            type="button"
            onClick={() => {
              if (!isAuthenticated) {
                router.push(`/demo/${type.id}`);
                return;
              }
              if (section) setSelectedSection(section);
            }}
            className="text-left bg-[#F8F8F8] relative flex flex-col w-full h-auto min-h-[240px] p-4 rounded-2xl border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 sm:mx-auto sm:max-w-[295px] sm:h-[288px] sm:p-[17px]"
          >
            {!isAuthenticated && (
              <span className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-violet-100 text-violet-700 text-[0.688rem] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Demo
              </span>
            )}
            <div className={`bg-gradient-to-br ${type.color} w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-3 md:mb-4`}>
              <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg sm:text-[1.375rem] mb-1">
              {type.name}
            </h3>
            <p className="text-xs sm:text-sm md:text-[1rem] font-medium">
              ทดสอบความรู้ของคุณเกี่ยวกับ โครงสร้างไวยากรณ์ รูปแบบคำกริยา และแพทเทิร์นประโยค
            </p>

            <div className="mt-auto flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="flex space-x-1">
                  <Clock className="w-4 h-4" />
                  <p className="md:text-[0.813rem] font-medium text-[#343434]">{section?.duration ?? 30} นาที</p>
                </div>
                <div className="flex space-x-1">
                  <LayoutGrid className="w-4 h-4" />
                  <p className="md:text-[0.813rem] font-medium text-[#343434]">
                    {(section?.testSets.filter((ts) => ts.isActive).length ?? 9)} เซ็ต
                  </p>
                </div>
              </div>

              <div className="bg-[#E2E8FF] rounded-full size-[36px] flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-[#7372DF]" />
              </div>
            </div>
          </button>
        );
      })}

      {/* Section modal */}
      {selectedSection && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in"
          onClick={() => setSelectedSection(null)}
          role="dialog"
          aria-modal="true"
          aria-label={selectedSection.name}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-[1330px] max-h-[85vh] flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 p-6 border-b border-slate-100">
              {(() => {
                const style = TEST_TYPES.find((t) => t.id === selectedSection.id);
                const Icon = style?.icon ?? LayoutGrid;
                return (
                  <div className={`bg-gradient-to-br ${style?.color ?? FALLBACK_GRADIENT} p-3 rounded-2xl flex-shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                );
              })()}
              <div className="flex-1 min-w-0">
                <h2 className="text-[1.125rem] font-semibold text-[#525252]">{selectedSection.name}</h2>
                {selectedSection.description && (
                  <p className="text-sm font-medium mt-0.5 text-[#525252]">{selectedSection.description}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedSection(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0"
                aria-label="ปิด"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              {activeSets.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <LayoutGrid className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="font-medium">No test sets available yet.</p>
                  <p className="text-sm mt-1">Please check back later.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeSets.map((ts, index) => (
                    <TestSetCard
                      key={ts.id}
                      testSet={ts}
                      sectionId={selectedSection.id}
                      index={index}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
