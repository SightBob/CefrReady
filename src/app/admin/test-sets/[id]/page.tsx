'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, BookOpen, Plus, Trash2, Loader2, LayoutList, X,
  GripVertical, ChevronDown, ChevronUp
} from 'lucide-react';
import AssignToTestSetModal from '@/components/admin/AssignToTestSetModal';
import ArticleEditor from '@/components/ArticleEditor';
import { toast } from 'sonner';

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
  difficulty: string;
  cefrLevel: string;
  active: string;
  orderIndex: number;
  createdAt: string;
  conversation?: { speaker: string; text: string }[];
  article?: { title: string; text: string; blanks: { id: number; correctAnswer: string; hint?: string }[] };
  audioUrl?: string;
  transcript?: string;
}

interface SetQuestion {
  assignmentId: number;
  orderIndex: number;
  question: Question;
}

interface TestSet {
  id: number;
  sectionId: string;
  name: string;
  description: string | null;
  orderIndex: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Section {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

const SECTION_COLORS: Record<string, string> = {
  'focus-form': 'from-blue-500 to-cyan-500',
  'focus-meaning': 'from-emerald-500 to-teal-500',
  'form-meaning': 'from-purple-500 to-pink-500',
  'listening': 'from-orange-500 to-amber-500',
};

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

export default function TestSetDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const setId = parseInt(params.id);

  const [testSet, setTestSet] = useState<TestSet | null>(null);
  const [section, setSection] = useState<Section | null>(null);
  const [questions, setQuestions] = useState<SetQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Create question form state
  const [formData, setFormData] = useState({
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 'A',
    explanation: '',
    difficulty: 'medium',
    cefrLevel: 'B1',
    conversation: [] as ConversationLine[],
    article: { title: '', text: '', blanks: [] } as Article,
    audioUrl: '',
    transcript: '',
  });
  const [creating, setCreating] = useState(false);
  const [audioUploading, setAudioUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [setId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/test-sets/${setId}`);
      if (res.ok) {
        const json = await res.json();
        setTestSet(json.data);
        setQuestions(json.data.questions || []);

        // Get section info
        const sectionRes = await fetch('/api/admin/test-types');
        if (sectionRes.ok) {
          const sections = await sectionRes.json();
          const sec = sections.find((s: Section) => s.id === json.data.sectionId);
          setSection(sec || null);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveQuestion = async (questionId: number) => {
    if (!confirm('ลบข้อสอบนี้ออกจากชุด?')) return;

    setDeletingId(questionId);
    try {
      const res = await fetch(`/api/admin/test-sets/${setId}/questions/${questionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchData();
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    const isFormMeaning = section?.id === 'form-meaning';
    const isFocusMeaning = section?.id === 'focus-meaning';
    const isMcq = !isFormMeaning;

    if (!formData.questionText) {
      toast.error('กรุณากรอกโจทย์');
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

    setCreating(true);

    try {
      const payload: Record<string, unknown> = { ...formData };
      if (section?.id !== 'focus-meaning') {
        delete payload.conversation;
      }
      if (section?.id !== 'listening') {
        delete payload.audioUrl;
        delete payload.transcript;
      }
      if (section?.id !== 'form-meaning') {
        delete payload.article;
      }

      const response = await fetch(`/api/admin/test-sets/${setId}/questions/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setCreateModalOpen(false);
        resetForm();
        await fetchData();
      } else {
        const error = await response.json();
        toast.error(`เกิดข้อผิดพลาด: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating question:', error);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มข้อสอบ');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      questionText: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctAnswer: 'A',
      explanation: '',
      difficulty: 'medium',
      cefrLevel: 'B1',
      conversation: [],
      article: { title: '', text: '', blanks: [] },
      audioUrl: '',
      transcript: '',
    });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!testSet) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">ไม่พบ Test Set</p>
      </div>
    );
  }

  const isFormMeaning = section?.id === 'form-meaning';
  const isFocusMeaning = section?.id === 'focus-meaning';
  const isListening = section?.id === 'listening';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/test-sets" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-3 transition-colors">
            <ArrowLeft className="w-4 h-4" /> กลับ Test Sets
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-3 h-10 rounded-full bg-gradient-to-b ${section ? (SECTION_COLORS[section.id] ?? 'from-slate-400 to-slate-500') : 'from-slate-400 to-slate-500'}`} />
                <h1 className="text-3xl font-bold text-slate-900">{testSet.name}</h1>
                {!testSet.isActive && (
                  <span className="px-2 py-1 bg-slate-200 text-slate-600 text-xs font-medium rounded-full">
                    ปิดใช้งาน
                  </span>
                )}
              </div>
              <p className="text-slate-500">{section?.name}</p>
              {testSet.description && (
                <p className="text-slate-400 text-sm mt-1">{testSet.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                questions.length >= 20 ? 'bg-emerald-100 text-emerald-700' :
                questions.length > 0 ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-500'
              }`}>
                {questions.length}/20 ข้อ
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setAssignModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors font-medium"
          >
            <LayoutList className="w-4 h-4" />
            เพิ่มข้อสอบจากที่มีอยู่
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            สร้างข้อสอบใหม่
          </button>
        </div>

