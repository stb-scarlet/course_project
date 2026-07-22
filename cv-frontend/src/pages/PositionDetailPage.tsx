import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import { positionApi, cvApi } from '@/api';
import { Position } from '@/types';
import { useAuthStore } from '@/store/auth.store';
import DiscussionTab from '@/components/discussion/DiscussionTab';
import PositionCVsTab from '@/components/positions/PositionCVsTab';

export default function PositionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [position, setPosition] = useState<Position | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'info' | 'cvs' | 'discussion'>('info');
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [creating, setCreating] = useState(false);

  const isRecruiter = user?.role === 'RECRUITER' || user?.role === 'ADMIN';
  const isCandidate = user?.role === 'CANDIDATE' || user?.role === 'ADMIN';

  useEffect(() => {
    if (!id) return;
    positionApi.get(id)
      .then(r => { setPosition(r.data); setLoading(false); })
      .catch(() => {t('common.error');})
      .finally(() => { setLoading(false) });
    if (isCandidate && user) {
      positionApi.checkAccess(id).then(r => setHasAccess(r.data.hasAccess)).catch(() => toast.error(t('common.error'))).finally(() => setHasAccess(false));
    }
  }, [id, user]);

  const handleDelete = async () => {
    if (!confirm(t('positions.confirmDelete'))) return;
    await positionApi.delete(id!);
    toast.success('Deleted');
    navigate('/positions');
  };

  const handleCreateCV = async () => {
    setCreating(true);
    try {
      const { data } = await cvApi.create(id!);
      toast.success('CV created!');
      navigate(`/cvs/${data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('common.error'));
    } finally { setCreating(false); }
  };

  const handleDuplicate = async () => {
    try {
      setCreating(true);
      await positionApi.duplicate(id!);
      navigate('/positions');
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('common.error'))
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <div className="text-center py-5"><span className="spinner-border text-primary" /></div>;
  if (!position) return <div className="text-center py-5 text-muted">Not found</div>;

  return (
    <div className="container-lg">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/positions">{t('nav.positions')}</Link></li>
          <li className="breadcrumb-item active">{position.title}</li>
        </ol>
      </nav>

      {/* Header card */}
      <div className="card mb-4 p-4">
        <div className="d-flex flex-wrap align-items-start gap-3">
          <div className="flex-grow-1">
            <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
              <h2 className="fw-bold mb-0">{position.title}</h2>
              <span className={`badge ${position.accessType === 'PUBLIC' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>
                <i className={`bi bi-${position.accessType === 'PUBLIC' ? 'globe' : 'lock'} me-1`} />
                {position.accessType === 'PUBLIC' ? t('positions.public') : t('positions.restricted')}
              </span>
            </div>
            <p className="text-muted mb-2">{position.shortDescription}</p>
            <div className="d-flex flex-wrap gap-1">
              {position.positionTags?.map(pt => (
                <span key={pt.tag.id} className="tag-pill">{pt.tag.name}</span>
              ))}
            </div>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            {isCandidate && !isRecruiter && (
              hasAccess === null
                ? <span className="text-muted small">{t('positions.checkingAccess')}</span>
                : hasAccess
                  ? <button className="btn btn-primary" onClick={handleCreateCV} disabled={creating}>
                      {creating ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-plus-lg me-1" />}
                      {t('positions.createCV')}
                    </button>
                  : <span className="badge bg-danger-subtle text-danger p-2"><i className="bi bi-lock me-1" />No access</span>
            )}
            {isRecruiter && (
              <>
                <button className="btn btn-outline-secondary btn-sm" onClick={handleDuplicate}>
                  <i className="bi bi-copy me-1" />{t('positions.duplicate')}
                </button>
                <Link to={`/positions/${id}/edit`} className="btn btn-outline-primary btn-sm">
                  <i className="bi bi-pencil me-1" />{t('positions.edit')}
                </Link>
                <button className="btn btn-outline-danger btn-sm" onClick={handleDelete}>
                  <i className="bi bi-trash me-1" />{t('positions.delete')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button className={`nav-link ${tab === 'info' ? 'active' : ''}`} onClick={() => setTab('info')}>
            <i className="bi bi-info-circle me-1" />Info
          </button>
        </li>
        {isRecruiter && (
          <li className="nav-item">
            <button className={`nav-link ${tab === 'cvs' ? 'active' : ''}`} onClick={() => setTab('cvs')}>
              <i className="bi bi-file-text me-1" />{t('positions.viewCVs')}
              <span className="badge bg-primary-subtle text-primary ms-1">{position._count?.cvs ?? 0}</span>
            </button>
          </li>
        )}
        <li className="nav-item">
          <button className={`nav-link ${tab === 'discussion' ? 'active' : ''}`} onClick={() => setTab('discussion')}>
            <i className="bi bi-chat-dots me-1" />{t('positions.discussion')}
          </button>
        </li>
      </ul>

      <div className="profile-tab-content">
        {tab === 'info' && (
          <div className="row g-4">
            {/* Attributes */}
            <div className="col-md-6">
              <h6 className="fw-semibold mb-3"><i className="bi bi-list-check me-2 text-primary" />{t('positions.attributes')}</h6>
              {position.attributes?.length === 0
                ? <p className="text-muted small">No attributes defined.</p>
                : (
                  <div className="card">
                    <ul className="list-group list-group-flush">
                      {position.attributes?.map(pa => (
                        <li key={pa.id} className="list-group-item d-flex justify-content-between align-items-center">
                          <div>
                            <span className="fw-medium">{pa.attribute.name}</span>
                            {pa.required && <span className="badge bg-danger-subtle text-danger ms-2 small">required</span>}
                          </div>
                          <span className="badge bg-secondary-subtle text-secondary">{pa.attribute.type}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>

            {/* Access Rules */}
            <div className="col-md-6">
              <h6 className="fw-semibold mb-3"><i className="bi bi-shield-check me-2 text-warning" />{t('positions.accessRules')}</h6>
              {position.accessType === 'PUBLIC'
                ? <div className="alert alert-success py-2"><i className="bi bi-globe me-2" />Open to all registered users</div>
                : position.accessRules?.length === 0
                  ? <p className="text-muted small">No rules defined.</p>
                  : (
                    <div className="card">
                      <ul className="list-group list-group-flush">
                        {position.accessRules?.map(rule => (
                          <li key={rule.id} className="list-group-item">
                            <span className="fw-medium">{rule.attribute?.name}</span>
                            <span className="badge bg-secondary-subtle text-secondary mx-2">{rule.operator}</span>
                            <span className="text-primary fw-medium">{JSON.parse(rule.value)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

              <div className="mt-3">
                <h6 className="fw-semibold mb-2"><i className="bi bi-folder me-2 text-primary" />Max Projects</h6>
                <span className="badge bg-primary-subtle text-primary fs-6">{position.maxProjects}</span>
              </div>
            </div>
          </div>
        )}

        {tab === 'cvs' && isRecruiter && <PositionCVsTab positionId={id!} />}
        {tab === 'discussion' && <DiscussionTab positionId={id!} />}
      </div>
    </div>
  );
}