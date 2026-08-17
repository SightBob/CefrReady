'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Trash2 } from 'lucide-react';

interface ContactMessage {
  id: number;
  userId: string | null;
  accountName: string | null;
  accountEmail: string | null;
  legacyName: string | null;
  legacyEmail: string | null;
  legacySubject: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const getSenderName = (message: ContactMessage) =>
  message.accountName || message.accountEmail || message.legacyName || 'ไม่ทราบผู้ส่ง';

const getSenderEmail = (message: ContactMessage) =>
  message.accountEmail || message.legacyEmail;

const getReplyEmail = (message: ContactMessage) => {
  const email = getSenderEmail(message)?.trim();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};

const getSubject = (message: ContactMessage) =>
  message.legacySubject || 'ความคิดเห็นจากผู้ใช้';

export default function AdminContactsPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/contacts');
      if (!res.ok) throw new Error('Failed to fetch contacts');

      const data = await res.json();
      setMessages(data.data || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError('ไม่สามารถโหลดความคิดเห็นได้ กรุณาลองอีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });
      if (!res.ok) throw new Error('Failed to mark contact as read');

      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isRead: true } : m))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (selectedMessage?.id === id) {
        setSelectedMessage({ ...selectedMessage, isRead: true });
      }
    } catch (err) {
      console.error('Error marking as read:', err);
      setError('ไม่สามารถทำเครื่องหมายว่าอ่านแล้วได้ กรุณาลองอีกครั้ง');
    }
  };

  const deleteMessage = async (id: number) => {
    if (!confirm('ลบข้อความนี้?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/contacts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete contact');

      const deletedMessage = messages.find((message) => message.id === id);
      setMessages((prev) => prev.filter((message) => message.id !== id));
      if (deletedMessage && !deletedMessage.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      if (selectedMessage?.id === id) setSelectedMessage(null);
      await fetchMessages();
    } catch (err) {
      console.error('Error deleting:', err);
      setError('ไม่สามารถลบความคิดเห็นได้ กรุณาลองอีกครั้ง');
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

  const selectedReplyEmail = selectedMessage ? getReplyEmail(selectedMessage) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
              <ArrowLeft className="w-4 h-4" /> กลับ
            </Link>
            <h1 className="text-3xl font-bold text-slate-900">ปัญหาและข้อเสนอแนะ</h1>
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
            ) : error && messages.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <button type="button" onClick={fetchMessages} className="btn-primary text-sm py-2 px-4">
                  ลองอีกครั้ง
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="p-12 text-center">
                <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">ยังไม่มีความคิดเห็น</p>
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
                            {getSenderName(msg)}
                          </p>
                        </div>
                        <p className="text-sm text-slate-500 truncate mt-0.5">
                          {msg.legacySubject || msg.message}
                        </p>
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

              <h2 className="text-xl font-bold text-slate-900 mb-1">{getSubject(selectedMessage)}</h2>
              <div className="flex items-center gap-3 text-sm text-slate-500 mb-6">
                <span className="font-medium text-slate-700">{getSenderName(selectedMessage)}</span>
                {getSenderEmail(selectedMessage) && (
                  <>
                    <span>·</span>
                    <span>{getSenderEmail(selectedMessage)}</span>
                  </>
                )}
                <span>·</span>
                <span>{formatDate(selectedMessage.createdAt)}</span>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {selectedMessage.message}
              </div>

              {selectedReplyEmail && (
                <div className="mt-4 flex gap-3">
                  <a
                    href={`mailto:${encodeURIComponent(selectedReplyEmail)}?subject=${encodeURIComponent(`Re: ${getSubject(selectedMessage)}`)}`}
                    className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4" /> ตอบกลับอีเมล
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
        {error && messages.length > 0 && (
          <div className="mt-4 flex items-center justify-between gap-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button type="button" onClick={fetchMessages} className="font-medium underline">
              ลองอีกครั้ง
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
