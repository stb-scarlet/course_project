import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/utils/date';
import { positionApi } from '@/api';
import { CV } from '@/types';
import Pagination from '@/components/common/Pagination';

interface Props { positionId: string; }

export default function PositionCVsTab({ positionId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cvs, setCVs] = useState<CV[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p = 1, q = '') => {
    setLoading(true);
    try {
      const { data } = await positionApi.getCVs(positionId, { page: p, limit: 20, q });
      setCVs(data.items); setTotal(data.total); setPages(data.pages); setPage(p);
    } catch (err) {
      console.error('Failed to load CVs for position: ', err)
    } finally { setLoading(false); }
  }, [positionId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load(1, search);
    }, 400);

    return () => clearTimeout(timer);
  }, [search, load]);

  return (
    <div>
      <div className="d-flex gap-2 mb-3">
        <div className="input-group" style={{ maxWidth: 280 }}>
          <span className="input-group-text"><i className="bi bi-search" /></span>
          <input className="form-control shadow-none" placeholder={t('common.search')}
            value={search}
            onChange={e => { setSearch(e.target.value); }} />
        </div>
        <span className="text-muted small d-flex align-items-center">{total} CVs</span>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0 table-hover-actions align-middle">
            <thead className="table-light">
              <tr>
                <th>Candidate</th>
                <th>{t('cv.likes')}</th>
                <th>Submitted</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={4} className="text-center py-4"><span className="spinner-border spinner-border-sm" /></td></tr>
              )}
              {!loading && cvs.map(cv => {
                const profile = cv.user?.profile;
                const name = profile ? `${profile.lastName}, ${profile.firstName}` : 'Unknown';
                return (
                  <tr key={cv.id} onClick={() => navigate(`/cvs/${cv.id}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        {profile?.photoUrl
                          ? <img src={profile.photoUrl} alt="" className="rounded-circle" width={32} height={32} style={{ objectFit: 'cover' }} />
                          : <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white"
                              style={{ width: 32, height: 32, fontSize: '0.7rem', flexShrink: 0 }}>
                              {name.slice(0, 2).toUpperCase()}
                            </div>
                        }
                        <span className="fw-medium">{name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-danger-subtle text-danger">
                        <i className="bi bi-heart-fill me-1" />{cv._count?.likes ?? 0}
                      </span>
                    </td>
                    <td className="small text-muted">{formatDate(cv.createdAt)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="row-actions">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/cvs/${cv.id}`)}>
                          <i className="bi bi-eye" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && cvs.length === 0 && (
                <tr><td colSpan={4} className="text-center text-muted py-5">No CVs submitted yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} pages={pages} onChange={p => load(p)} />
    </div>
  );
}