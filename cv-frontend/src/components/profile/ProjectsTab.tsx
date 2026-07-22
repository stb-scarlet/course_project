import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/utils/date';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import { profileApi } from '@/api';
import { Profile, Project } from '@/types';

interface Props { profile: Profile; canEdit: boolean; onUpdate: (p: Profile) => void; }

const emptyProject = () => ({ name: '', dateFrom: '', dateTo: '', description: '', tags: [] as string[], version: 0 });

export default function ProjectsTab({ profile, canEdit, onUpdate }: Props) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState(emptyProject());
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setEditing(null); setForm(emptyProject()); };
  const openEdit = (p: Project) => {
    setEditing(p);
    setForm({ name: p.name, dateFrom: p.dateFrom.slice(0, 10), dateTo: p.dateTo?.slice(0, 10) || '', description: p.description, tags: p.tags.map(t => t.tag.name), version: p.version });
  };

  const handleTagInput = async (val: string) => {
    setTagInput(val);
    if (val.length >= 1) {
      const { data } = await profileApi.autocompleteTags(val);
      setTagSuggestions(data.map((t: any) => t.name));
    } else { setTagSuggestions([]); }
  };

  const addTag = (tag: string) => {
    if (!form.tags.includes(tag)) setForm(f => ({ ...f, tags: [...f.tags, tag] }));
    setTagInput(''); setTagSuggestions([]);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Project name is required');
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        dateFrom: new Date(form.dateFrom).toISOString(),
        dateTo: form.dateTo ? new Date(form.dateTo).toISOString() : null,
        description: form.description.trim(),
        tags: form.tags,
        version: form.version,
      };
      if (editing) {
        const { data } = await profileApi.updateProject(editing.id, payload);
        onUpdate({ ...profile, projects: profile.projects.map(p => p.id === editing.id ? data : p) });
      } else {
        const { data } = await profileApi.createProject(payload);
        onUpdate({ ...profile, projects: [...profile.projects, data] });
      }
      const bootstrap = (window as any).bootstrap;
      const modalEl = document.getElementById('projectModal');

      if (modalEl && bootstrap) {
        bootstrap.Modal.getInstance(modalEl)?.hide();;
      }
      setEditing(null);
      toast.success(t('profile.saved'));
    } catch (e: any) {
      if (e.response?.status === 409) toast.error(t('profile.saveConflict'));
      else toast.error(t('common.error'));
    } finally { setSaving(false); }
  };

  const handleDelete = async (p: Project) => {
    try {
      await profileApi.deleteProject(p.id);
      onUpdate({ ...profile, projects: profile.projects.filter(pr => pr.id !== p.id) });
      toast.success('Deleted');
    } catch { toast.error(t('common.error')); }
  };

  return (
    <div>
      {canEdit && (
        <div className="mb-3">
          <button className="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#projectModal" onClick={openCreate}>
            <i className="bi bi-plus-lg me-1" />{t('profile.addProject')}
          </button>
        </div>
      )}

      {profile.projects.length === 0 && <p className="text-muted">{t('profile.noProjects')}</p>}

      <div className="d-flex flex-column gap-3">
        {profile.projects.map(p => (
          <div key={p.id} className="card p-4">
            <div className="d-flex align-items-start gap-3">
              <div className="flex-grow-1">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <h6 className="fw-bold mb-0">{p.name}</h6>
                  <span className="text-muted small">
                    {formatDate(p.dateFrom)} — {p.dateTo ? formatDate(p.dateTo) : 'Present'}
                  </span>
                </div>
                <div className="d-flex flex-wrap gap-1 mb-2">
                  {p.tags.map(tt => <span key={tt.tag.id} className="tag-pill">{tt.tag.name}</span>)}
                </div>
                <div className="prose small">
                  <ReactMarkdown>{p.description}</ReactMarkdown>
                </div>
              </div>
              {canEdit && (
                <div className="d-flex gap-1">
                  <button className="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#projectModal" onClick={() => openEdit(p)}>
                    <i className="bi bi-pencil" />
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(p)}>
                    <i className="bi bi-trash" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <div className="modal fade" id="projectModal" tabIndex={-1}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{editing ? t('profile.editProject') : t('profile.addProject')}</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">{t('profile.projectName')} <span className="text-danger">*</span></label>
                <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label">{t('profile.dateFrom')}</label>
                  <input type="date" className="form-control" value={form.dateFrom} onChange={e => setForm(f => ({ ...f, dateFrom: e.target.value }))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">{t('profile.dateTo')}</label>
                  <input type="date" className="form-control" value={form.dateTo} onChange={e => setForm(f => ({ ...f, dateTo: e.target.value }))} />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">{t('profile.tags')}</label>
                <div className="d-flex flex-wrap gap-1 mb-1">
                  {form.tags.map(tag => (
                    <span key={tag} className="tag-pill d-flex align-items-center gap-1">
                      {tag}
                      <button type="button" className="btn-close" style={{ fontSize: '0.5rem' }}
                        onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))} />
                    </span>
                  ))}
                </div>
                <div className="position-relative">
                  <input className="form-control" placeholder="Type tag..." value={tagInput}
                    onChange={e => handleTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && tagInput) { e.preventDefault(); addTag(tagInput); } }} />
                  {tagSuggestions.length > 0 && (
                    <ul className="list-group position-absolute w-100 shadow" style={{ zIndex: 100, top: '100%' }}>
                      {tagSuggestions.map(s => (
                        <li key={s} className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }} onClick={() => addTag(s)}>{s}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">{t('profile.description')}</label>
                <textarea className="form-control font-monospace" rows={8} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Supports **Markdown** formatting" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" data-bs-dismiss="modal">{t('common.cancel')}</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name || !form.dateFrom}>
                {saving && <span className="spinner-border spinner-border-sm me-2" />}
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}