import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { authApi } from '@/api';
import { useAuthStore } from '@/store/auth.store';

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [loading, setLoading] = useState(false);
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.register(form);
      setAuth(data.user, data.token);
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('common.error'));
    } finally { setLoading(false); }
  };

  const f = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: 'var(--surface-bg)' }}>
      <div className="card bg-white shadow-sm p-4" style={{ width: '100%', maxWidth: 440 }}>
        <div className="text-center mb-4">
          <i className="bi bi-file-earmark-person-fill text-primary fs-1" />
          <h4 className="mt-2 fw-bold">CV Manager</h4>
          <p className="text-muted small">{t('auth.register')}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="row g-2 mb-3">
            <div className="col">
              <label className="form-label">{t('auth.firstName')}</label>
              <input className="form-control" required value={form.firstName} onChange={f('firstName')} />
            </div>
            <div className="col">
              <label className="form-label">{t('auth.lastName')}</label>
              <input className="form-control" required value={form.lastName} onChange={f('lastName')} />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label">{t('auth.email')}</label>
            <input type="email" className="form-control" required value={form.email} onChange={f('email')} />
          </div>
          <div className="mb-3">
            <label className="form-label">{t('auth.password')}</label>
            <input type="password" className="form-control" required minLength={8} value={form.password} onChange={f('password')} />
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading && <span className="spinner-border spinner-border-sm me-2" />}
            {t('auth.register')}
          </button>
        </form>

        <div className="position-relative my-3">
          <hr /><span className="position-absolute top-50 start-50 translate-middle bg-white px-2 text-muted small">{t('auth.registerWith')}</span>
        </div>
        <div className="d-grid gap-2">
          <a href={`${baseUrl}/api/auth/google`} className="btn btn-outline-secondary"><i className="bi bi-google me-2" />{t('auth.google')}</a>
          <a href={`${baseUrl}/api/auth/facebook`} className="btn btn-outline-secondary"><i className="bi bi-facebook me-2" />{t('auth.facebook')}</a>
        </div>

        <p className="text-center mt-3 small text-muted">
          {t('auth.haveAccount')} <Link to="/login">{t('nav.login')}</Link>
        </p>
      </div>
    </div>
  );
}