import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { cvApi } from '@/api';
import { CV } from '@/types';

export default function MyCVsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cvs, setCVs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cvApi.my().then(r => { setCVs(r.data); setLoading(false); });
  }, []);

  const handleDelete = async (cvId: string) => {
    if (!confirm('Delete this CV?')) return;
    try {
      await cvApi.delete(cvId);
      setCVs(prev => prev.filter(c => c.id !== cvId));
      toast.success('Deleted');
    } catch { toast.error(t('common.error')); }
  };

  if (loading) return <div className="text-center py-5"><span className="spinner-border text-primary" /></div>;

  return (
    <div className="container-lg">
      <div className="d-flex align-items-center gap-3 mb-4">
        <h3 className="fw-bold mb-0">
          <i className="bi bi-file-text me-2 text-primary" />{t('nav.myCVs')}
          <span className="badge bg-primary-subtle text-primary ms-2 fs-6">{cvs.length}</span>
        </h3>
        <Link to="/positions" className="btn btn-primary ms-auto btn-sm">
          <i className="bi bi-plus-lg me-1" />Apply for Position
        </Link>
      </div>

      {cvs.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-file-text fs-1 d-block mb-3" />
          <p className="fs-5">{t('profile.noCVs')}</p>
          <Link to="/positions" className="btn btn-primary">{t('nav.positions')}</Link>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table table-hover mb-0 table-hover-actions align-middle">
              <thead className="table-light">
                <tr>
                  <th>Position</th>
                  <th>{t('cv.likes')}</th>
                  <th>Created</th>
                  <th>Updated</th>
                  <th style={{ width: 100 }}></th>
                </tr>
              </thead>
              <tbody>
                {cvs.map(cv => (
                  <tr key={cv.id} onClick={() => navigate(`/cvs/${cv.id}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="fw-medium">{cv.position?.title}</div>
                      <div className="small text-muted text-truncate" style={{ maxWidth: 340 }}>{cv.position?.shortDescription}</div>
                    </td>
                    <td>
                      <span className="badge bg-danger-subtle text-danger">
                        <i className="bi bi-heart-fill me-1" />{cv._count?.likes ?? 0}
                      </span>
                    </td>
                    <td className="small text-muted">{new Date(cv.createdAt).toLocaleDateString()}</td>
                    <td className="small text-muted">{new Date(cv.updatedAt).toLocaleDateString()}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="row-actions d-flex gap-1">
                        <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/cvs/${cv.id}`)}>
                          <i className="bi bi-eye" />
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(cv.id)}>
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}