        {/* Questions list */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {questions.length === 0 ? (
            <div className="py-16 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-2">ยังไม่มีข้อสอบในชุดนี้</p>
              <p className="text-slate-400 text-sm">เริ่มเพิ่มข้อสอบโดยกดปุ่มด้านบน</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {questions.map((sq, idx) => (
                <div key={sq.assignmentId} className="flex items-start gap-4 p-5 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-center gap-2 pt-1">
                    <GripVertical className="w-4 h-4 text-slate-300" />
                    <span className="text-sm font-medium text-slate-400 w-6">{idx + 1}.</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 line-clamp-2">{sq.question.questionText}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-slate-400">{sq.question.cefrLevel}</span>
                      <span className="text-xs text-slate-400 capitalize">{sq.question.difficulty}</span>
                      {isFormMeaning && sq.question.article && (
                        <span className="text-xs text-slate-400">บทความ: {sq.question.article.title}</span>
                      )}
                      {isListening && sq.question.audioUrl && (
                        <span className="text-xs text-slate-400">มีไฟล์เสียง</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/admin/questions/${sq.question.id}`}
                      className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="แก้ไข"
                    >
                      <Plus className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleRemoveQuestion(sq.question.id)}
                      disabled={deletingId === sq.question.id}
                      className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="ลบออกจากชุด"
                    >
                      {deletingId === sq.question.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assign to Test Set Modal */}
      <AssignToTestSetModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        questionIds={[]}
        alreadyAssignedSetIds={[setId]}
        filterSectionId={section?.id}
        onAssignmentComplete={() => {
          setAssignModalOpen(false);
          fetchData();
        }}
      />

      {/* Create Question Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900">สร้างข้อสอบใหม่</h2>
                <p className="text-sm text-slate-500 mt-0.5">จะถูกเพิ่มลงใน {testSet.name} อัตโนมัติ</p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleCreateQuestion} className="space-y-5">
                {/* Basic info */}
                <div className="space-y-4">
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

                  <div className="grid grid-cols-2 gap-4">
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
                </div>

                {/* Focus Meaning - Conversation */}
                {isFocusMeaning && (
                  <div className="bg-slate-50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900">บทสนทนา</h3>
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
                      <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
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
                      <div className="space-y-2">
                        {formData.conversation.map((line, index) => (
                          <div key={index} className="flex items-start gap-2 p-2 bg-white rounded-lg">
                            <span className="text-sm font-medium text-slate-500 mt-2 shrink-0">{index + 1}.</span>
                            <div className="flex-1 grid grid-cols-[70px_1fr] gap-2">
                              <select
                                value={line.speaker}
                                onChange={(e) => updateConversationLine(index, 'speaker', e.target.value)}
                                className="px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
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
                                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                                placeholder="ข้อความ..."
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeConversationLine(index)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Form Meaning - Article */}
                {isFormMeaning && (
                  <div className="bg-slate-50 rounded-xl p-5">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">บทความ (Fill in the blanks)</h3>
                    <ArticleEditor
                      article={formData.article}
                      onChange={(article) => setFormData({ ...formData, article })}
                    />
                  </div>
                )}

                {/* Listening - Audio */}
                {isListening && (
                  <div className="bg-slate-50 rounded-xl p-5">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">ไฟล์เสียงและคำบรรยาย</h3>

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
                            <Plus className="w-4 h-4" />
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

                {/* Options (not for form-meaning) */}
                {!isFormMeaning && (
                  <div className="bg-slate-50 rounded-xl p-5">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">ตัวเลือกคำตอบ</h3>

                    <div className="space-y-3">
                      {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                        <div key={opt} className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="correctAnswer"
                            checked={formData.correctAnswer === opt}
                            onChange={() => setFormData({ ...formData, correctAnswer: opt })}
                            className="w-5 h-5 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="w-8 font-bold text-slate-700">{opt}</span>
                          <input
                            type="text"
                            value={(formData as unknown as Record<string, string>)[`option${opt}`]}
                            onChange={(e) => setFormData({ ...formData, [`option${opt}`]: e.target.value })}
                            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder={`ตัวเลือก ${opt}`}
                            required={['A', 'B', 'C'].includes(opt) || isFocusMeaning}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-slate-500 mt-4">
                      เลือกวงกลมเพื่อระบุคำตอบที่ถูกต้อง
                    </p>
                  </div>
                )}

                {/* Explanation */}
                <div className="bg-slate-50 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">คำอธิบาย</h3>
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
              </form>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100">
              <button
                onClick={() => setCreateModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCreateQuestion}
                disabled={creating}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    สร้างและเพิ่มลงชุด
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
