'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Plus, Trash2, Upload, X, LayoutList } from 'lucide-react';
import ArticleEditor from '@/components/ArticleEditor';
import AssignToTestSetModal from '@/components/admin/AssignToTestSetModal';
import { toast } from 'sonner';

interface TestType {
  id: string;
  name: string;
  description: string | null;
}

interface ConversationLine {
  speaker: string;
  text: string;
}

interface Blank {
  id: number;
  correctAnswer: string;
  hint?: string;
}

interface Article {
  title: string;
  text: string;
  blanks: Blank[];
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
  conversation?: ConversationLine[] | null;
  audioUrl?: string | null;
  transcript?: string | null;
  article?: Article | null;
}

export default function EditQuestion() {
  const router = useRouter();
  const params = useParams();
  const questionId = params.id as string;

  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [audioUploading, setAudioUploading] = useState(false);
  const [assignedSets, setAssignedSets] = useState<{ id: number; name: string; sectionId: string; orderIndex: number }[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
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
    conversation: [] as ConversationLine[],
    audioUrl: '',
    transcript: '',
    article: { title: '', text: '', blanks: [] } as Article,
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
        const data: Question & { testSets?: { id: number; name: string; sectionId: string; orderIndex: number }[] } = await response.json();
        if (data.testSets) setAssignedSets(data.testSets);
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
          conversation: data.conversation || [],
          audioUrl: data.audioUrl || '',
          transcript: data.transcript || '',
          article: data.article || { title: '', text: '', blanks: [] },
        });
      } else {
        toast.error('ไม่พบข้อสอบ');
        router.push('/admin/questions');
      }
    } catch (error) {
      console.error('Error fetching question:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setFetching(false);
    }
  };

  const handleRemoveFromSet = async (testSetId: number) => {
    try {
      const res = await fetch(`/api/admin/test-sets/${testSetId}/questions/${questionId}`, { method: 'DELETE' });
      if (res.ok) {
        setAssignedSets(assignedSets.filter(ts => ts.id !== testSetId));
      }
    } catch (err) {
      console.error('Error removing from test set:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isFormMeaning = formData.testTypeId === 'form-meaning';
    const isFocusMeaning = formData.testTypeId === 'focus-meaning';
    const isMcq = !isFormMeaning;

    if (!formData.testTypeId || !formData.questionText) {
      toast.error('กรุณากรอกประเภทข้อสอบและโจทย์');
      return;
    }

    if (isMcq) {
      if (!formData.optionA || !formData.optionB || !formData.optionC || !formData.correctAnswer) {
        toast.error('กรุณากรอกตัวเลือก A, B, C และคำตอบที่ถูกต้อง');
        return;
      }
      if (isFocusMeaning && formData.conversation.length === 0) {
        toast.error('กรุณาเพิ่มบทสนทนาอย่างน้อย 1 บรรทัด');
        return;
      }
      if (!isFocusMeaning && !formData.optionD) {
        toast.error('กรุณากรอกตัวเลือก D');
        return;
      }
    }

    if (isFormMeaning && (!formData.article.title || !formData.article.text)) {
      toast.error('กรุณากรอกชื่อบทความและเนื้อหา');
      return;
    }

    if (isFormMeaning && formData.article.blanks.some(b => !b.correctAnswer)) {
      toast.error('กรุณากรอกคำตอบให้ครบทุกช่องว่าง');
      return;
    }

    setLoading(true);

    try {
      const payload: Record<string, unknown> = { ...formData };
      if (formData.testTypeId !== 'focus-meaning') {
        delete payload.conversation;
      }
      if (formData.testTypeId !== 'listening') {
        delete payload.audioUrl;
        delete payload.transcript;
      }
      if (formData.testTypeId !== 'form-meaning') {
        delete payload.article;
      }
      const response = await fetch(`/api/admin/questions/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success('แก้ไขข้อสอบสำเร็จ');
        router.push('/admin/questions');
      } else {
        const error = await response.json();
        toast.error(`เกิดข้อผิดพลาด: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating question:', error);
      toast.error('เกิดข้อผิดพลาดในการแก้ไขข้อสอบ');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (field: 'optionA' | 'optionB' | 'optionC' | 'optionD', value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const addConversationLine = () => {
    setFormData({
      ...formData,
      conversation: [...formData.conversation, { speaker: 'A', text: '' }],
    });
  };

  const removeConversationLine = (index: number) => {
    setFormData({
      ...formData,
      conversation: formData.conversation.filter((_, i) => i !== index),
    });
  };

  const updateConversationLine = (index: number, field: 'speaker' | 'text', value: string) => {
    const updated = [...formData.conversation];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, conversation: updated });
  };

  const uploadAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('audio', file);

      const res = await fetch('/api/admin/upload-audio', {
        method: 'POST',
        body: uploadData,
      });

      if (res.ok) {
        const data = await res.json();
        setFormData({ ...formData, audioUrl: data.url });
      } else {
        const err = await res.json();
        toast.error(`อัพโหลดไฟล์เสียงล้มเหลว: ${err.error}`);
      }
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast.error('เกิดข้อผิดพลาดในการอัพโหลดไฟล์เสียง');
    } finally {
      setAudioUploading(false);
    }
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

          {formData.testTypeId === 'focus-meaning' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">บทสนทนา</h2>
                <button
                  type="button"
                  onClick={addConversationLine}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  เพิ่มบรรทัด
                </button>
              </div>

              {formData.conversation.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                  <p className="text-slate-500 mb-2">ยังไม่มีบทสนทนา</p>
                  <button
                    type="button"
                    onClick={addConversationLine}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    + เพิ่มบรรทัดสนทนา
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.conversation.map((line, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-500 mt-2 shrink-0">{index + 1}.</span>
                      <div className="flex-1 grid grid-cols-[80px_1fr] gap-3">
                        <select
                          value={line.speaker}
                          onChange={(e) => updateConversationLine(index, 'speaker', e.target.value)}
                          className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                        </select>
                        <input
                          type="text"
                          value={line.text}
                          onChange={(e) => updateConversationLine(index, 'text', e.target.value)}
                          className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                          placeholder="ข้อความ..."
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeConversationLine(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {formData.testTypeId === 'form-meaning' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6">บทความ (Fill in the blanks)</h2>
              <ArticleEditor
                article={formData.article}
                onChange={(article) => setFormData({ ...formData, article })}
              />
            </div>
          )}

          {formData.testTypeId !== 'form-meaning' && (
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

              {/* Option D - optional for focus-meaning */}
              {formData.testTypeId !== 'focus-meaning' ? (
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
              ) : (
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
                  placeholder="ตัวเลือก D (ไม่จำเป็น)"
                />
              </div>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-4">
              เลือกวงกลมเพื่อระบุคำตอบที่ถูกต้อง
            </p>
          </div>
          )}

          {formData.testTypeId === 'listening' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-6">ไฟล์เสียงและคำบรรยาย</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    อัพโหลดไฟล์เสียง
                  </label>
                  <div className="flex items-center gap-3">
                    <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
                      audioUploading
                        ? 'border-slate-300 bg-slate-50 cursor-not-allowed'
                        : 'border-slate-200 hover:border-primary-400 hover:bg-primary-50'
                    }`}>
                      <Upload className="w-4 h-4" />
                      <span className="text-sm font-medium text-slate-600">
                        {audioUploading ? 'กำลังอัพโหลด...' : 'เลือกไฟล์ .mp3'}
                      </span>
                      <input
                        type="file"
                        accept="audio/mpeg,.mp3"
                        onChange={uploadAudio}
                        disabled={audioUploading}
                        className="hidden"
                      />
                    </label>
                    {formData.audioUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, audioUrl: '' })}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="ลบไฟล์เสียง"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {audioUploading && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500" />
                      กำลังอัพโหลดไฟล์เสียง...
                    </div>
                  )}
                </div>

                {formData.audioUrl && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      ตัวอย่างเสียง
                    </label>
                    <audio controls src={formData.audioUrl} className="w-full max-w-md" />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    หรือใส่ Audio URL ด้วยตนเอง
                  </label>
                  <input
                    type="url"
                    value={formData.audioUrl}
                    onChange={(e) => setFormData({ ...formData, audioUrl: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="https://example.com/audio.mp3 หรือ /audio/listening/file.mp3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    คำบรรยาย (Transcript)
                  </label>
                  <textarea
                    value={formData.transcript}
                    onChange={(e) => setFormData({ ...formData, transcript: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={4}
                    placeholder="คำบรรยายเสียง..."
                  />
                </div>
              </div>
            </div>
          )}

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

          {/* Test Sets Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <LayoutList className="w-5 h-5 text-indigo-600" />
                Test Sets
              </h2>
              <button
                type="button"
                onClick={() => setAssignModalOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                เพิ่มลงใน Test Set
              </button>
            </div>
            {assignedSets.length === 0 ? (
              <p className="text-sm text-slate-400">ยังไม่ได้เพิ่มใน Test Set ใด</p>
            ) : (
              <div className="space-y-2">
                {assignedSets.map(ts => (
                  <div key={ts.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{ts.name}</p>
                      <p className="text-xs text-slate-400">Section: {ts.sectionId} | Order: {ts.orderIndex}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromSet(ts.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="นำออกจากชุด"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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

        <AssignToTestSetModal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          questionIds={[Number(questionId)]}
          alreadyAssignedSetIds={assignedSets.map(ts => ts.id)}
          filterSectionId={formData.testTypeId}
          onAssignmentComplete={async () => {
            setAssignModalOpen(false);
            const res = await fetch(`/api/admin/questions/${questionId}`);
            if (res.ok) {
              const data = await res.json();
              if (data.testSets) setAssignedSets(data.testSets);
            }
          }}
        />
      </div>
    </div>
  );
}
