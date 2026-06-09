'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Star,
  Clock,
  CheckCircle2,
  Loader2,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';

interface TestFeedbackItem {
  id: number;
  attemptId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  testTypeId: string | null;
  testTypeName: string | null;
  score: string | null;
  totalQuestions: number | null;
  userName: string | null;
  userEmail: string | null;
}

export default function AdminTestFeedbackPage() {
  const [feedback, setFeedback] = useState<TestFeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/test-feedback');
      if (res.ok) {
        const data = await res.json();
        setFeedback(data);
      }
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const avgRating = feedback.length > 0
    ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1)
    : '—';

  const ratingDist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: feedback.filter(f => f.rating === star).length,
  }));

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
              <div className="bg-amber-100 p-1.5 rounded-xl">
                <MessageSquare className="w-5 h-5 text-amber-600" />
              </div>
              คะแนนการทดสอบ
              <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                {feedback.length}
              </span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">รีวิวและความคิดเห็นจากผู้ใช้หลังทำข้อสอบ</p>
          </div>
          <button
            onClick={fetchFeedback}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            รีเฟรช
          </button>
        </div>

        {/* Summary Stats */}
        {feedback.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm text-center">
              <p className="text-3xl font-bold text-slate-900">{avgRating}</p>
              <div className="flex items-center justify-center gap-0.5 mt-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${s <= Math.round(Number(avgRating)) ? 'text-amber-400 fill-current' : 'text-slate-200'}`}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">คะแนนเฉลี่ย</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm text-center">
              <p className="text-3xl font-bold text-slate-900">{feedback.length}</p>
              <p className="text-xs text-slate-400 mt-1">รีวิวทั้งหมด</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="space-y-1">
                {ratingDist.map(d => (
                  <div key={d.star} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-3">{d.star}</span>
                    <Star className="w-3 h-3 text-amber-400 fill-current" />
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-amber-400 h-full rounded-full transition-all"
                        style={{ width: `${feedback.length > 0 ? (d.count / feedback.length) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 w-4 text-right">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : feedback.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center shadow-sm">
            <div className="bg-amber-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-amber-500" />
            </div>
            <p className="text-slate-700 font-semibold">ยังไม่มีคะแนนรีวิว</p>
            <p className="text-slate-400 text-sm mt-1">รอผู้ใช้ทำข้อสอบแล้วให้คะแนน</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feedback.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                        Attempt #{item.attemptId}
                      </span>
                      <span className="bg-amber-50 text-amber-700 text-xs px-2.5 py-0.5 rounded-full font-medium border border-amber-100">
                        {item.testTypeName ?? item.testTypeId ?? '—'}
                      </span>
                      {item.score && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                          Number(item.score) >= 70
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : Number(item.score) >= 50
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {item.score}%
                        </span>
                      )}
                    </div>

                    {/* Stars */}
                    <div className="flex items-center gap-0.5 mb-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star
                          key={s}
                          className={`w-5 h-5 ${s <= item.rating ? 'text-amber-400 fill-current' : 'text-slate-200'}`}
                        />
                      ))}
                      <span className="text-sm font-medium text-slate-700 ml-2">{item.rating}/5</span>
                    </div>

                    {/* Comment */}
                    {item.comment && (
                      <div className="mt-2 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                        <p className="text-sm text-slate-600 leading-relaxed">{item.comment}</p>
                      </div>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-4 mt-2.5 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.createdAt).toLocaleDateString('th-TH', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                      {item.userName && <span>{item.userName}</span>}
                      {item.userEmail && <span className="truncate max-w-[180px]">{item.userEmail}</span>}
                    </div>
                  </div>

                  {/* Right: Action */}
                  <Link
                    href={`/review/${item.attemptId}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all shrink-0"
                  >
                    ดูผลสอบ
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
