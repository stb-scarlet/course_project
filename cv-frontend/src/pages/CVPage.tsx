import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { formatDate } from '@/utils/date'
import toast from 'react-hot-toast';
import { cvApi, profileApi } from '@/api';
import { CV, GeneratedCV, AttributeValue, Project } from '@/types';
import { useAuthStore } from '@/store/auth.store';

export default function CVPage() {
  const { cvId } = useParams<{ cvId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [cv, setCV] = useState<CV | null>(null);
  const [generated, setGenerated] = useState<GeneratedCV | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [editingAttr, setEditingAttr] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const isRecruiter = user?.role === 'RECRUITER' || user?.role === 'ADMIN';
  const isOwner = cv?.userId === user?.id;
  const canEdit = isOwner || user?.role === 'ADMIN';

  useEffect(() => {
    if (!cvId) return;
    cvApi.get(cvId).then(r => {
      setCV(r.data.cv);
      setGenerated(r.data.generated);
      setLikesCount(r.data.cv._count?.likes ?? 0);
      setLiked(r.data.isLiked ?? false)
      setLoading(false);
    }).catch(() => {toast.error(t('common.error'))}).finally(() => setLoading(false));
  }, [cvId, user?.id]);

  const handleLike = async () => {
    if (!cvId) return;

    const previousLiked = liked;
    const previousCount = likesCount;

    setLiked(!previousLiked);
    setLikesCount(prev => previousLiked ? prev - 1 : prev + 1)
    
    try {
      if (previousLiked) {
        await cvApi.unlike(cvId!);
      } else {
        await cvApi.like(cvId!);
      }
    } catch (err: any) {
      setLiked(previousLiked);
      setLikesCount(previousCount);
      toast.error(err.response?.data?.error || t('common.error'));
    }
  };

  const handleSaveAttr = async (av: AttributeValue) => {
    try {
      const { data: attrResult } = await profileApi.upsertAttribute(av.attributeId, { value: editValue || null, version: av.version });
      setGenerated(prev => prev ? {
        ...prev,
        attributes: prev.attributes.map(a => a.attributeId === av.attributeId ? { ...a, attrResult } : a)
      } : prev);
      setEditingAttr(null);
      toast.success(t('profile.saved'));
    } catch (err: any) {
      if (err.response?.status === 409) toast.error(t('profile.saveConflict'));
      else toast.error(err.response?.data?.error || t('common.error'));
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('cv.delete') + '?')) return;
    await cvApi.delete(cvId!);
    toast.success('CV deleted');
    navigate('/cvs/my');
  };

  const handlePrint = () => window.print();

  if (loading) return <div className="text-center py-5"><span className="spinner-border text-primary" /></div>;
  if (!cv || !generated) return <div className="text-center py-5 text-muted">CV not found</div>;

  const emptyCount = generated.attributes.filter(av => !av.value).length;

  return (
    <div className="container" style={{ maxWidth: 860 }}>
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-3 no-print">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/positions">{t('nav.positions')}</Link></li>
          <li className="breadcrumb-item"><Link to={`/positions/${cv.positionId}`}>{generated.positionTitle}</Link></li>
          <li className="breadcrumb-item active">CV</li>
        </ol>
      </nav>

      {/* Toolbar */}
      <div className="d-flex flex-wrap align-items-center gap-2 mb-4 no-print">
        {isRecruiter && (
          <button className={`btn btn-sm ${liked ? 'btn-danger' : 'btn-outline-danger'}`} onClick={handleLike}>
            <i className={`bi bi-heart${liked ? '-fill' : ''} me-1`} />
            {liked ? t('cv.unlike') : t('cv.like')} · {likesCount}
          </button>
        )}
        {canEdit && (
          <>
            <button className="btn btn-sm btn-outline-secondary ms-auto" onClick={handlePrint}>
              <i className="bi bi-printer me-1" />{t('cv.download')}
            </button>
            <button className="btn btn-sm btn-outline-danger" onClick={handleDelete}>
              <i className="bi bi-trash me-1" />{t('cv.delete')}
            </button>
          </>
        )}
        {!canEdit && <div className="ms-auto" />}
        {emptyCount > 0 && (
          <span className="badge bg-danger-subtle text-danger">
            <i className="bi bi-exclamation-triangle me-1" />{emptyCount} {t('cv.missingFields')}
          </span>
        )}
      </div>

      {/* CV Document */}
      <div className="card p-4 p-md-5">
        {/* Header */}
        <div className="d-flex align-items-center gap-4 mb-4 pb-4" style={{ borderBottom: '2px solid var(--brand-primary)' }}>
          {generated.candidate.photoUrl && (
            <img src={generated.candidate.photoUrl} alt="" className="rounded-circle" width={80} height={80} style={{ objectFit: 'cover', flexShrink: 0 }} />
          )}
          <div>
            <h2 className="fw-bold mb-0">{generated.candidate.firstName} {generated.candidate.lastName}</h2>
            {generated.candidate.location && (
              <p className="text-muted mb-1"><i className="bi bi-geo-alt me-1" />{generated.candidate.location}</p>
            )}
            <span className="badge" style={{ background: 'var(--brand-primary)', color: 'white' }}>
              {t('cv.generatedFor')}: {generated.positionTitle}
            </span>
          </div>
        </div>

        {/* Attributes */}
        {generated.attributes.length > 0 && (
          <section className="mb-4">
            <h5 className="fw-semibold mb-3" style={{ color: 'var(--brand-primary)' }}>
              <i className="bi bi-list-check me-2" />{t('cv.attributes')}
            </h5>
            <div className="row gx-4 gy-2">
              {generated.attributes.map(av => (
                <div key={av.attributeId} className="col-12 col-md-6 cv-attribute-row">
                  <div className="d-flex justify-content-between align-items-start py-2">
                    <div className="flex-grow-1">
                      <div className="small fw-semibold text-muted text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                        {av.attribute.name}
                      </div>
                      {editingAttr === av.attributeId && canEdit ? (
                        <div className="d-flex gap-1 mt-1">
                          <input className="form-control form-control-sm flex-grow-1" value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveAttr(av); if (e.key === 'Escape') setEditingAttr(null); }} />
                          <button className="btn btn-sm btn-primary" onClick={() => handleSaveAttr(av)}><i className="bi bi-check" /></button>
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => setEditingAttr(null)}><i className="bi bi-x" /></button>
                        </div>
                      ) : (
                        <div
                          className={av.value ? 'fw-medium mt-1' : 'empty-value mt-1'}
                          onClick={() => { if (canEdit) { setEditingAttr(av.attributeId); setEditValue(av.value || ''); } }}
                          style={{ cursor: canEdit ? 'pointer' : 'default', minHeight: 24 }}
                          title={canEdit ? 'Click to edit' : ''}
                        >
                          {av.value || t('cv.emptyValue')}
                          {canEdit && <i className="bi bi-pencil-fill ms-2 text-muted" style={{ fontSize: '0.65rem', opacity: 0.4 }} />}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {generated.projects.length > 0 && (
          <section>
            <h5 className="fw-semibold mb-3" style={{ color: 'var(--brand-primary)' }}>
              <i className="bi bi-folder me-2" />{t('cv.projects')}
            </h5>
            <div className="d-flex flex-column gap-3">
              {generated.projects.map((p: Project) => (
                <div key={p.id} className="ps-3" style={{ borderLeft: '3px solid var(--surface-border)' }}>
                  <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                    <span className="fw-semibold">{p.name}</span>
                    <span className="text-muted small">
                      {formatDate(p.dateFrom)} — {p.dateTo ? formatDate(p.dateTo) : t('cv.present')}
                    </span>
                  </div>
                  <div className="d-flex flex-wrap gap-1 mb-2">
                    {p.tags.map((tt: any) => <span key={tt.tag.id} className="tag-pill">{tt.tag.name}</span>)}
                  </div>
                  <div className="prose small">
                    <ReactMarkdown>{p.description}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}