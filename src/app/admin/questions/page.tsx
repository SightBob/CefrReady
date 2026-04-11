'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  LayoutList,
  X,
  Upload,
  Eye,
  Copy,
  ArrowLeft,
  BookOpen,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import AssignToTestSetModal from '@/components/admin/AssignToTestSetModal';

interface ConversationLine {
  speaker: string;
  text: string;
}

interface Article {
  title: string;
  text: string;
  blanks: { id: number; correctAnswer: string; hint?: string }[];
}

interface TestSetAssignment {
  id: number;
  name: string;
  sectionId: string;
}

interface Question {
  id: number;
  testTypeId: string;
  questionText: string;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  correctAnswer: string | null;
  explanation: string | null;
  difficulty: string | null;
  cefrLevel: string;
  active: string;
  orderIndex: number;
  createdAt: string;
  conversation?: ConversationLine[] | null;
  article?: Article | null;
  testType?: {
    id: string;
    name: string;
  };
  testSets?: TestSetAssignment[];
}

interface TestType {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  duration: number | null;
  questionCount: number | null;
  active: string;
}

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const difficultyColors: Record<string, string> = {
  easy: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  hard: 'bg-red-100 text-red-700',
};

const cefrColors: Record<string, string> = {
  A1: 'bg-blue-100 text-blue-700',
  A2: 'bg-cyan-100 text-cyan-700',
  B1: 'bg-teal-100 text-teal-700',
  B2: 'bg-indigo-100 text-indigo-700',
  C1: 'bg-purple-100 text-purple-700',
  C2: 'bg-pink-100 text-pink-700',
};

