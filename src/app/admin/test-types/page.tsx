'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  LayoutDashboard,
} from 'lucide-react';

interface TestType {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  duration: number | null;
  questionCount: number | null;
  active: string;
  createdAt: string;
}

export default function TestTypesManagement() {
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTestTypes();
  }, []);

  const fetchTestTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/test-types');
      if (response.ok) {
        const data = await response.json();
        setTestTypes(data);
      }
    } catch (error) {
      console.error('Error fetching test types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบประเภทข้อสอบนี้?\nข้อสอบที่อยู่ในประเภทนี้จะไม่สามารถเข้าถึงได้')) return;

    try {
      const response = await fetch(`/api/admin/test-types/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTestTypes(testTypes.filter(t => t.id !== id));
        alert('ลบประเภทข้อสอบสำเร็จ');
      } else {
        const error = await response.json();
        alert(error.error || 'เกิดข้อผิดพลาดในการลบประเภทข้อสอบ');
      }
    } catch (error) {
      console.error('Error deleting test type:', error);
      alert('เกิดข้อผิดพลาดในการลบประเภทข้อสอบ');
    }
  };

  const toggleActive = async (testType: TestType) => {
    try {
      const response = await fetch(`/api/admin/test-types/${testType.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...testType,
          active: testType.active === 'true' ? 'false' : 'true',
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setTestTypes(testTypes.map(t => t.id === updated.id ? updated : t));
      }
    } catch (error) {
      console.error('Error toggling test type status:', error);
    }
  };

  const iconColors: Record<string, string> = {
    'focus-form': 'from-blue-500 to-blue-600',
    'focus-meaning': 'from-emerald-500 to-emerald-600',
    'form-meaning': 'from-purple-500 to-purple-600',
    'listening': 'from-orange-500 to-orange-600',
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
              <h1 className="text-3xl font-bold text-slate-900">ประเภทข้อสอบ</h1>
              <p className="text-slate-600 mt-1">จัดการประเภทข้อสอบทั้งหมด</p>
            </div>
          </div>
          <Link href="/admin/test-types/new" className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-5 h-5" />
            เพิ่มประเภทใหม่
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="text-slate-600 mt-4">กำลังโหลดข้อมูล...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testTypes.map((testType) => (
              <div
                key={testType.id}
                className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`bg-gradient-to-br ${iconColors[testType.id] || 'from-slate-400 to-slate-500'} p-4 rounded-xl`}>
                    <LayoutDashboard className="w-8 h-8 text-white" />
                  </div>
                  <button
                    onClick={() => toggleActive(testType)}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      testType.active === 'true'
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {testType.active === 'true' ? (
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
                </div>

                <h3 className="text-xl font-bold text-slate-800 mb-2">{testType.name}</h3>
                <p className="text-slate-500 text-sm mb-4 line-clamp-2">{testType.description || 'ไม่มีคำอธิบาย'}</p>

                <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                  {testType.duration && (
                    <span className="bg-slate-100 px-2 py-1 rounded">
                      ⏱ {testType.duration} นาที
                    </span>
                  )}
                  {testType.questionCount && (
                    <span className="bg-slate-100 px-2 py-1 rounded">
                      📝 {testType.questionCount} ข้อ
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-400 mb-4">
                  ID: <code className="bg-slate-100 px-1 rounded">{testType.id}</code>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                  <Link
                    href={`/admin/test-types/${testType.id}`}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="แก้ไข"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(testType.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="ลบ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && testTypes.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-100">
            <LayoutDashboard className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-800 mb-2">ไม่พบประเภทข้อสอบ</h3>
            <p className="text-slate-500 mb-6">เริ่มต้นด้วยการเพิ่มประเภทข้อสอบใหม่</p>
            <Link href="/admin/test-types/new" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-5 h-5" />
              เพิ่มประเภทใหม่
            </Link>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            แสดง {testTypes.length} ประเภทข้อสอบ
          </p>
        </div>
      </div>
    </div>
  );
}