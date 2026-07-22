import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { profileApi, uploadApi } from '@/api';
import { Profile } from '@/types';
import { useAuthStore } from '@/store/auth.store';
import { useAutoSave } from '@/hooks/useAutoSave';
import ProfileAttributesTab from '@/components/profile/ProfileAttributesTab';
import ProjectsTab from '@/components/profile/ProjectsTab';
import ProfileCVsTab from '@/components/profile/ProfileCVsTab';

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'me' | 'info' | 'projects' | 'cvs'>('me');

  const isOwner = user?.id === userId;
  const isAdmin = user?.role === 'ADMIN';
  const canEdit = isOwner || isAdmin;

  // Basic info form
  const [form, setForm] = useState({ firstName: '', lastName: '', location: '' });
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    profileApi.get(userId).then(r => {
      setProfile(r.data);
      setForm({ firstName: r.data.firstName, lastName: r.data.lastName, location: r.data.location || '' });
      setLoading(false);
    }).catch(() => {toast.error(t('common.error'))}).finally(() => setLoading(false));
  }, [userId]);

  // Auto-save basic info
  const saveStatus = useAutoSave(
    form,
    async (data) => {
      if (!canEdit || !profile) return;
      const { data: serverProflie } = await profileApi.update({ ...data, version: profile.version });
      setProfile(serverProflie);
    },
    4000
  );

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const { data: uploadData  } = await uploadApi.image(file);
      const { data: updatedProfile  } = await profileApi.update({ photoUrl: uploadData.url, version: profile!.version });
      setProfile(updatedProfile);
      toast.success('Photo updated');
    } catch (err: any) { toast.error(err.response?.data?.error || t('common.error')); } finally { setPhotoUploading(false); }
  };

  if (loading) return <div className="text-center py-5"><span className="spinner-border text-primary" /></div>;
  if (!profile) return <div className="text-center py-5 text-muted">Profile not found</div>;

  const fullName = `${profile.firstName} ${profile.lastName}`;

  return (
    <div className="container-lg">
      {/* Profile header */}
      <div className="card p-4 mb-4">
        <div className="d-flex align-items-center gap-4 flex-wrap">
          <div className="position-relative">
            {profile.photoUrl
              ? <img src={profile.photoUrl} alt={fullName} className="rounded-circle" width={80} height={80} style={{ objectFit: 'cover' }} />
              : <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white fw-bold fs-3"
                  style={{ width: 80, height: 80 }}>{profile.firstName[0]}{profile.lastName[0]}</div>
            }
            {canEdit && (
              <label className="position-absolute bottom-0 end-0 btn btn-sm btn-primary rounded-circle p-1" style={{ width: 28, height: 28, lineHeight: 1 }}>
                <i className="bi bi-camera-fill" style={{ fontSize: '0.7rem' }} />
                <input type="file" accept="image/*" className="d-none" onChange={handlePhotoUpload} />
              </label>
            )}
          </div>
          <div className="flex-grow-1">
            <h3 className="fw-bold mb-1">{fullName}</h3>
            {profile.location && <p className="text-muted mb-0"><i className="bi bi-geo-alt me-1" />{profile.location}</p>}
          </div>
          {/* Auto-save indicator */}
          {canEdit && (
            <div className={`autosave-indicator ${saveStatus}`}>
              {saveStatus === 'saving' && <><span className="spinner-border spinner-border-sm" />{t('profile.saving')}</>}
              {saveStatus === 'saved' && <><i className="bi bi-check-circle-fill" />{t('profile.saved')}</>}
              {saveStatus === 'conflict' && <><i className="bi bi-exclamation-triangle-fill" />{t('profile.saveConflict')}</>}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        {[
          { key: 'me', icon: 'person', label: t('profile.me') },
          { key: 'info', icon: 'tags', label: t('profile.info') },
          { key: 'projects', icon: 'folder', label: t('profile.projects') },
          { key: 'cvs', icon: 'file-text', label: t('profile.cvs') },
        ].map(tab_ => (
          <li key={tab_.key} className="nav-item">
            <button className={`nav-link ${tab === tab_.key ? 'active' : ''}`} onClick={() => setTab(tab_.key as any)}>
              <i className={`bi bi-${tab_.icon} me-1`} />{tab_.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="profile-tab-content">
        {tab === 'me' && (
          <div className="card p-4" style={{ maxWidth: 600 }}>
            <h6 className="fw-semibold mb-3">{t('profile.me')}</h6>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">{t('profile.firstName')}</label>
                <input className="form-control" value={form.firstName} disabled={!canEdit}
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div className="col-md-6">
                <label className="form-label">{t('profile.lastName')}</label>
                <input className="form-control" value={form.lastName} disabled={!canEdit}
                  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
              <div className="col-12">
                <label className="form-label">{t('profile.location')}</label>
                <input className="form-control" value={form.location} disabled={!canEdit}
                  placeholder="City, Country"
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
              </div>
            </div>
            {canEdit && (
              <p className="text-muted small mt-3 mb-0">
                <i className="bi bi-info-circle me-1" />{t('profile.autosaveInfo')}
              </p>
            )}
          </div>
        )}

        {tab === 'info' && (
          <ProfileAttributesTab
            profile={profile}
            canEdit={canEdit}
            onUpdate={setProfile}
          />
        )}

        {tab === 'projects' && (
          <ProjectsTab profile={profile} canEdit={canEdit} onUpdate={setProfile} />
        )}

        {tab === 'cvs' && (
          <ProfileCVsTab userId={userId!} isOwner={isOwner} />
        )}
      </div>
    </div>
  );
}