'use client';

import { X, PenTool, BookOpen, Layers, Headphones, LayoutGrid } from 'lucide-react';
import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import SectionCard, { type SectionData } from '@/components/SectionCard';
import TestSetCard from '@/components/TestSetCard';
import FullTestCard from '@/components/FullTestCard';

// FeedbackDiscoveryModal intentionally not rendered — feature disabled until
// the feedback survey launches.

const SECTION_STYLE: Record<string, { name: string; color: string; bg: string; icon: React.ElementType }> = {
  'focus-form': { name: 'Focus on Form', color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', icon: PenTool },
  'focus-meaning': { name: 'Focus on Meaning', color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', icon: BookOpen },
  'form-meaning': { name: 'Form & Meaning', color: 'from-purple-500 to-pink-500', bg: 'bg-purple-50', icon: Layers },
  'listening': { name: 'Listening', color: 'from-orange-500 to-amber-500', bg: 'bg-orange-50', icon: Headphones },
};

const FALLBACK_STYLE = { name: '', color: 'from-slate-500 to-slate-600', bg: 'bg-slate-50', icon: LayoutGrid };

interface TestsPageClientProps {
  sections: SectionData[];
  user: { name: string | null; email: string | null } | null;
}

export default function TestsPageClient({ sections, user }: TestsPageClientProps) {
  const isAuthenticated = Boolean(user);
  const [selectedSection, setSelectedSection] = useState<SectionData | null>(null);

  // Close modal on Escape + lock body scroll while open
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

  const activeSets = selectedSection?.testSets.filter((ts) => ts.isActive) ?? [];

  const handleOpenSection = (section: SectionData) => {
    if (!isAuthenticated) {
      void signIn(undefined, { callbackUrl: '/tests' });
      return;
    }
    setSelectedSection(section);
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-[65px] max-lg:pt-[45px] min-h-svh">
      <div className="mb-8 w-full bg-[#EEF1FF] p-5 sm:p-[1.75rem] border border-[#DFDEFF] rounded-[1.5rem] sm:rounded-[2rem]">
  {isAuthenticated ? (
    <p className="text-[#414079] text-[19px] sm:text-[24px] font-bold mt-2 leading-snug">
      สวัสดี,{' '}
      <span>{user!.name || user!.email}</span>
      {' '}พร้อมทดสอบความรู้หรือยัง?
    </p>
  ) : (
    <p className="text-slate-600 mt-2 text-sm sm:text-base">ล็อกอินเพื่อทำข้อสอบเต็มและบันทึกคะแนนของคุณ</p>
  )}

  <div className="flex items-center gap-2 sm:gap-3 flex-nowrap overflow-x-auto sm:flex-wrap sm:overflow-visible mt-3 -mx-5 px-5 sm:mx-0 sm:px-0 pb-1 sm:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
    <div className="bg-white/[0.53] py-1.5 sm:py-0.5 px-4 shrink-0 rounded-full">
      <span className='text-[#5F6FA9] text-[0.8125rem] sm:text-[0.875rem] font-semibold whitespace-nowrap'>Focus on Form</span>
    </div>
    <div className="bg-white/[0.53] py-1.5 sm:py-0.5 px-4 shrink-0 rounded-full">
      <span className='text-[#5F6FA9] text-[0.8125rem] sm:text-[0.875rem] font-semibold whitespace-nowrap'>Focus on Meaning</span>
    </div>
    <div className="bg-white/[0.53] py-1.5 sm:py-0.5 px-4 shrink-0 rounded-full">
      <span className='text-[#5F6FA9] text-[0.8125rem] sm:text-[0.875rem] font-semibold whitespace-nowrap'>Focus on Form and Meaning</span>
    </div>
    <div className="bg-white/[0.53] py-1.5 sm:py-0.5 px-4 shrink-0 rounded-full">
      <span className='text-[#5F6FA9] text-[0.8125rem] sm:text-[0.875rem] font-semibold whitespace-nowrap'>Listening</span>
    </div>
  </div>

  <FullTestCard disabled={!isAuthenticated} />
</div>



      {sections.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-lg font-medium">No test sections available yet.</p>
          <p className="text-sm mt-1">Please check back later.</p>
        </div>
      ) : (
        <div className="grid max-[625px]:grid-cols-1 max-[1190px]:grid-cols-2 min-[1190px]:grid-cols-4 gap-6">
          {sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              onOpen={handleOpenSection}
            />
          ))}
        </div>
      )}

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
            {/* Modal header */}
            <div className="flex items-center gap-4 p-6 border-b border-slate-100">
              {(() => {
                const style = SECTION_STYLE[selectedSection.id] ?? FALLBACK_STYLE;
                const Icon = style.icon;
                return (
                  <div className={`bg-gradient-to-br ${style.color} p-3 rounded-2xl flex-shrink-0`}>
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

            {/* Modal body */}
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
    </div>
  );
}