export default function QuestionsManagement() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTestType, setSelectedTestType] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [selectedCefr, setSelectedCefr] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTargetIds, setAssignTargetIds] = useState<number[]>([]);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    fetchTestTypes();
    fetchQuestions();
  }, [selectedTestType]);

  const fetchTestTypes = async () => {
    try {
      const response = await fetch('/api/admin/test-types');
      if (response.ok) {
        const data = await response.json();
        setTestTypes(data);
      }
    } catch (error) {
      console.error('Error fetching test types:', error);
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const url = selectedTestType
        ? `/api/admin/questions?testTypeId=${selectedTestType}`
        : '/api/admin/questions';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setQuestions(data);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบข้อสอบนี้?')) return;

    try {
      const response = await fetch(`/api/admin/questions/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setQuestions(questions.filter((q) => q.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        alert('เกิดข้อผิดพลาดในการลบข้อสอบ');
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('เกิดข้อผิดพลาดในการลบข้อสอบ');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบ ${selectedIds.size} ข้อสอบที่เลือก? การกระทำนี้ไม่สามารถย้อนกลับได้`)) return;

    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/admin/questions/${id}`, { method: 'DELETE' })
        )
      );
      setQuestions(questions.filter((q) => !selectedIds.has(q.id)));
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error bulk deleting questions:', error);
      alert('เกิดข้อผิดพลาดในการลบข้อสอบ');
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleActive = async (question: Question) => {
    try {
      const response = await fetch(`/api/admin/questions/${question.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...question,
          active: question.active === 'true' ? 'false' : 'true',
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setQuestions(questions.map((q) => (q.id === updated.id ? updated : q)));
      }
    } catch (error) {
      console.error('Error toggling question status:', error);
    }
  };

  const handleDuplicate = async (question: Question) => {
    if (!confirm(`ต้องการทำสำเนา "${question.questionText.slice(0, 40)}..." หรือไม่?`)) return;
    try {
      const payload = {
        testTypeId: question.testTypeId,
        questionText: `[สำเนา] ${question.questionText}`,
        optionA: question.optionA,
        optionB: question.optionB,
        optionC: question.optionC,
        optionD: question.optionD,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        difficulty: question.difficulty,
        cefrLevel: question.cefrLevel,
        conversation: question.conversation,
        article: question.article,
      };
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await fetchQuestions();
      } else {
        alert('เกิดข้อผิดพลาดในการทำสำเนา');
      }
    } catch (error) {
      console.error('Error duplicating question:', error);
      alert('เกิดข้อผิดพลาดในการทำสำเนา');
    }
  };

  const handleRemoveFromSet = async (questionId: number, testSetId: number) => {
    try {
      const res = await fetch(
        `/api/admin/test-sets/${testSetId}/questions/${questionId}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setQuestions(
          questions.map((q) =>
            q.id === questionId
              ? {
                  ...q,
                  testSets: (q.testSets || []).filter((ts) => ts.id !== testSetId),
                }
              : q
          )
        );
      }
    } catch (err) {
      console.error('Error removing from test set:', err);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredQuestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredQuestions.map((q) => q.id)));
    }
  };

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.questionText
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesDifficulty =
      !selectedDifficulty || q.difficulty === selectedDifficulty;
    const matchesCefr = !selectedCefr || q.cefrLevel === selectedCefr;
    return matchesSearch && matchesDifficulty && matchesCefr;
  });

  // Stats
  const statsTotal = questions.length;
  const statsActive = questions.filter((q) => q.active === 'true').length;
  const statsInactive = statsTotal - statsActive;
  const statsNoSet = questions.filter(
    (q) => !q.testSets || q.testSets.length === 0
  ).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-slate-400 hover:text-slate-700 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">จัดการข้อสอบ</h1>
              <p className="text-slate-500 mt-0.5 text-sm">เพิ่ม แก้ไข และจัดการข้อสอบทั้งหมด</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/questions/import"
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Upload className="w-4 h-4" />
              นำเข้า CSV
            </Link>
            <Link
              href="/admin/test-sets"
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              สร้าง Test Set ใหม่
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{statsTotal}</p>
              <p className="text-xs text-slate-500">ข้อสอบทั้งหมด</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">{statsActive}</p>
              <p className="text-xs text-slate-500">ใช้งาน</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-500">{statsInactive}</p>
              <p className="text-xs text-slate-500">ปิดใช้งาน</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{statsNoSet}</p>
              <p className="text-xs text-slate-500">ยังไม่อยู่ใน Set</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="ค้นหาข้อสอบ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <select
              value={selectedTestType}
              onChange={(e) => setSelectedTestType(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">ประเภทข้อสอบทั้งหมด</option>
              {testTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>

            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">ระดับความยากทั้งหมด</option>
              <option value="easy">ง่าย (Easy)</option>
              <option value="medium">ปานกลาง (Medium)</option>
              <option value="hard">ยาก (Hard)</option>
            </select>

            <select
              value={selectedCefr}
              onChange={(e) => setSelectedCefr(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">ระดับ CEFR ทั้งหมด</option>
              {CEFR_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <>
            {/* Bulk actions toolbar */}
            {selectedIds.size > 0 && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-indigo-700">
                  เลือกแล้ว {selectedIds.size} ข้อสอบ
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setAssignTargetIds(Array.from(selectedIds));
                      setAssignModalOpen(true);
                    }}
                    className="btn-primary text-sm py-1.5 px-3 inline-flex items-center gap-1.5"
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                    เพิ่มลงใน Test Set
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    className="text-sm py-1.5 px-3 inline-flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {bulkDeleting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    ลบที่เลือก
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-sm py-1.5 px-3 text-slate-600 hover:bg-white rounded-lg transition-colors"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5 text-left w-10">
                        <input
                          type="checkbox"
                          checked={
                            selectedIds.size === filteredQuestions.length &&
                            filteredQuestions.length > 0
                          }
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-slate-300 accent-indigo-600"
                        />
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        ข้อสอบ
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Test Sets
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        ประเภท
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        ระดับ
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        CEFR
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        สถานะ
                      </th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        จัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredQuestions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-6 py-16 text-center"
                        >
                          <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                          <p className="text-slate-400 text-sm">ไม่พบข้อสอบ</p>
                        </td>
                      </tr>
                    ) : (
                      filteredQuestions.map((question) => (
                        <tr
                          key={question.id}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            selectedIds.has(question.id) ? 'bg-indigo-50/40' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="px-5 py-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(question.id)}
                              onChange={() => toggleSelect(question.id)}
                              className="w-4 h-4 rounded border-slate-300 accent-indigo-600"
                            />
                          </td>

                          {/* Question text */}
                          <td className="px-5 py-4">
                            <div className="max-w-sm">
                              <p className="text-sm font-medium text-slate-900 line-clamp-2">
                                {question.questionText}
                              </p>

                              {/* focus-meaning: show conversation preview */}
                              {question.testTypeId === 'focus-meaning' && (
                                <div className="mt-1.5">
                                  {question.conversation && question.conversation.length > 0 ? (
                                    <div className="space-y-0.5">
                                      {question.conversation.slice(0, 2).map((line, i) => (
                                        <p key={i} className="text-xs text-slate-500">
                                          <span className="font-semibold text-primary-600">
                                            {line.speaker}:
                                          </span>{' '}
                                          {line.text}
                                        </p>
                                      ))}
                                      {question.conversation.length > 2 && (
                                        <p className="text-xs text-slate-400">
                                          ...+{question.conversation.length - 2} บรรทัด
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                                      ยังไม่มีบทสนทนา
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* form-meaning: show article preview */}
                              {question.testTypeId === 'form-meaning' && (
                                <div className="mt-1.5">
                                  {question.article ? (
                                    <div className="space-y-0.5">
                                      <p className="text-xs font-semibold text-purple-700">
                                        {question.article.title}
                                      </p>
                                      <p className="text-xs text-slate-400 line-clamp-1">
                                        {question.article.text}
                                      </p>
                                      <p className="text-xs text-purple-600">
                                        {question.article.blanks?.length || 0} ช่องว่าง
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                                      ยังไม่มีบทความ
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* MCQ options */}
                              {question.testTypeId !== 'form-meaning' && (
                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                  {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                                    const val =
                                      question[`option${opt}` as keyof Question] as string | null;
                                    if (!val) return null;
                                    return (
                                      <span
                                        key={opt}
                                        className={`text-xs px-2 py-0.5 rounded ${
                                          question.correctAnswer === opt
                                            ? 'bg-emerald-100 text-emerald-700 font-semibold'
                                            : 'bg-slate-100 text-slate-500'
                                        }`}
                                      >
                                        {opt}: {val}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Test sets */}
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1 max-w-[160px]">
                              {question.testSets && question.testSets.length > 0 ? (
                                question.testSets.map((ts) => (
                                  <span
                                    key={ts.id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700"
                                  >
                                    {ts.name}
                                    <button
                                      onClick={() =>
                                        handleRemoveFromSet(question.id, ts.id)
                                      }
                                      className="hover:text-red-500 ml-0.5 transition-colors"
                                      title="นำออกจากชุด"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-slate-300 italic">—</span>
                              )}
                            </div>
                          </td>

                          {/* Type */}
                          <td className="px-5 py-4">
                            <span className="text-xs text-slate-600">
                              {question.testType?.name || 'N/A'}
                            </span>
                          </td>

                          {/* Difficulty */}
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                question.difficulty
                                  ? difficultyColors[question.difficulty] ||
                                    'bg-slate-100 text-slate-600'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {question.difficulty || '—'}
                            </span>
                          </td>

                          {/* CEFR */}
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                                cefrColors[question.cefrLevel] ||
                                'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {question.cefrLevel}
                            </span>
                          </td>

                          {/* Status toggle */}
                          <td className="px-5 py-4">
                            <button
                              onClick={() => toggleActive(question)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                question.active === 'true'
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              {question.active === 'true' ? (
                                <>
                                  <CheckCircle className="w-3 h-3" />
                                  ใช้งาน
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3" />
                                  ปิด
                                </>
                              )}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              {/* Preview */}
                              <button
                                onClick={() => setPreviewQuestion(question)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                title="ดูรายละเอียด"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {/* Assign */}
                              <button
                                onClick={() => {
                                  setAssignTargetIds([question.id]);
                                  setAssignModalOpen(true);
                                }}
                                className="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="เพิ่มลงใน Test Set"
                              >
                                <LayoutList className="w-4 h-4" />
                              </button>
                              {/* Duplicate */}
                              <button
                                onClick={() => handleDuplicate(question)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                title="ทำสำเนา"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              {/* Edit */}
                              <Link
                                href={`/admin/questions/${question.id}`}
                                className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                title="แก้ไข"
                              >
                                <Edit className="w-4 h-4" />
                              </Link>
                              {/* Delete */}
                              <button
                                onClick={() => handleDelete(question.id)}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="ลบ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer count */}
            <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
              <p>
                แสดง <span className="font-medium text-slate-700">{filteredQuestions.length}</span>{' '}
                จาก <span className="font-medium text-slate-700">{questions.length}</span> ข้อสอบ
              </p>
              {(searchTerm || selectedDifficulty || selectedCefr) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedDifficulty('');
                    setSelectedCefr('');
                  }}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  ล้าง filter
                </button>
              )}
            </div>
          </>
        )}

        {/* Assign to test set modal */}
        <AssignToTestSetModal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          questionIds={assignTargetIds}
          alreadyAssignedSetIds={
            assignTargetIds.length === 1
              ? (
                  questions.find((q) => q.id === assignTargetIds[0])?.testSets ||
                  []
                ).map((ts) => ts.id)
              : []
          }
          filterSectionId={
            assignTargetIds.length === 1
              ? questions.find((q) => q.id === assignTargetIds[0])?.testTypeId
              : undefined
          }
          onAssignmentComplete={() => {
            fetchQuestions();
            setAssignModalOpen(false);
            setSelectedIds(new Set());
          }}
        />
      </div>

      {/* Quick Preview Modal */}
      {previewQuestion && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-7 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-5">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex flex-wrap gap-2 mb-2">
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      previewQuestion.difficulty
                        ? difficultyColors[previewQuestion.difficulty] ||
                          'bg-slate-100 text-slate-600'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {previewQuestion.difficulty || '—'}
                  </span>
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                      cefrColors[previewQuestion.cefrLevel] ||
                      'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {previewQuestion.cefrLevel}
                  </span>
                  <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                    {previewQuestion.testType?.name || previewQuestion.testTypeId}
                  </span>
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${
                      previewQuestion.active === 'true'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {previewQuestion.active === 'true' ? 'ใช้งาน' : 'ปิดใช้งาน'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                  #{previewQuestion.id} — {previewQuestion.questionText}
                </h3>
              </div>
              <button
                onClick={() => setPreviewQuestion(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg flex-shrink-0 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* focus-meaning: conversation */}
            {previewQuestion.testTypeId === 'focus-meaning' &&
              previewQuestion.conversation &&
              previewQuestion.conversation.length > 0 && (
                <div className="mb-5 bg-slate-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    บทสนทนา
                  </p>
                  {previewQuestion.conversation.map((line, i) => (
                    <p key={i} className="text-sm text-slate-700">
                      <span className="font-bold text-primary-600">{line.speaker}:</span>{' '}
                      {line.text}
                    </p>
                  ))}
                </div>
              )}

            {/* form-meaning: article */}
            {previewQuestion.testTypeId === 'form-meaning' && previewQuestion.article && (
              <div className="mb-5 bg-purple-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">
                  บทความ: {previewQuestion.article.title}
                </p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {previewQuestion.article.text}
                </p>
                {previewQuestion.article.blanks && previewQuestion.article.blanks.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {previewQuestion.article.blanks.map((blank, i) => (
                      <p key={i} className="text-xs text-purple-700">
                        ช่อง {i + 1}: <span className="font-semibold">{blank.correctAnswer}</span>
                        {blank.hint && <span className="text-slate-400"> (hint: {blank.hint})</span>}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MCQ options */}
            {previewQuestion.testTypeId !== 'form-meaning' && (
              <div className="grid grid-cols-2 gap-2 mb-5">
                {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                  const val =
                    previewQuestion[`option${opt}` as keyof Question] as string | null;
                  if (!val) return null;
                  const isCorrect = previewQuestion.correctAnswer === opt;
                  return (
                    <div
                      key={opt}
                      className={`flex items-start gap-2 p-3 rounded-xl border ${
                        isCorrect
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      <span
                        className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                          isCorrect
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-300 text-slate-700'
                        }`}
                      >
                        {opt}
                      </span>
                      <p
                        className={`text-sm ${
                          isCorrect ? 'font-semibold text-emerald-800' : 'text-slate-700'
                        }`}
                      >
                        {val}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Explanation */}
            {previewQuestion.explanation && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                  คำอธิบาย
                </p>
                <p className="text-sm text-slate-700">{previewQuestion.explanation}</p>
              </div>
            )}

            {/* Test sets */}
            {previewQuestion.testSets && previewQuestion.testSets.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  อยู่ใน Test Sets
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {previewQuestion.testSets.map((ts) => (
                    <span
                      key={ts.id}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700"
                    >
                      {ts.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Footer actions */}
            <div className="flex gap-2 pt-4 border-t border-slate-100">
              <Link
                href={`/admin/questions/${previewQuestion.id}`}
                className="flex-1 py-2 text-center text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors"
                onClick={() => setPreviewQuestion(null)}
              >
                แก้ไขข้อสอบนี้
              </Link>
              <button
                onClick={() => setPreviewQuestion(null)}
                className="px-5 py-2 text-sm text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
