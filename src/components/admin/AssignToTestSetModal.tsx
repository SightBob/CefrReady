'use client';

import { useState, useEffect } from 'react';
import { X, Check, LayoutList, Loader2 } from 'lucide-react';

const SECTION_COLORS: Record<string, string> = {
  'focus-form': 'from-blue-500 to-cyan-500',
  'focus-meaning': 'from-emerald-500 to-teal-500',
  'form-meaning': 'from-purple-500 to-pink-500',
  listening: 'from-orange-500 to-amber-500',
};

interface Section {
  id: string;
  name: string;
  testSets: { id: number; sectionId: string; name: string; description: string | null; isActive: boolean; questionCount: number }[];
}

interface AssignToTestSetModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionIds: number[];
  alreadyAssignedSetIds: number[];
  /** Filter available sets to this section only (e.g. question's testTypeId) */
  filterSectionId?: string;
  onAssignmentComplete: () => void;
}

export default function AssignToTestSetModal({
  isOpen,
  onClose,
  questionIds,
  alreadyAssignedSetIds,
  filterSectionId,
  onAssignmentComplete,
}: AssignToTestSetModalProps) {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<number | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    if (isOpen) {
      fetchSections();
    }
  }, [isOpen]);

  const fetchSections = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/test-sets');
      const json = await res.json();
      if (json.success) {
        const filtered = filterSectionId
          ? json.data.filter((s: Section) => s.id === filterSectionId)
          : json.data;
        setSections(filtered);
      }
    } catch (err) {
      console.error('Failed to fetch test sets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (testSetId: number) => {
    setAssigning(testSetId);
    setProgress({ done: 0, total: questionIds.length });

    let allSuccess = true;
    for (const qId of questionIds) {
      try {
        const res = await fetch(`/api/admin/test-sets/${testSetId}/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId: qId }),
        });
        if (!res.ok && res.status !== 409) {
          allSuccess = false;
        }
      } catch {
        allSuccess = false;
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setAssigning(null);
    if (allSuccess) {
      onAssignmentComplete();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-7 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900">เพิ่มข้อสอบลงใน Test Set</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {questionIds.length === 1
                ? 'กำลังเพิ่ม 1 ข้อสอบ'
                : `กำลังเพิ่ม ${questionIds.length} ข้อสอบ`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        )}

        {/* Progress bar during bulk assign */}
        {assigning !== null && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-slate-600 mb-1">
              <span>กำลังเพิ่ม...</span>
              <span>{progress.done}/{progress.total}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-200"
                style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Test sets grouped by section */}
        {!loading && (
          <div className="flex-1 overflow-y-auto space-y-5">
            {sections.map((section) => (
              <div key={section.id}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-5 rounded-full bg-gradient-to-b ${SECTION_COLORS[section.id] ?? 'from-slate-400 to-slate-500'}`} />
                  <h4 className="text-sm font-semibold text-slate-700">{section.name}</h4>
                </div>
                <div className="space-y-1.5 pl-4">
                  {section.testSets.length === 0 && (
                    <p className="text-xs text-slate-400 py-1">ไม่มี test set</p>
                  )}
                  {section.testSets.map((ts) => {
                    const isAssigned = alreadyAssignedSetIds.includes(ts.id);
                    const isAssigningThis = assigning === ts.id;
                    return (
                      <button
                        key={ts.id}
                        disabled={isAssigningThis}
                        onClick={() => !isAssigned && handleAssign(ts.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                          isAssigned
                            ? 'border-slate-200 bg-slate-50 cursor-default opacity-70'
                            : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer'
                        } ${isAssigningThis ? 'border-indigo-300 bg-indigo-50' : ''}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isAssigned ? (
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                              <Check className="w-4 h-4 text-emerald-600" />
                            </div>
                          ) : (
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                              <LayoutList className="w-4 h-4 text-indigo-600" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{ts.name}</p>
                            {ts.description && (
                              <p className="text-xs text-slate-400 truncate">{ts.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-slate-400">{ts.questionCount} ข้อ</span>
                          {isAssigningThis && (
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                          )}
                          {isAssigned && (
                            <span className="text-xs font-medium text-emerald-600">เพิ่มแล้ว</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {!loading && sections.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">ไม่มี test set ให้เลือก</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
