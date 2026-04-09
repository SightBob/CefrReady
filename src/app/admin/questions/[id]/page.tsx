'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';

interface TestType {
  id: string;
  name: string;
  description: string | null;
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
}

export default function EditQuestion() {
  const router = useRouter();
  const params = useParams();
  const questionId = params.id as string;

  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    testTypeId: '',
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: '',
    explanation: '',
    difficulty: 'medium',
    cefrLevel: 'B1',
    active: 'true',
    orderIndex: 0,
  });

  useEffect(() => {
    fetchTestTypes();
    fetchQuestion();
  }, [questionId]);

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

  const fetchQuestion = async () => {
    try {
      const response = await fetch(`/api/admin/questions/${questionId}`);
      if (response.ok) {
        const data: Question = await response.json();
        setFormData({
          testTypeId: data.testTypeId,
          questionText: data.questionText,
          optionA: data.optionA || '',
          optionB: data.optionB || '',
          optionC: data.optionC || '',
          optionD: data.optionD || '',
          correctAnswer: data.correctAnswer || '',
          explanation: data.explanation || '',
          difficulty: data.difficulty || 'medium',
          cefrLevel: data.cefrLevel,
          active: data.active,
          orderIndex: data.orderIndex,
        });
      } else {
        alert('ไม่พบข้อสอบ');
        router.push('/admin/questions');
      }
    } catch (error) {
      console.error('Error fetching question:', error);
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.testTypeId || !formData.questionText || !formData.optionA || !formData.optionB || !formData.optionC || !formData.optionD || !formData.correctAnswer) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/admin/questions/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
        }),
      });

      if (response.ok) {
        alert('แก้ไขข้อสอบสำเร็จ');
        router.push('/admin/questions');
      } else {
        const error = await response.json();
        alert(`เกิดข้อผิดพลาด: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating question:', error);
      alert('เกิดข้อผิดพลาดในการแก้ไขข้อสอบ');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (field: 'optionA' | 'optionB' | 'optionC' | 'optionD', value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="text-slate-600 mt-4">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/questions" className="text-slate-600 hover:text-primary-600">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">แก้ไขข้อสอบ</h1>
            <p className="text-slate-600 mt-1">แก้ไขข้อมูลข้อสอบ ID: {questionId}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6">ข้อมูลพื้นฐาน</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ประเภทข้อสอบ <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.testTypeId}
                  onChange={(e) => setFormData({ ...formData, testTypeId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">เลือกประเภทข้อสอบ</option>
                  {testTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  โจทย์ข้อสอบ <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.questionText}
                  onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    ระดับความยาก <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="easy">ง่าย (Easy)</option>
                    <option value="medium">ปานกลาง (Medium)</option>
                    <option value="hard">ยาก (Hard)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    ระดับ CEFR <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.cefrLevel}
                    onChange={(e) => setFormData({ ...formData, cefrLevel: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="A1">A1 - Beginner</option>
                    <option value="A2">A2 - Elementary</option>
                    <option value="B1">B1 - Intermediate</option>
                    <option value="B2">B2 - Upper Intermediate</option>
                    <option value="C1">C1 - Advanced</option>
                    <option value="C2">C2 - Proficient</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    ลำดับการแสดง
                  </label>
                  <input
                    type="number"
                    value={formData.orderIndex}
                    onChange={(e) => setFormData({ ...formData, orderIndex: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    สถานะ
                  </label>
                  <select
                    value={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="true">ใช้งาน</option>
                    <option value="false">ปิดใช้งาน</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6">ตัวเลือกคำตอบ</h2>

            <div className="space-y-3">
              {/* Option A */}
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="correctAnswer"
                  checked={formData.correctAnswer === 'A'}
                  onChange={() => setFormData({ ...formData, correctAnswer: 'A' })}
                  className="w-5 h-5 text-primary-600 focus:ring-primary-500"
                />
                <span className="w-8 font-bold text-slate-700">A</span>
                <input
                  type="text"
                  value={formData.optionA}
                  onChange={(e) => handleOptionChange('optionA', e.target.value)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="ตัวเลือก A"
                  required
                />
              </div>

              {/* Option B */}
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="correctAnswer"
                  checked={formData.correctAnswer === 'B'}
                  onChange={() => setFormData({ ...formData, correctAnswer: 'B' })}
                  className="w-5 h-5 text-primary-600 focus:ring-primary-500"
                />
                <span className="w-8 font-bold text-slate-700">B</span>
                <input
                  type="text"
                  value={formData.optionB}
                  onChange={(e) => handleOptionChange('optionB', e.target.value)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="ตัวเลือก B"
                  required
                />
              </div>

              {/* Option C */}
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="correctAnswer"
                  checked={formData.correctAnswer === 'C'}
                  onChange={() => setFormData({ ...formData, correctAnswer: 'C' })}
                  className="w-5 h-5 text-primary-600 focus:ring-primary-500"
                />
                <span className="w-8 font-bold text-slate-700">C</span>
                <input
                  type="text"
                  value={formData.optionC}
                  onChange={(e) => handleOptionChange('optionC', e.target.value)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="ตัวเลือก C"
                  required
                />
              </div>

              {/* Option D */}
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="correctAnswer"
                  checked={formData.correctAnswer === 'D'}
                  onChange={() => setFormData({ ...formData, correctAnswer: 'D' })}
                  className="w-5 h-5 text-primary-600 focus:ring-primary-500"
                />
                <span className="w-8 font-bold text-slate-700">D</span>
                <input
                  type="text"
                  value={formData.optionD}
                  onChange={(e) => handleOptionChange('optionD', e.target.value)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="ตัวเลือก D"
                  required
                />
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-4">
              เลือกวงกลมเพื่อระบุคำตอบที่ถูกต้อง
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6">คำอธิบาย</h2>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                คำอธิบายเฉลย <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={4}
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-4">
            <Link href="/admin/questions" className="btn-secondary">
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary inline-flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  บันทึกการแก้ไข
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
