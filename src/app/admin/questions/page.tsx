'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface ConversationLine {
  speaker: string;
  text: string;
}

interface Article {
  title: string;
  text: string;
  blanks: { id: number; correctAnswer: string; hint?: string }[];
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

export default function QuestionsManagement() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTestType, setSelectedTestType] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');

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
        setQuestions(questions.filter(q => q.id !== id));
        alert('ลบข้อสอบสำเร็จ');
      } else {
        alert('เกิดข้อผิดพลาดในการลบข้อสอบ');
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('เกิดข้อผิดพลาดในการลบข้อสอบ');
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
        setQuestions(questions.map(q => q.id === updated.id ? updated : q));
      }
    } catch (error) {
      console.error('Error toggling question status:', error);
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.questionText.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = !selectedDifficulty || q.difficulty === selectedDifficulty;
    return matchesSearch && matchesDifficulty;
  });

  const difficultyColors: Record<string, string> = {
    'easy': 'bg-emerald-100 text-emerald-700',
    'medium': 'bg-amber-100 text-amber-700',
    'hard': 'bg-red-100 text-red-700',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-slate-600 hover:text-primary-600">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">จัดการข้อสอบ</h1>
              <p className="text-slate-600 mt-1">เพิ่ม แก้ไข และจัดการข้อสอบทั้งหมด</p>
            </div>
          </div>
          <Link href="/admin/questions/new" className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-5 h-5" />
            เพิ่มข้อสอบใหม่
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="ค้นหาข้อสอบ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <select
              value={selectedTestType}
              onChange={(e) => setSelectedTestType(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">ประเภทข้อสอบทั้งหมด</option>
              {testTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>

            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">ระดับความยากทั้งหมด</option>
              <option value="easy">ง่าย</option>
              <option value="medium">ปานกลาง</option>
              <option value="hard">ยาก</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="text-slate-600 mt-4">กำลังโหลดข้อมูล...</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      ข้อสอบ
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      ประเภท
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      ระดับ
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      CEFR
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      สถานะ
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredQuestions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        ไม่พบข้อสอบ
                      </td>
                    </tr>
                  ) : (
                    filteredQuestions.map((question) => (
                      <tr key={question.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="max-w-md">
                            <p className="text-sm font-medium text-slate-900 line-clamp-2">
                              {question.questionText}
                            </p>
                            {question.testTypeId === 'focus-meaning' && (
                              <div className="mt-2">
                                {question.conversation && question.conversation.length > 0 ? (
                                  <div className="space-y-1">
                                    {question.conversation.slice(0, 3).map((line, i) => (
                                      <p key={i} className="text-xs text-slate-600">
                                        <span className="font-semibold text-primary-600">{line.speaker}:</span> {line.text}
                                      </p>
                                    ))}
                                    {question.conversation.length > 3 && (
                                      <p className="text-xs text-slate-400">
                                        ...และอีก {question.conversation.length - 3} บรรทัด
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 font-medium">
                                    ยังไม่มีบทสนทนา
                                  </span>
                                )}
                              </div>
                            )}
                            {question.testTypeId === 'form-meaning' && (
                              <div className="mt-2">
                                {question.article ? (
                                  <div className="space-y-1">
                                    <p className="text-xs font-semibold text-purple-700">{question.article.title}</p>
                                    <p className="text-xs text-slate-500 line-clamp-1">{question.article.text}</p>
                                    <p className="text-xs text-purple-600">{question.article.blanks?.length || 0} ช่องว่าง</p>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 font-medium">
                                    ยังไม่มีบทความ
                                  </span>
                                )}
                              </div>
                            )}
                            {question.testTypeId !== 'form-meaning' && (
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {question.optionA && (
                                <span className={`text-xs px-2 py-1 rounded ${question.correctAnswer === 'A' ? 'bg-emerald-100 text-emerald-700 font-medium' : 'bg-slate-100 text-slate-600'}`}>
                                  A: {question.optionA}
                                </span>
                              )}
                              {question.optionB && (
                                <span className={`text-xs px-2 py-1 rounded ${question.correctAnswer === 'B' ? 'bg-emerald-100 text-emerald-700 font-medium' : 'bg-slate-100 text-slate-600'}`}>
                                  B: {question.optionB}
                                </span>
                              )}
                              {question.optionC && (
                                <span className={`text-xs px-2 py-1 rounded ${question.correctAnswer === 'C' ? 'bg-emerald-100 text-emerald-700 font-medium' : 'bg-slate-100 text-slate-600'}`}>
                                  C: {question.optionC}
                                </span>
                              )}
                              {question.optionD && (
                                <span className={`text-xs px-2 py-1 rounded ${question.correctAnswer === 'D' ? 'bg-emerald-100 text-emerald-700 font-medium' : 'bg-slate-100 text-slate-600'}`}>
                                  D: {question.optionD}
                                </span>
                              )}
                            </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600">
                            {question.testType?.name || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${question.difficulty ? (difficultyColors[question.difficulty] || 'bg-slate-100 text-slate-700') : 'bg-slate-100 text-slate-700'}`}>
                            {question.difficulty || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-900">
                            {question.cefrLevel}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleActive(question)}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                              question.active === 'true'
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                                ปิดใช้งาน
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/questions/${question.id}`}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="แก้ไข"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDelete(question.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
        )}

        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            แสดง {filteredQuestions.length} จาก {questions.length} ข้อสอบ
          </p>
        </div>
      </div>
    </div>
  );
}
