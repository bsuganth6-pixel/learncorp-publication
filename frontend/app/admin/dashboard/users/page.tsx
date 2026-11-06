'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getUsers, setUserStatus, revokeUserSessions, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { isAdminRole } from '@/lib/roles';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { ManagedUser } from '@/lib/types';
import PageHeader from '@/components/admin/PageHeader';
import AdminPager from '@/components/admin/AdminPager';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import TableScroller from '@/components/admin/TableScroller';

const ROLE_LABEL = { author: 'Author', admin: 'Administrator', superadmin: 'Super admin' } as const;

function UserRow({ user, canManage, onChanged }: { user: ManagedUser; canManage: boolean; onChanged: (message: string) => void }) {
  const [mode, setMode] = useState<'idle' | 'suspend'>('idle');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const run = async (label: string, action: () => Promise<unknown>, done: string) => {
    setBusy(label);
    setError('');
    try {
      await action();
      setMode('idle');
      setReason('');
      onChanged(done);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'That didn’t work. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <tr className="align-top">
      <td className="px-4 py-3">
        <span className="block font-medium text-ink">{user.name}</span>
        <span className="block break-all text-xs text-ink-soft">{user.email}</span>
      </td>
      <td className="px-4 py-3 text-ink-soft">{ROLE_LABEL[user.role]}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={user.status === 'active' ? 'success' : 'danger'}>{user.status === 'active' ? 'Active' : 'Suspended'}</Badge>
          {user.role === 'author' && <Badge tone={user.emailVerified ? 'neutral' : 'warning'}>{user.emailVerified ? 'Email confirmed' : 'Email unconfirmed'}</Badge>}
        </div>
        {user.status === 'suspended' && user.suspensionReason && <p className="mt-1.5 max-w-[16rem] text-xs text-ink-soft">“{user.suspensionReason}”</p>}
      </td>
      <td className="px-4 py-3 text-ink-soft">{user.role === 'author' ? user.submissions : '–'}</td>
      <td className="px-4 py-3 text-xs text-ink-soft">
        <span className="block">Joined {formatDate(user.createdAt)}</span>
        <span className="block">{user.lastLoginAt ? `Last in ${formatDateTime(user.lastLoginAt)}` : 'Never signed in'}</span>
      </td>
      <td className="px-4 py-3 text-right">
        {!canManage ? (
          <span className="text-xs text-ink-soft">–</span>
        ) : mode === 'suspend' ? (
          <div className="ml-auto w-60 space-y-2 text-left">
            <label htmlFor={`reason-${user.id}`} className="sr-only">Reason for suspending {user.name}</label>
            <input id={`reason-${user.id}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" maxLength={300} className="field-input py-1.5 text-xs" />
            <div className="flex gap-2">
              <button type="button" disabled={busy !== null} onClick={() => run('suspend', () => setUserStatus(user.id, 'suspended', reason.trim() || undefined), `${user.name} was suspended and signed out.`)} className="btn-primary px-3 py-1.5 text-xs">
                {busy === 'suspend' && <Loader2 size={12} className="animate-spin" aria-hidden="true" />} Confirm suspend
              </button>
              <button type="button" onClick={() => setMode('idle')} className="btn-outline px-3 py-1.5 text-xs">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            {user.status === 'active' ? (
              <button type="button" onClick={() => setMode('suspend')} className="btn-outline px-3 py-1.5 text-xs">Suspend</button>
            ) : (
              <button type="button" disabled={busy !== null} onClick={() => run('activate', () => setUserStatus(user.id, 'active'), `${user.name} was reactivated.`)} className="btn-outline px-3 py-1.5 text-xs">
                {busy === 'activate' && <Loader2 size={12} className="animate-spin" aria-hidden="true" />} Reactivate
              </button>
            )}
            <button type="button" disabled={busy !== null} onClick={() => run('revoke', () => revokeUserSessions(user.id), `${user.name} was signed out of every device.`)} className="btn-outline px-3 py-1.5 text-xs">
              {busy === 'revoke' && <Loader2 size={12} className="animate-spin" aria-hidden="true" />} Sign out everywhere
            </button>
          </div>
        )}
        {error && <p role="alert" className="field-error text-right">{error}</p>}
      </td>
    </tr>
  );
}

export default function AdminUsersPage() {
  const { state } = useAuth();
  const me = state.user;
  const [users, setUsers] = useState<ManagedUser[] | null>(null);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState('');

  // Search runs shortly after typing stops rather than on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(() => {
    setError(false);
    getUsers({ page, role: role || undefined, status: status || undefined, search: query || undefined })
      .then((res) => { setUsers(res.data); setPages(res.pagination.pages); })
      .catch(() => { setUsers([]); setError(true); });
  }, [page, role, status, query]);

  useEffect(() => { load(); }, [load]);

  // The API enforces this too; hiding the buttons just avoids offering actions that would be refused.
  const canManage = (u: ManagedUser) => Boolean(me) && u.id !== me!.id && (!isAdminRole(u.role) || me!.role === 'superadmin');

  return (
    <div>
      <PageHeader title="Accounts" description="Authors and administrators. Suspending an account ends its sessions immediately." />

      <div className="mb-5 flex flex-wrap gap-3">
        <div>
          <label htmlFor="user-search" className="sr-only">Search by name or email</label>
          <input id="user-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" className="field-input w-64" />
        </div>
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} aria-label="Filter by role" className="field-input w-auto">
          <option value="">All roles</option>
          <option value="author">Authors</option>
          <option value="admin">Administrators</option>
          <option value="superadmin">Super admins</option>
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status" className="field-input w-auto">
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {notice && <Alert tone="success" className="mb-5">{notice}</Alert>}
      {error && <Alert tone="error" className="mb-5">Could not load accounts. Please try again.</Alert>}

      {!users ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : users.length === 0 && !error ? (
        <EmptyState title="No accounts match" />
      ) : (
        <TableScroller label="Accounts">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-rule bg-ink/5 text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submissions</th>
                <th className="px-4 py-3">Activity</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {users.map((u) => (
                <UserRow key={u.id} user={u} canManage={canManage(u)} onChanged={(message) => { setNotice(message); load(); }} />
              ))}
            </tbody>
          </table>
        </TableScroller>
      )}

      <AdminPager page={page} pages={pages} onChange={setPage} />
    </div>
  );
}
