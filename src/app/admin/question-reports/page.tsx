'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertTriangle,
  ExternalLink,
  Clock,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

const ISSUE_LABELS: Record<string, string> = {
  wrong_answer: '❌ คำตอบไม่ถูกต้อง',
  missing_option: '📋 ตัวเลือกไม่ครบ',
  unclear_language: '💬 ภาษาสับสน',
  audio_problem: '🔊 เสียงมีปัญหา',
  other: '🔧 อื่นๆ',
};

const STATUS_CFG = {
  pending:     { label: 'รอดำเนินการ', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  in_progress: { label: 'กำลังแก้ไข',  color: 'bg-blue-100 text-blue-700 border-blue-200' },
  resolved:    { label: 'แก้ไขแล้ว',   color: 'bg-green-100 text-green-700 border-green-200' },
} as const;

interface QuestionReport {
  id: number;
  questionId: number;
  questionText: string | null;
  testTypeId: string | null;
  userEmail: string | null;
  issueType: string;
  comment: string | null;
  status: 'pending' | 'in_progress' | 'resolved';
  createdAt: string;
}

export default function AdminQuestionReportsPage() {
  const [reports, setReports] = useState<QuestionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchReports = async (statusFilter: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/question-reports?status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(filter);
  }, [filter]);

  const updateStatus = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/question-reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        setReports(prev =>
          prev.map(r => r.id === id ? { ...r, status: status as QuestionReport['status'] } : r)
        );
        toast.success('อัพเดตสถานะแล้ว');
      } else {
        toast.error('ไม่สามารถอัพเดตได้');
      }
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const counts = {
    all: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    in_progress: reports.filter(r => r.status === 'in_progress').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/admin"
            className="p-2 rounded-xl hover:bg-slate-200 transition-colors text-slate-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <div className="bg-orange-100 p-1.5 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              รายงานปัญหาข้อสอบ
              {pendingCount > 0 && (
                <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                  {pendingCount}
                </span>
              )}
            </h1>
            <p className="text-slate-500 text-sm mt-1">รายงานปัญหาจากผู้ใช้งานระหว่างทำข้อสอบ</p>
          </div>
          <button
            onClick={() => fetchReports(filter)}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            รีเฟรช
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { value: 'all',         label: 'ทั้งหมด' },
            { value: 'pending',     label: 'รอดำเนินการ' },
            { value: 'in_progress', label: 'กำลังแก้ไข' },
            { value: 'resolved',    label: 'แก้ไขแล้ว' },
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === tab.value
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-600'
              }`}
            >
              {tab.label}
              {counts[tab.value as keyof typeof counts] > 0 && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                  filter === tab.value ? 'bg-orange-400' : 'bg-slate-100 text-slate-500'
                }`}>
                  {counts[tab.value as keyof typeof counts]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center shadow-sm">
            <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-slate-700 font-semibold">ไม่มีรายงานในขณะนี้</p>
            <p className="text-slate-400 text-sm mt-1">ยอดเยี่ยม! ไม่มีปัญหาที่รอการแก้ไข</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(report => {
              const cfg = STATUS_CFG[report.status];
              const isUpdating = updatingId === report.id;

              return (
                <div
                  key={report.id}
                  className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                          #{report.questionId}
                        </span>
                        <span className="bg-orange-50 text-orange-700 text-xs px-2.5 py-0.5 rounded-full font-medium border border-orange-100">
                          {ISSUE_LABELS[report.issueType] ?? report.issueType}
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {report.testTypeId && (
                          <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                            {report.testTypeId}
                          </span>
                        )}
                      </div>

                      {/* Question text preview */}
                      <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed">
                        {report.questionText ?? <span className="italic text-slate-400">ไม่พบข้อความ</span>}
                      </p>

                      {/* Comment */}
                      {report.comment && (
                        <div className="mt-2 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                          <p className="text-xs text-slate-600 leading-relaxed">💬 {report.comment}</p>
                        </div>
                      )}

                      {/* Meta */}
                      <div className="flex items-center gap-4 mt-2.5 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(report.createdAt).toLocaleDateString('th-TH', {
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                        {report.userEmail && (
                          <span className="truncate max-w-[180px]">{report.userEmail}</span>
                        )}
                        {!report.userEmail && (
                          <span className="italic">ผู้ใช้ไม่ระบุตัวตน</span>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Link
                        href={`/admin/questions?highlight=${report.questionId}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        ดูข้อสอบ
                      </Link>
                      <select
                        value={report.status}
                        onChange={(e) => updateStatus(report.id, e.target.value)}
                        disabled={isUpdating}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:opacity-50 cursor-pointer hover:border-slate-300 transition-colors"
                      >
                        <option value="pending">รอดำเนินการ</option>
                        <option value="in_progress">กำลังแก้ไข</option>
                        <option value="resolved">แก้ไขแล้ว</option>
                      </select>
                      {isUpdating && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
