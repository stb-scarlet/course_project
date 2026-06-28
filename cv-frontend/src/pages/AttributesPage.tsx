import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { attributeApi } from '@/api';
import { Attribute, AttributeCategory, AttributeType } from '@/types';
import Pagination from '@/components/common/Pagination';

const CATEGORIES: AttributeCategory[] = ['CERTIFICATION', 'DOMAIN_KNOWLEDGE', 'PERSONAL_INFORMATION', 'SOFT_SKILLS', 'LANGUAGE', 'EDUCATION', 'OTHER'];
const TYPES: AttributeType[] = ['STRING', 'TEXT', 'IMAGE', 'NUMERIC', 'DATE', 'PERIOD', 'BOOLEAN', 'ONE_OF_MANY'];

const emptyForm = () => ({ name: '', category: 'SOFT_SKILLS' as AttributeCategory, type: 'STRING' as AttributeType, options: '' });

export default function AttributesPage() {
  const { t } = useTranslation();
  const [attrs, setAttrs] = useState<Attribute[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Attribute | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (p = 1, q = search, cat = categoryFilter) => {
    setLoading(true);
    try {
      const { data } = await attributeApi.list({ q, category: cat || undefined, page: p, limit: 20 });
      setAttrs(data.items); setTotal(data.total); setPages(data.pages); setPage(p);
    } finally { setLoading(false); }
  }, [search, categoryFilter]);

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm()); };
  const openEdit = (a: Attribute) => {
    setEditing(a);
    setForm({
      name: a.name, category: a.category, type: a.type,
      options: a.options ? JSON.parse(a.options).join(', ') : '',
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        category: form.category,
        type: form.type,
        options: form.type === 'ONE_OF_MANY'
          ? form.options.split(',').map(s => s.trim()).filter(Boolean)
          : undefined,
      };
      if (editing) {
        const { data } = await attributeApi.update(editing.id, payload);
        setAttrs(prev => prev.map(a => a.id === editing.id ? data : a));
        toast.success('Updated');
      } else {
        await attributeApi.create(payload);
        toast.success('Created');
        load(1);
      }
      setEditing(undefined as any);
    } catch (e: any) {
      toast.error(e.response?.data?.error || t('common.error'));
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this attribute?')) return;
    try {
      await attributeApi.delete(id);
      setAttrs(prev => prev.filter(a => a.id !== id));
      toast.success('Deleted');
    } catch { toast.error(t('common.error')); }
  };

  return (
    <div className="container-lg">
      <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
        <h3 className="fw-bold mb-0">
          <i className="bi bi-tags me-2 text-primary" />{t('attributes.title')}
          <span className="badge bg-primary-subtle text-primary ms-2 fs-6">{total}</span>
        </h3>
        <div className="d-flex gap-2 ms-auto flex-wrap">
          <div className="input-group" style={{ minWidth: 200 }}>
            <span className="input-group-text"><i className="bi bi-search" /></span>
            <input className="form-control" placeholder={t('attributes.searchPlaceholder')}
              value={search} onChange={e => { setSearch(e.target.value); load(1, e.target.value, categoryFilter); }} />
          </div>
          <select className="form-select" style={{ width: 'auto' }} value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); load(1, search, e.target.value); }}>
            <option value="">{t('attributes.filterByCategory')}</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn btn-primary" data-bs-toggle="modal" data-bs-target="#attrModal" onClick={openCreate}>
            <i className="bi bi-plus-lg me-1" />{t('attributes.new')}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover mb-0 table-hover-actions align-middle">
            <thead className="table-light">
              <tr>
                <th>{t('attributes.name')}</th>
                <th>{t('attributes.category')}</th>
                <th>{t('attributes.type')}</th>
                <th>Options</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="text-center py-4"><span className="spinner-border spinner-border-sm" /></td></tr>}
              {!loading && attrs.map(a => (
                <tr key={a.id}>
                  <td className="fw-medium">{a.name}</td>
                  <td><span className="badge bg-secondary-subtle text-secondary">{a.category}</span></td>
                  <td><span className="badge bg-primary-subtle text-primary">{a.type}</span></td>
                  <td className="small text-muted">
                    {a.options ? JSON.parse(a.options).join(', ') : '—'}
                  </td>
                  <td>
                    <div className="row-actions d-flex gap-1">
                      <button className="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#attrModal" onClick={() => openEdit(a)}>
                        <i className="bi bi-pencil" />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(a.id)}>
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && attrs.length === 0 && (
                <tr><td colSpan={5} className="text-center text-muted py-5">{t('attributes.noAttributes')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} pages={pages} onChange={p => load(p)} />

      {/* Modal */}
      <div className="modal fade" id="attrModal" tabIndex={-1}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{editing ? t('attributes.edit') : t('attributes.new')}</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">{t('attributes.name')} <span className="text-danger">*</span></label>
                <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="mb-3">
                <label className="form-label">{t('attributes.category')}</label>
                <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as AttributeCategory }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">{t('attributes.type')}</label>
                <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as AttributeType }))}>
                  {TYPES.map(tp => <option key={tp} value={tp}>{tp}</option>)}
                </select>
              </div>
              {form.type === 'ONE_OF_MANY' && (
                <div className="mb-3">
                  <label className="form-label">{t('attributes.options')}</label>
                  <input className="form-control" placeholder="e.g. Beginner, Intermediate, Advanced"
                    value={form.options} onChange={e => setForm(f => ({ ...f, options: e.target.value }))} />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" data-bs-dismiss="modal">{t('common.cancel')}</button>
              <button className="btn btn-primary" data-bs-dismiss={saving ? undefined : 'modal'} onClick={handleSave} disabled={saving || !form.name}>
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