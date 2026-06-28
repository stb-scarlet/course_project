import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { adminApi } from '@/api';
import { User, Role } from '@/types';
import { useAuthStore } from '@/store/auth.store';
import Pagination from '@/components/common/Pagination';
import { Link } from 'react-router-dom';

const ROLES: Role[] = ['CANDIDATE', 'RECRUITER', 'ADMIN'];

export default function AdminPage() {
  const { t } = useTranslation();
  const { user: me } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async (p = 1, q = search, role = roleFilter) => {
    setLoading(true);
    try {
      const { data } = await adminApi.listUsers({ page: p, limit: 20, q, role: role || undefined });
      setUsers(data.items); setTotal(data.total); setPages(data.pages); setPage(p);
      setSelected(new Set());
    } finally { setLoading(false); }
  }, [search, roleFilter]);

  useEffect(() => { load(); }, []);

  const handleBlock = async (userId: string, blocked: boolean) => {
    try {
      if (blocked) await adminApi.unblock(userId);
      else await adminApi.block(userId);
      toast.success(blocked ? 'Unblocked' : 'Blocked');
      load(page);
    } catch { toast.error(t('common.error')); }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Delete user permanently?')) return;
    try {
      await adminApi.delete(userId);
      toast.success('Deleted');
      load(page);
    } catch { toast.error(t('common.error')); }
  };

  const handleRoleChange = async (userId: string, role: Role) => {
    try {
      await adminApi.assignRole(userId, role);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
      toast.success('Role updated');
    } catch { toast.error(t('common.error')); }
  };

  const toggleSelect = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const roleBadge = (role: Role) => {
    const map = { ADMIN: 'bg-danger-subtle text-danger', RECRUITER: 'bg-primary-subtle text-primary', CANDIDATE: 'bg-secondary-subtle text-secondary' };
    return map[role];
  };

  return (
    <div className="container-lg">
      <h3 className="fw-bold mb-4">
        <i className="bi bi-shield-check me-2 text-danger" />{t('admin.title')}
        <span className="badge bg-secondary-subtle text-secondary ms-2 fs-6">{total} users</span>
      </h3>

      {/* Filters */}
      <div className="d-flex flex-wrap gap-2 mb-4">
        <div className="input-group" style={{ maxWidth: 280 }}>
          <span className="input-group-text"><i className="bi bi-search" /></span>
          <input className="form-control" placeholder={t('common.search')}
            value={search} onChange={e => { setSearch(e.target.value); load(1, e.target.value, roleFilter); }} />
        </div>
        <select className="form-select" style={{ width: 'auto' }} value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value); load(1, search, e.target.value); }}>
          <option value="">All roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Bulk toolbar */}
      {selected.size > 0 && (
        <div className="bulk-toolbar mb-3">
          <span>{selected.size} selected</span>
          <button className="btn btn-sm btn-light ms-2" onClick={async () => {
            if (!confirm('Delete selected users?')) return;
            await Promise.all([...selected].map(id => adminApi.delete(id)));
            toast.success('Deleted'); load(page);
          }}>
            <i className="bi bi-trash me-1" />{t('common.delete')}
          </button>
          <button className="btn btn-sm btn-outline-light ms-1" onClick={() => setSelected(new Set())}>
            <i className="bi bi-x" />
          </button>
        </div>
      )}

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0 table-hover-actions align-middle">
            <thead className="table-light">
              <tr>
                <th style={{ width: 40 }}></th>
                <th>{t('admin.email')}</th>
                <th>Name</th>
                <th>{t('admin.role')}</th>
                <th>{t('admin.status')}</th>
                <th>Joined</th>
                <th style={{ width: 160 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="text-center py-4"><span className="spinner-border spinner-border-sm" /></td></tr>}
              {!loading && users.map(u => (
                <tr key={u.id} className={selected.has(u.id) ? 'table-active row-selected' : ''}>
                  <td>
                    <input type="checkbox" className="form-check-input" checked={selected.has(u.id)}
                      onChange={() => toggleSelect(u.id)} disabled={u.id === me?.id} />
                  </td>
                  <td>
                    <Link to={`/profile/${u.id}`} className="text-decoration-none">{u.email}</Link>
                    {u.id === me?.id && <span className="badge bg-info-subtle text-info ms-2 small">you</span>}
                  </td>
                  <td>
                    {u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : '—'}
                  </td>
                  <td>
                    <select className="form-select form-select-sm" style={{ width: 120 }} value={u.role}
                      onChange={e => handleRoleChange(u.id, e.target.value as Role)}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td>
                    <span className={`badge ${u.isBlocked ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'}`}>
                      <i className={`bi bi-${u.isBlocked ? 'x-circle' : 'check-circle'} me-1`} />
                      {u.isBlocked ? t('admin.blocked') : t('admin.active')}
                    </span>
                  </td>
                  <td className="small text-muted">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                  <td>
                    <div className="row-actions d-flex gap-1">
                      <button
                        className={`btn btn-sm ${u.isBlocked ? 'btn-outline-success' : 'btn-outline-warning'}`}
                        onClick={() => handleBlock(u.id, !!u.isBlocked)}
                        disabled={u.id === me?.id}
                        title={u.isBlocked ? t('admin.unblock') : t('admin.block')}
                      >
                        <i className={`bi bi-${u.isBlocked ? 'unlock' : 'lock'}`} />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(u.id)}
                        disabled={u.id === me?.id} title={t('admin.delete')}>
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr><td colSpan={7} className="text-center text-muted py-5">{t('common.noResults')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} pages={pages} onChange={p => load(p)} />
    </div>
  );
}