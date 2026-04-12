'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  FileQuestion, 
  Users, 
  BarChart3,
  Settings,
  AlertTriangle
} from 'lucide-react';

interface Stats {
  totalQuestions: number;
  totalUsers: number;
  totalTests: number;
  activeQuestions: number;
  hardestQuestions: Array<{
    questionId: number;
    questionText: string;
    wrongCount: number;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      title: 'จัดการข้อสอบ',
      description: 'เพิ่ม แก้ไข ลบข้อสอบ',
      icon: FileQuestion,
      href: '/admin/questions',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      count: stats?.totalQuestions ?? 0,
    },
    {
      title: 'ประเภทข้อสอบ',
      description: 'จัดการประเภทข้อสอบ',
      icon: LayoutDashboard,
      href: '/admin/test-types',
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50',
      count: stats?.totalTests ?? 0,
    },
    {
      title: 'ผู้ใช้งาน',
      description: 'จัดการผู้ใช้งานระบบ',
      icon: Users,
      href: '/admin/users',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
      count: stats?.totalUsers ?? 0,
    },
    {
      title: 'รายงาน',
      description: 'สถิติและรายงานผลการทดสอบ',
      icon: BarChart3,
      href: '/admin/reports',
      color: 'from-orange-500 to-amber-500',
      bgColor: 'bg-orange-50',
      count: 0,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-slate-600 mt-1">จัดการระบบข้อสอบ CEFR</p>
          </div>
          <Link href="/" className="btn-secondary">
            กลับหน้าหลัก
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'ข้อสอบทั้งหมด', value: stats?.totalQuestions, icon: FileQuestion, bg: 'bg-blue-50', color: 'text-blue-600' },
            { label: 'ข้อสอบที่ใช้งาน', value: stats?.activeQuestions, icon: Settings, bg: 'bg-emerald-50', color: 'text-emerald-600' },
            { label: 'ประเภทข้อสอบ', value: stats?.totalTests, icon: LayoutDashboard, bg: 'bg-purple-50', color: 'text-purple-600' },
            { label: 'ผู้ใช้งาน', value: stats?.totalUsers, icon: Users, bg: 'bg-orange-50', color: 'text-orange-600' },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-500 text-sm">{card.label}</p>
                    {loading ? (
                      <div className="h-8 w-16 bg-slate-200 rounded animate-pulse mt-1" />
                    ) : (
                      <p className="text-3xl font-bold text-slate-900 mt-1">{card.value}</p>
                    )}
                  </div>
                  <div className={`${card.bg} p-3 rounded-lg`}>
                    <Icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={index}
                href={item.href}
                className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className={`${item.bgColor} p-4 rounded-xl group-hover:scale-110 transition-transform`}>
                    <Icon className="w-8 h-8" style={{ stroke: `url(#gradient-${index})` }} />
                    <svg width="0" height="0">
                      <defs>
                        <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" style={{ stopColor: item.color.includes('blue') ? '#3b82f6' : item.color.includes('emerald') ? '#10b981' : item.color.includes('purple') ? '#a855f7' : '#f97316' }} />
                          <stop offset="100%" style={{ stopColor: item.color.includes('cyan') ? '#06b6d4' : item.color.includes('teal') ? '#14b8a6' : item.color.includes('pink') ? '#ec4899' : '#f59e0b' }} />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-800 group-hover:text-primary-600 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-slate-500 mt-1 text-sm">{item.description}</p>
                    {item.count > 0 && (
                      <p className="text-slate-400 text-xs mt-2">{item.count} รายการ</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Most Missed Questions */}
        {stats?.hardestQuestions && stats.hardestQuestions.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              ข้อสอบที่นักเรียนตอบผิดมากที่สุด
            </h2>
            <div className="space-y-3">
              {stats.hardestQuestions.map((q, i) => (
                <div key={q.questionId} className="flex items-center gap-4 p-3 bg-orange-50 rounded-xl border border-orange-100">
                  <span className="text-3xl font-black text-orange-200 w-8 text-center shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{q.questionText}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Question ID: {q.questionId}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-orange-600">{q.wrongCount}</p>
                    <p className="text-xs text-orange-400">ครั้งที่ตอบผิด</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
