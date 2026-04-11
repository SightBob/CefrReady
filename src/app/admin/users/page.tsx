'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Search, Trash2, Mail, Calendar, BarChart2, ChevronUp, ChevronDown, Loader2, AlertTriangle } from 'lucide-react';

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
  totalAttempts: number;
  avgScore: number | null;
  lastAttempt: string | null;
}

type SortKey = 'name' | 'email' | 'createdAt' | 'totalAttempts' | 'avgScore';
type SortDir = 'asc' | 'desc';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const json = await res.json();
      if (json.success) setUsers(json.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deleteTarget.id }),
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filtered = users
    .filter(
      (u) =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let av: string | number | null = a[sortKey];
      let bv: string | number | null = b[sortKey];
      if (av === null) av = '';
      if (bv === null) bv = '';
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
    ) : (
      <ChevronUp className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40" />
    );

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';

  const scoreColor = (s: number | null) => {
    if (s === null) return 'text-slate-400';
    if (s >= 70) return 'text-emerald-600';
    if (s >= 50) return 'text-amber-600';
    return 'text-red-500';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-3 transition-colors">
              <ArrowLeft className="w-4 h-4" /> กลับ Admin
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-xl">
                <Users className="w-7 h-7 text-purple-600" />
              </div>
              จัดการผู้ใช้งาน
            </h1>
            <p className="text-slate-500 mt-1">รายชื่อผู้ใช้งานทั้งหมดและสถิติการทดสอบ</p>
          </div>

          {/* Summary pill */}
          <div className="hidden md:flex items-center gap-3">
            <div className="bg-white rounded-xl px-5 py-3 shadow-sm border border-slate-200 text-center">
              <p className="text-2xl font-bold text-slate-900">{users.length}</p>
              <p className="text-xs text-slate-500">ผู้ใช้ทั้งหมด</p>
            </div>
            <div className="bg-white rounded-xl px-5 py-3 shadow-sm border border-slate-200 text-center">
              <p className="text-2xl font-bold text-emerald-600">
                {users.filter((u) => u.totalAttempts > 0).length}
              </p>
              <p className="text-xs text-slate-500">เคยทดสอบแล้ว</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อหรืออีเมล..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-400 text-slate-700"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>ไม่พบผู้ใช้</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {(
                      [
                        { key: 'name', label: 'ผู้ใช้' },
                        { key: 'email', label: 'อีเมล' },
                        { key: 'createdAt', label: 'วันที่สมัคร' },
                        { key: 'totalAttempts', label: 'จำนวนทดสอบ' },
                        { key: 'avgScore', label: 'คะแนนเฉลี่ย' },
                      ] as { key: SortKey; label: string }[]
                    ).map(({ key, label }) => (
                      <th
                        key={key}
                        onClick={() => handleSort(key)}
                        className="group px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none"
                      >
                        <span className="inline-flex items-center gap-1">
                          {label}
                          <SortIcon k={key} />
                        </span>
                      </th>
                    ))}
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      ครั้งล่าสุด
                    </th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* User */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {user.image ? (
                            <img src={user.image} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-xs font-bold">
                              {(user.name ?? user.email)[0].toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium text-slate-800">{user.name ?? '—'}</span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-4 text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" />
                          {user.email}
                        </span>
                      </td>

                      {/* Joined */}
                      <td className="px-5 py-4 text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(user.createdAt)}
                        </span>
                      </td>

                      {/* Attempts */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <BarChart2 className="w-4 h-4 text-slate-400" />
                          <span className={`font-semibold ${user.totalAttempts > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                            {user.totalAttempts}
                          </span>
                        </div>
                      </td>

                      {/* Avg score */}
                      <td className="px-5 py-4">
                        <span className={`font-bold text-base ${scoreColor(user.avgScore)}`}>
                          {user.avgScore !== null ? `${user.avgScore}%` : '—'}
                        </span>
                      </td>

                      {/* Last attempt */}
                      <td className="px-5 py-4 text-slate-400 text-xs">
                        {formatDate(user.lastAttempt)}
                      </td>

                      {/* Delete */}
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setDeleteTarget(user)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="ลบผู้ใช้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-center text-slate-400 text-xs mt-4">
          แสดง {filtered.length} จาก {users.length} ผู้ใช้
        </p>
      </div>

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">ยืนยันการลบ</h2>
            </div>
            <p className="text-slate-600 mb-2">
              คุณแน่ใจหรือไม่ที่จะลบผู้ใช้ <span className="font-semibold text-slate-800">{deleteTarget.name ?? deleteTarget.email}</span>?
            </p>
            <p className="text-sm text-red-500 mb-6">ข้อมูลและประวัติการทดสอบทั้งหมดจะถูกลบออกอย่างถาวร</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
