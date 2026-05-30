'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, MailOpen, Trash2, Eye } from 'lucide-react';

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function AdminContactsPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/admin/contacts');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.data || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await fetch(`/api/admin/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isRead: true } : m))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (selectedMessage?.id === id) {
        setSelectedMessage({ ...selectedMessage, isRead: true });
      }
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const deleteMessage = async (id: number) => {
    if (!confirm('ลบข้อความนี้?')) return;
    try {
      await fetch(`/api/admin/contacts/${id}`, { method: 'DELETE' });
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (selectedMessage?.id === id) setSelectedMessage(null);
      fetchMessages();
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  const openMessage = (msg: ContactMessage) => {
    setSelectedMessage(msg);
    if (!msg.isRead) markAsRead(msg.id);
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
              <ArrowLeft className="w-4 h-4" /> กลับ
            </Link>
            <h1 className="text-3xl font-bold text-slate-900">ข้อความติดต่อ</h1>
            <p className="text-slate-600 mt-1">
              {unreadCount > 0 ? `${unreadCount} ข้อความที่ยังไม่อ่าน` : 'ไม่มีข้อความใหม่'}
            </p>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Message List */}
          <div className={`${selectedMessage ? 'hidden md:block md:w-2/5' : 'w-full'} bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden`}>
            {loading ? (
              <div className="p-8 text-center text-slate-400">กำลังโหลด...</div>
            ) : messages.length === 0 ? (
              <div className="p-12 text-center">
                <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">ยังไม่มีข้อความติดต่อ</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {messages.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => openMessage(msg)}
                    className={`w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors ${
                      selectedMessage?.id === msg.id ? 'bg-primary-50 border-l-2 border-primary-500' : ''
                    } ${!msg.isRead ? 'bg-blue-50/50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {!msg.isRead && <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />}
                          <p className={`text-sm truncate ${!msg.isRead ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                            {msg.name}
                          </p>
                        </div>
                        <p className="text-sm text-slate-500 truncate mt-0.5">{msg.subject}</p>
                        <p className="text-xs text-slate-400 mt-1">{formatDate(msg.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Message Detail */}
          {selectedMessage && (
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="md:hidden text-sm text-slate-500 flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> กลับ
                </button>
                <button
                  onClick={() => deleteMessage(selectedMessage.id)}
                  className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1 ml-auto"
                >
                  <Trash2 className="w-4 h-4" /> ลบ
                </button>
              </div>

              <h2 className="text-xl font-bold text-slate-900 mb-1">{selectedMessage.subject}</h2>
              <div className="flex items-center gap-3 text-sm text-slate-500 mb-6">
                <span className="font-medium text-slate-700">{selectedMessage.name}</span>
                <span>·</span>
                <span>{selectedMessage.email}</span>
                <span>·</span>
                <span>{formatDate(selectedMessage.createdAt)}</span>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {selectedMessage.message}
              </div>

              <div className="mt-4 flex gap-3">
                <a
                  href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`}
                  className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" /> ตอบกลับอีเมล
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
