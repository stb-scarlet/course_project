import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import Layout from '@/components/layout/Layout';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import AuthCallbackPage from '@/pages/AuthCallbackPage';
import PositionsPage from '@/pages/PositionsPage';
import PositionDetailPage from '@/pages/PositionDetailPage';
import PositionFormPage from '@/pages/PositionFormPage';
import ProfilePage from '@/pages/ProfilePage';
import CVPage from '@/pages/CVPage';
import MyCVsPage from '@/pages/MyCVsPage';
import AttributesPage from '@/pages/AttributesPage';
import AdminPage from '@/pages/AdminPage';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function App() {
  const { user, fetchMe, token } = useAuthStore();

  // Apply theme from user preferences
  useEffect(() => {
    const theme = user?.theme || localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-bs-theme', theme);
  }, [user?.theme]);

  // Restore session on mount
  useEffect(() => {
    if (token) fetchMe();
  }, []);

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Main layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/positions" element={<PositionsPage />} />
          <Route path="/positions/:id" element={<PositionDetailPage />} />

          {/* Recruiter/Admin only */}
          <Route element={<ProtectedRoute roles={['RECRUITER', 'ADMIN']} />}>
            <Route path="/positions/new" element={<PositionFormPage />} />
            <Route path="/positions/:id/edit" element={<PositionFormPage />} />
            <Route path="/attributes" element={<AttributesPage />} />
          </Route>

          {/* Authenticated */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile/:userId" element={<ProfilePage />} />
            <Route path="/cvs/my" element={<MyCVsPage />} />
            <Route path="/cvs/:cvId" element={<CVPage />} />
          </Route>

          {/* Admin only */}
          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}