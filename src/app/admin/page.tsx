'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  FileQuestion, 
  Users, 
  BarChart3,
  Plus,
  Settings
} from 'lucide-react';

interface Stats {
  totalQuestions: number;
  totalUsers: number;
  totalTests: number;
  activeQuestions: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalQuestions: 0,
    totalUsers: 0,
    totalTests: 0,
    activeQuestions: 0,
  });

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
      count: stats.totalQuestions,
    },
    {
      title: 'ประเภทข้อสอบ',
      description: 'จัดการประเภทข้อสอบ',
      icon: LayoutDashboard,
      href: '/admin/test-types',
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50',
      count: stats.totalTests,
    },
    {
      title: 'ผู้ใช้งาน',
      description: 'จัดการผู้ใช้งานระบบ',
      icon: Users,
      href: '/admin/users',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
      count: stats.totalUsers,
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
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">ข้อสอบทั้งหมด</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.totalQuestions}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <FileQuestion className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">ข้อสอบที่ใช้งาน</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.activeQuestions}</p>
              </div>
              <div className="bg-emerald-50 p-3 rounded-lg">
                <Settings className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">ประเภทข้อสอบ</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.totalTests}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <LayoutDashboard className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">ผู้ใช้งาน</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.totalUsers}</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
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
      </div>
    </div>
  );
}
