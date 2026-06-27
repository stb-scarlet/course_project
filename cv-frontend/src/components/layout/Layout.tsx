import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/api';
import { useState } from 'react';
import i18n from '@/i18n';

export default function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/positions?q=${encodeURIComponent(search.trim())}`);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const toggleTheme = async () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    document.body.setAttribute('data-bs-theme', next);
    localStorage.setItem('theme', next);
    if (user) await authApi.updatePreferences({ theme: next });
  };

  const toggleLang = async () => {
    const next = i18n.language === 'en' ? 'ru' : 'en';
    await i18n.changeLanguage(next);
    if (user) await authApi.updatePreferences({ language: next });
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg sticky-top shadow-sm" style={{ borderBottom: '1px solid var(--surface-border)' }}>
        <div className="container-fluid px-3">
          <Link className="navbar-brand fw-bold" to="/" style={{ color: 'var(--brand-primary)' }}>
            <i className="bi bi-file-earmark-person-fill me-2" />CV Manager
          </Link>

          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav">
            <span className="navbar-toggler-icon" />
          </button>

          <div className="collapse navbar-collapse" id="mainNav">
            {/* Center search */}
            <form className="d-flex mx-auto navbar-search" onSubmit={handleSearch}>
              <div className="input-group">
                <span className="input-group-text bg-transparent border-end-0">
                  <i className="bi bi-search text-muted" />
                </span>
                <input
                  className="form-control border-start-0 ps-0"
                  placeholder={t('nav.search')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </form>

            <ul className="navbar-nav align-items-center gap-1 ms-auto">
              <li className="nav-item">
                <Link className="nav-link" to="/positions">
                  <i className="bi bi-briefcase me-1" />{t('nav.positions')}
                </Link>
              </li>

              {user?.role === 'RECRUITER' || user?.role === 'ADMIN' ? (
                <li className="nav-item">
                  <Link className="nav-link" to="/attributes">
                    <i className="bi bi-tags me-1" />{t('nav.attributes')}
                  </Link>
                </li>
              ) : null}

              {user?.role === 'CANDIDATE' || user?.role === 'ADMIN' ? (
                <li className="nav-item">
                  <Link className="nav-link" to="/cvs/my">
                    <i className="bi bi-file-text me-1" />{t('nav.myCVs')}
                  </Link>
                </li>
              ) : null}

              {user?.role === 'ADMIN' && (
                <li className="nav-item">
                  <Link className="nav-link" to="/admin">
                    <i className="bi bi-shield-check me-1" />{t('nav.admin')}
                  </Link>
                </li>
              )}

              {/* Theme toggle */}
              <li className="nav-item">
                <button className="btn btn-sm btn-outline-secondary border-0" onClick={toggleTheme} title={t('common.theme')}>
                  <i className="bi bi-circle-half" />
                </button>
              </li>

              {/* Language toggle */}
              <li className="nav-item">
                <button className="btn btn-sm btn-outline-secondary border-0 fw-bold" onClick={toggleLang} style={{ fontSize: '0.75rem' }}>
                  {i18n.language === 'en' ? 'RU' : 'EN'}
                </button>
              </li>

              {user ? (
                <li className="nav-item dropdown">
                  <button className="btn btn-sm d-flex align-items-center gap-2 nav-link dropdown-toggle" data-bs-toggle="dropdown">
                    {user.profile?.photoUrl
                      ? <img src={user.profile.photoUrl} alt="" className="rounded-circle" width={28} height={28} style={{ objectFit: 'cover' }} />
                      : <i className="bi bi-person-circle fs-5" />}
                    <span className="d-none d-lg-inline">{user.profile?.firstName}</span>
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end">
                    <li><Link className="dropdown-item" to={`/profile/${user.id}`}><i className="bi bi-person me-2" />{t('nav.profile')}</Link></li>
                    <li><hr className="dropdown-divider" /></li>
                    <li><button className="dropdown-item text-danger" onClick={handleLogout}><i className="bi bi-box-arrow-right me-2" />{t('nav.logout')}</button></li>
                  </ul>
                </li>
              ) : (
                <>
                  <li className="nav-item"><Link className="nav-link" to="/login">{t('nav.login')}</Link></li>
                  <li className="nav-item"><Link className="btn btn-primary btn-sm" to="/register">{t('nav.register')}</Link></li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>

      <main className="container-fluid py-4 px-3 px-lg-4" style={{ minHeight: 'calc(100vh - 60px)' }}>
        <Outlet />
      </main>

      <footer className="text-center py-3" style={{ borderTop: '1px solid var(--surface-border)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        CV Manager © {new Date().getFullYear()}
      </footer>
    </>
  );
}