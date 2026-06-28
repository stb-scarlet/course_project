import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { cvApi } from '@/api';
import { CV } from '@/types';

interface Props { userId: string; isOwner: boolean; }

export default function ProfileCVsTab({ userId, isOwner }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cvs, setCVs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cvApi.my().then(r => { setCVs(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [userId]);

  const handleDelete = async (cvId: string) => {
    if (!confirm('Delete this CV?')) return;
    try {
      await cvApi.delete(cvId);
      setCVs(prev => prev.filter(c => c.id !== cvId));
      toast.success('CV deleted');
    } catch { toast.error(t('common.error')); }
  };

  if (loading) return <div className="text-center py-4"><span className="spinner-border spinner-border-sm text-primary" /></div>;

  if (cvs.length === 0) return (
    <div className="text-center py-5 text-muted">
      <i className="bi bi-file-text fs-2 d-block mb-2" />
      <p>{t('profile.noCVs')}</p>
      <Link to="/positions" className="btn btn-primary btn-sm">{t('nav.positions')}</Link>
    </div>
  );

  return (
    <div className="card">
      <div className="table-responsive">
        <table className="table table-hover mb-0 table-hover-actions align-middle">
          <thead className="table-light">
            <tr>
              <th>Position</th>
              <th>{t('cv.likes')}</th>
              <th>Created</th>
              <th>Updated</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {cvs.map(cv => (
              <tr key={cv.id} onClick={() => navigate(`/cvs/${cv.id}`)} style={{ cursor: 'pointer' }}>
                <td>
                  <span className="fw-medium">{cv.position?.title}</span>
                  <div className="small text-muted text-truncate" style={{ maxWidth: 300 }}>{cv.position?.shortDescription}</div>
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
                    {isOwner && (
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(cv.id)}>
                        <i className="bi bi-trash" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}