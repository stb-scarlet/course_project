import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

export default function AuthCallbackPage() {
  const [params] = useSearchParams();
  const { setAuth, fetchMe } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
      fetchMe().then(() => navigate('/'));
    } else {
      navigate('/login?error=oauth');
    }
  }, []);

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center">
      <div className="text-center">
        <div className="spinner-border text-primary mb-3" />
        <p className="text-muted">Signing in...</p>
      </div>
    </div>
  );
}