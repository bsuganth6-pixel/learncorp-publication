'use client';

import { useEffect, useState, useCallback } from 'react';
import { Trash2, Loader2, Mail, MailOpen } from 'lucide-react';
import { getContactMessages, markMessageRead, deleteContactMessage, ApiClientError } from '@/lib/api-client';
import type { ContactMessage } from '@/lib/types';
import PageHeader from '@/components/admin/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';
import { formatDate, cn } from '@/lib/utils';

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    getContactMessages({ page: 1 }).then((res) => setMessages(res.data)).catch(() => setMessages([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  const onMarkRead = async (id: string) => {
    setBusyId(id);
    try {
      await markMessageRead(id);
      setMessages((prev) => prev?.map((m) => (m._id === id ? { ...m, read: true } : m)) || null);
    } catch (err) {
      alert(err instanceof ApiClientError ? err.message : 'Could not update this message');
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Delete this message?')) return;
    setBusyId(id);
    try {
      await deleteContactMessage(id);
      setMessages((prev) => prev?.filter((m) => m._id !== id) || null);
    } catch (err) {
      alert(err instanceof ApiClientError ? err.message : 'Could not delete this message');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Messages" description="Contact form submissions." />

      {!messages ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : messages.length === 0 ? (
        <EmptyState title="No messages yet" />
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m._id} className={cn('rounded-sm border border-rule bg-surface p-5 shadow-card', !m.read && 'border-l-4 border-l-gold')}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink">{m.name}</p>
                    {!m.read && <Badge tone="gold">New</Badge>}
                  </div>
                  <p className="text-xs text-ink-soft">{m.email} {m.phone && `· ${m.phone}`}</p>
                </div>
                <p className="text-xs text-ink-soft">{formatDate(m.createdAt)}</p>
              </div>
              <p className="mt-3 text-sm font-medium text-ink">{m.subject}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{m.message}</p>

              <div className="mt-4 flex gap-2">
                {!m.read && (
                  <button type="button" onClick={() => onMarkRead(m._id)} disabled={busyId === m._id} className="btn-outline text-xs">
                    {busyId === m._id ? <Loader2 size={13} className="animate-spin" /> : <MailOpen size={13} />}
                    Mark as read
                  </button>
                )}
                <button type="button" onClick={() => onDelete(m._id)} disabled={busyId === m._id} className="flex items-center gap-1.5 rounded-sm border border-rule px-3 py-1.5 text-xs font-medium text-danger hover:border-danger">
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
