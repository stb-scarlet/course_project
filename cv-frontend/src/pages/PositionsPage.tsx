import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/utils/date';
import toast from 'react-hot-toast';
import { positionApi } from '@/api';
import { Position } from '@/types';
import { useAuthStore } from '@/store/auth.store';
import Pagination from '@/components/common/Pagination';

export default function PositionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();

  const [positions, setPositions] = useState<Position[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState(searchParams.get('q') || '');

  const isRecruiter = user?.role === 'RECRUITER' || user?.role === 'ADMIN';

  const load = useCallback(async (p = 1, q = '') => {
    setLoading(true);
    try {
      const { data } = await positionApi.list({ q, page: p, limit: 20 });
      setPositions(data.items);
      setTotal(data.total);
      setPages(data.pages);
      setPage(p);
      setSelected(new Set());
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('common.error'))
    } finally { setLoading(false); }
  }, [t]);

  useEffect(() => {   
    const timer = setTimeout(() => {
      load(1, search)
    }, 400)
    return () => clearTimeout(timer)
  }, [search, load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(search ? { q: search } : {});
    load(1, search);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('positions.confirmDelete'))) return;
    const isLastItemOnPage = positions.length === 1 && page > 1 ? page - 1 : page;
    try {
      await positionApi.delete(id);
      setPositions(prev => prev.filter(a => a.id !== id));
      toast.success('Deleted');
      load(isLastItemOnPage);
    } catch (err: any) { toast.error(err.response?.data?.error || t('common.error')); }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await positionApi.duplicate(id);
      toast.success('Duplicated');
      load(page);
    } catch (err: any) { toast.error(err.response?.data?.error || t('common.error')); }
  };

  return (
    <div className="container-lg">
      {/* Header */}
      <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
        <h3 className="fw-bold mb-0">
          <i className="bi bi-briefcase me-2 text-primary" />{t('positions.title')}
          <span className="badge bg-primary-subtle text-primary ms-2 fs-6">{total}</span>
        </h3>
        <form className="ms-auto d-flex gap-2" onSubmit={handleSearch}>
          <div className="input-group" style={{ minWidth: 220 }}>
            <span className="input-group-text"><i className="bi bi-search" /></span>
            <input className="form-control" placeholder={t('common.search')}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </form>
        {isRecruiter && (
          <Link to="/positions/new" className="btn btn-primary">
            <i className="bi bi-plus-lg me-1" />{t('positions.new')}
          </Link>
        )}
      </div>

      {/* Bulk toolbar (appears when rows selected) */}
      {selected.size > 0 && isRecruiter && (
        <div className="bulk-toolbar mb-3">
          <span>{selected.size} selected</span>
          <button className="btn btn-sm btn-light ms-2"
            onClick={async () => {
              try {
                if (!confirm(t('positions.confirmDelete'))) return;
                await Promise.all([...selected].map(id => positionApi.delete(id)));
                toast.success('Deleted');
                load(page);
              } catch (err: any) {
                toast.error(err.response?.data?.error || t('common.error'))
              }
            }}>
            <i className="bi bi-trash me-1" />{t('common.delete')}
          </button>
          <button className="btn btn-sm btn-outline-light ms-1" onClick={() => setSelected(new Set())}>
            <i className="bi bi-x" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0 table-hover-actions align-middle">
            <thead className="table-light">
              <tr>
                {isRecruiter && <th style={{ width: 40 }}></th>}
                <th>{t('attributes.name')}</th>
                <th>Tags</th>
                <th>{t('positions.access')}</th>
                <th>{t('positions.cvsCount')}</th>
                <th>Updated</th>
                <th style={{ width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="text-center py-4"><span className="spinner-border spinner-border-sm" /></td></tr>
              )}
              {!loading && positions.map(pos => (
                <tr
                  key={pos.id}
                  className={selected.has(pos.id) ? 'table-active row-selected' : ''}
                  onClick={() => navigate(`/positions/${pos.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {isRecruiter && (
                    <td onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="form-check-input"
                        checked={selected.has(pos.id)}
                        onChange={() => toggleSelect(pos.id)} />
                    </td>
                  )}
                  <td>
                    <div className="fw-medium">{pos.title}</div>
                    <div className="small text-muted text-truncate" style={{ maxWidth: 280 }}>{pos.shortDescription}</div>
                  </td>
                  <td>
                    {pos.positionTags?.slice(0, 3).map(pt => (
                      <span key={pt.tag.id} className="tag-pill me-1">{pt.tag.name}</span>
                    ))}
                    {(pos.positionTags?.length ?? 0) > 3 && <span className="text-muted small">+{pos.positionTags!.length - 3}</span>}
                  </td>
                  <td>
                    <span className={`badge ${pos.accessType === 'PUBLIC' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>
                      <i className={`bi bi-${pos.accessType === 'PUBLIC' ? 'globe' : 'lock'} me-1`} />
                      {pos.accessType === 'PUBLIC' ? t('positions.public') : t('positions.restricted')}
                    </span>
                  </td>
                  <td><span className="badge bg-primary-subtle text-primary">{pos._count?.cvs ?? 0}</span></td>
                  <td className="small text-muted">{formatDate(pos.updatedAt)}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="row-actions d-flex gap-1 justify-content-end">
                      {isRecruiter && (
                        <>
                          <button className="btn btn-sm btn-outline-secondary" title={t('positions.duplicate')}
                            onClick={() => handleDuplicate(pos.id)}>
                            <i className="bi bi-copy" />
                          </button>
                          <button className="btn btn-sm btn-outline-primary" title={t('positions.edit')}
                            onClick={() => navigate(`/positions/${pos.id}/edit`)}>
                            <i className="bi bi-pencil" />
                          </button>
                          <button className="btn btn-sm btn-outline-danger" title={t('positions.delete')}
                            onClick={() => handleDelete(pos.id)}>
                            <i className="bi bi-trash" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && positions.length === 0 && (
                <tr><td colSpan={7} className="text-center text-muted py-5">{t('positions.noPositions')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} pages={pages} onChange={p => load(p)} />
    </div>
  );
}