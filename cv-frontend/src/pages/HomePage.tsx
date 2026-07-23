import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { statsApi } from '@/api';
import { formatDate } from '@/utils/date'
import { Stats, Position, TagCloudItem } from '@/types';
import { useAuthStore } from '@/store/auth.store';

export default function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [latest, setLatest] = useState<Position[]>([]);
  const [popular, setPopular] = useState<Position[]>([]);
  const [tags, setTags] = useState<TagCloudItem[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, latestRes, popularRes, tagsRes] = await Promise.all([
          statsApi.get(),
          statsApi.latestPositions(),
          statsApi.popularPositions(),
          statsApi.tagCloud()
        ]);

        setStats(statsRes.data);
        setLatest(latestRes.data);
        setPopular(popularRes.data);
        setTags(tagsRes.data);
      } catch (err) {
        console.error("Failed to load dashboard data", err)
      }
    }

    fetchDashboardData();
  }, []);

  const maxTagCount = Math.max(...tags.map(t => t.count), 1);

  const handleTagClick = (tag: TagCloudItem) => {
    if (user?.role === 'RECRUITER' || user?.role === 'ADMIN') {
      navigate(`/cvs/search?q=${tag.name}`);
    } else {
      navigate(`/positions?q=${tag.name}`);
    }
  };

  return (
    <div className="container py-2">
      {/* Hero */}
      <div className="text-center mb-5 py-4">
        <h1 className="fw-bold display-5" style={{ color: 'var(--text-primary)' }}>
          <i className="bi bi-file-earmark-person-fill me-2" style={{ color: 'var(--brand-primary)' }} />
          {t('home.title')}
        </h1>
        <p className="text-muted fs-5">{t('home.subtitle')}</p>
        {!user && (
          <div className="d-flex gap-2 justify-content-center mt-3">
            <Link to="/register" className="btn btn-primary px-4">{t('nav.register')}</Link>
            <Link to="/positions" className="btn btn-outline-primary px-4">{t('nav.positions')}</Link>
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="row g-3 mb-5">
          {[
            { label: t('home.totalPositions'), value: stats.totalPositions, icon: 'briefcase' },
            { label: t('home.totalCVs'), value: stats.totalCVs, icon: 'file-text' },
            { label: t('home.totalCandidates'), value: stats.totalCandidates, icon: 'people' },
            { label: t('home.totalRecruiters'), value: stats.totalRecruiters, icon: 'person-badge' },
            { label: t('home.newCVsToday'), value: stats.newCVsToday, icon: 'clock-history' },
          ].map(s => (
            <div key={s.label} className="col-6 col-md-4 col-lg">
              <div className="stat-card">
                <i className={`bi bi-${s.icon} fs-3`} style={{ color: 'var(--brand-primary)' }} />
                <div className="stat-number">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="row g-4">
        {/* Latest Positions */}
        <div className="col-lg-7">
          <h5 className="fw-semibold mb-3">
            <i className="bi bi-clock me-2 text-primary" />{t('home.latestPositions')}
          </h5>
          <div className="card">
            <div className="table-responsive">
              <table className="table table-hover mb-0 table-hover-actions">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>CVs</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {latest.map(p => (
                    <tr key={p.id} onClick={() => navigate(`/positions/${p.id}`)} style={{ cursor: 'pointer' }}>
                      <td>
                        <span className="fw-medium">{p.title}</span>
                        <span className={`badge ms-2 ${p.accessType === 'PUBLIC' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>
                          {p.accessType === 'PUBLIC' ? t('positions.public') : t('positions.restricted')}
                        </span>
                      </td>
                      <td><span className="badge bg-primary-subtle text-primary">{p._count?.cvs ?? 0}</span></td>
                      <td className="text-muted small">{formatDate(p.updatedAt)}</td>
                    </tr>
                  ))}
                  {latest.length === 0 && (
                    <tr><td colSpan={3} className="text-center text-muted py-4">{t('common.noResults')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="col-lg-5 d-flex flex-column gap-4">
          {/* Popular */}
          <div>
            <h5 className="fw-semibold mb-3">
              <i className="bi bi-fire me-2 text-danger" />{t('home.popularPositions')}
            </h5>
            <div className="d-flex flex-column gap-2">
              {popular.map((p, i) => (
                <Link key={p.id} to={`/positions/${p.id}`} className="card text-decoration-none p-3 d-flex flex-row align-items-center gap-3">
                  <span className="fw-bold fs-4 text-muted" style={{ minWidth: 28 }}>{i + 1}</span>
                  <div className="flex-grow-1">
                    <div className="fw-medium">{p.title}</div>
                    <div className="small text-muted">{p._count?.cvs} CVs</div>
                  </div>
                  <i className="bi bi-chevron-right text-muted" />
                </Link>
              ))}
            </div>
          </div>

          {/* Tag Cloud */}
          <div>
            <h5 className="fw-semibold mb-3">
              <i className="bi bi-tags me-2 text-primary" />{t('home.tagCloud')}
            </h5>
            {/* ИСПРАВЛЕНО: Добавили justify-content-center для красивого распределения облака */}
            <div className="card p-3 d-flex flex-wrap gap-2 justify-content-center align-items-center">
              {tags.map(tag => {
                const size = 0.75 + (tag.count / maxTagCount) * 0.75;
                return (
                  <span
                    key={tag.id}
                    // ИСПРАВЛЕНО: Добавлен класс d-inline-block и alignment, чтобы убрать полоски во всю ширину
                    className="tag-pill tag-cloud-item d-inline-block text-center align-middle m-1"
                    style={{ 
                      fontSize: `${size}rem`, 
                      cursor: 'pointer',
                      whiteSpace: 'nowrap', // Защита: тег из двух слов не разобьется на две строчки
                      display: 'inline-block' // Жесткая гарантия правильного отображения
                    }}
                    onClick={() => handleTagClick(tag)}
                    title={`${tag.count} uses`}
                  >
                    {tag.name}
                  </span>
                );
              })}
              {tags.length === 0 && <span className="text-muted small">{t('common.noResults')}</span>}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}