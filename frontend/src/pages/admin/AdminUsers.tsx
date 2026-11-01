import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { api, displayError } from '../../services/api';
import { StateBlock } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import type { UserProfile } from '../../types';

const ROLES = ['super_admin', 'content_manager', 'support_manager', 'analytics_viewer'];

interface UserRow extends UserProfile {
  downloadCount: number;
  deleteProtected: boolean;
}

export function AdminUsers() {
  const { data, loading, error, reload, setData } = useApi<{ items: UserRow[]; total: number }>('/admin/users?pageSize=100');
  const { user: currentUser } = useAuth();
  const canEditRoles = currentUser?.roles.includes('super_admin') ?? false;
  const [query, setQuery] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftRoles, setDraftRoles] = useState<string[]>([]);

  const users = (data?.items ?? []).filter((u) => `${u.username} ${u.displayName} ${u.email}`.toLowerCase().includes(query.toLowerCase()));

  const setStatus = async (user: UserRow, accountStatus: 'active' | 'suspended') => {
    setBusyId(user.id);
    setActionError(null);
    try {
      const res = await api.patch<{ user: UserProfile }>(`/admin/users/${user.id}`, { accountStatus });
      if (data) setData({ ...data, items: data.items.map((u) => u.id === user.id ? { ...u, ...res.user } : u) });
    } catch (err) {
      setActionError(displayError(err));
    } finally {
      setBusyId(null);
    }
  };

  const beginRoles = (user: UserRow) => {
    setEditingId(user.id);
    setDraftRoles(user.roles.filter((role) => ROLES.includes(role)));
    setActionError(null);
  };

  const saveRoles = async (user: UserRow) => {
    setBusyId(user.id);
    setActionError(null);
    try {
      const res = await api.patch<{ user: UserProfile }>(`/admin/users/${user.id}`, { roles: draftRoles });
      if (data) setData({ ...data, items: data.items.map((u) => u.id === user.id ? { ...u, ...res.user } : u) });
      setEditingId(null);
    } catch (err) {
      setActionError(displayError(err));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="loading-block">Loading registered users…</div>;
  if (error) return <StateBlock title="Users unavailable" body={error} action={<button className="btn btn--outline" onClick={reload}>Retry</button>} />;

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 style={{ fontSize: 'clamp(30px, 3.4vw, 44px)' }}>Users</h1>
          <p style={{ marginTop: 10, color: 'var(--ink-on-dark)', fontSize: 14 }}>{data?.total ?? 0} registered accounts. Role and status changes are audit logged.</p>
        </div>
        <input className="input" style={{ maxWidth: 320 }} placeholder="Search users" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {actionError ? <div className="form-error" style={{ marginBottom: 20 }}>{actionError}</div> : null}

      {users.length === 0 ? <StateBlock title="No users found" body="Try a different search." /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>User</th><th>Roles</th><th>Supporter</th><th>Downloads</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.displayName}</div>
                    <div style={{ fontSize: 12, color: 'var(--silver)' }}>@{u.username} · {u.email}</div>
                  </td>
                  <td>
                    {editingId === u.id ? (
                      <div style={{ display: 'grid', gap: 6, minWidth: 170 }}>
                        {ROLES.map((role) => (
                          <label key={role} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
                            <input
                              type="checkbox"
                              checked={draftRoles.includes(role)}
                              onChange={() => setDraftRoles((current) => current.includes(role) ? current.filter((r) => r !== role) : [...current, role])}
                            />
                            {role}
                          </label>
                        ))}
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                          <button className="btn btn--primary btn--sm" disabled={busyId === u.id} onClick={() => void saveRoles(u)}>Save</button>
                          <button className="btn btn--ghost btn--sm" onClick={() => setEditingId(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (u.roles.length ? u.roles.join(', ') : 'member')}
                  </td>
                  <td>{u.supporter ? `until ${u.supporter.expiresAt ? new Date(u.supporter.expiresAt).toLocaleDateString() : '—'}` : 'none'}</td>
                  <td>{u.downloadCount ?? 0}</td>
                  <td><span className={`badge ${u.accountStatus === 'active' ? 'badge--green' : 'badge--red'}`}>{u.accountStatus}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {canEditRoles && editingId !== u.id ? (
                        <button className="btn btn--outline btn--sm" onClick={() => beginRoles(u)}>Roles</button>
                      ) : null}
                      {u.deleteProtected ? <span style={{ fontSize: 12, color: 'var(--silver-2)' }}>current account</span> : (
                        u.accountStatus === 'active'
                          ? <button className="btn btn--outline btn--sm" disabled={busyId === u.id} onClick={() => void setStatus(u, 'suspended')}>Suspend</button>
                          : <button className="btn btn--outline btn--sm" disabled={busyId === u.id} onClick={() => void setStatus(u, 'active')}>Reactivate</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
