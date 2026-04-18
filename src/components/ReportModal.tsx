'use client';

import { useState } from 'react';
import { X, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const ISSUE_TYPES = [
  { value: 'wrong_answer',     label: '❌ คำตอบที่ถูกต้องไม่ถูกต้อง' },
  { value: 'missing_option',   label: '📋 ตัวเลือกไม่ครบหรือผิดพลาด' },
  { value: 'unclear_language', label: '💬 ภาษาสับสนหรืออ่านไม่เข้าใจ' },
  { value: 'audio_problem',    label: '🔊 เสียงมีปัญหา' },
  { value: 'other',            label: '🔧 อื่นๆ' },
];

interface ReportModalProps {
  questionId: number;
  questionNumber: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReportModal({
  questionId,
  questionNumber,
  onClose,
  onSuccess,
}: ReportModalProps) {
  const [issueType, setIssueType] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!issueType) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/questions/${questionId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueType, comment }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      setSubmitted(true);
      toast.success('ขอบคุณ! รับรายงานแล้ว ทีมงานจะตรวจสอบโดยเร็ว');
      onSuccess();
      setTimeout(() => onClose(), 1500);
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="bg-orange-100 p-2 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-sm">แจ้งปัญหาข้อสอบ</h2>
              <p className="text-xs text-slate-500">ข้อที่ {questionNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          /* Success State */
          <div className="p-8 text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-bold text-slate-800 mb-1">รับรายงานแล้ว!</h3>
            <p className="text-sm text-slate-500">ขอบคุณที่ช่วยปรับปรุงระบบ</p>
          </div>
        ) : (
          <>
            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Issue Type Chips */}
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2.5">
                  ประเภทปัญหา <span className="text-red-500">*</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {ISSUE_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setIssueType(type.value)}
                      className={`px-3 py-1.5 rounded-full text-sm border font-medium transition-all ${
                        issueType === type.value
                          ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                          : 'border-slate-200 text-slate-600 bg-white hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">
                  อธิบายเพิ่มเติม{' '}
                  <span className="font-normal text-slate-400">(ไม่บังคับ)</span>
                </p>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="เช่น ตัวเลือก B น่าจะผิด เพราะ..."
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition-colors placeholder:text-slate-300"
                />
                <p className="text-xs text-slate-400 text-right mt-1">
                  {comment.length}/500
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 pt-0">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmit}
                disabled={!issueType || loading}
                className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 active:scale-95 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังส่ง...
                  </>
                ) : (
                  'ส่งรายงาน'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
