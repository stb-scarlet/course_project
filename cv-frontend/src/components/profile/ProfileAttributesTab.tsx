import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { attributeApi, profileApi } from '@/api';
import { Profile, Attribute, AttributeValue } from '@/types';

interface Props { profile: Profile; canEdit: boolean; onUpdate: (p: Profile) => void; }

export default function ProfileAttributesTab({ profile, canEdit, onUpdate }: Props) {
  const { t } = useTranslation();
  const [allAttrs, setAllAttrs] = useState<Attribute[]>([]);  
  const [recentAttrs, setRecentAttrs] = useState<Attribute[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const profileAttrIds = new Set(profile.attributeValues.map(av => av.attributeId));

  useEffect(() => {
    attributeApi.list({ limit: 100 }).then(r => setAllAttrs(r.data.items)).catch((err) => {console.error("Failed to load Attributes for position: ", err)});
    attributeApi.recent().then(r => setRecentAttrs(r.data)).catch((err) => {console.error("Failed to load Recent Attributes for position: ", err)});
  }, []);

  const availableToAdd = allAttrs.filter(a =>
    !profileAttrIds.has(a.id) &&
    (search === '' || a.name.toLowerCase().includes(search.toLowerCase())) &&
    (categoryFilter === '' || a.category === categoryFilter)
  );

  const handleAdd = async (attr: Attribute) => {
    try {
      const { data: serverCreatedValue } = await profileApi.upsertAttribute(attr.id, { value: null, version: 0 });
      onUpdate({ ...profile, attributeValues: [...profile.attributeValues, serverCreatedValue] });
    } catch (err: any) { toast.error(err.response?.data?.error || t('common.error')); }
  };

  const handleRemove = async (attrId: string) => {
    try {
      await profileApi.removeAttribute(attrId);
      onUpdate({ ...profile, attributeValues: profile.attributeValues.filter(av => av.attributeId !== attrId) });
    } catch (err: any) { toast.error(err.response?.data?.error || t('common.error')); }
  };

  const handleSaveValue = async (av: AttributeValue) => {
    try {
    let finalValue: string | null = editValue.trim() || null;
    if (av.attribute.type === 'NUMERIC' && editValue) finalValue = String(Number(editValue));
    if (av.attribute.type === 'BOOLEAN') finalValue = editValue === 'true' ? 'true' : 'false'; 
      const { data } = await profileApi.upsertAttribute(av.attributeId, { value: finalValue || null, version: av.version });
      onUpdate({ ...profile, attributeValues: profile.attributeValues.map(a => a.attributeId === av.attributeId ? { ...a, ...data } : a) });
      setEditingId(null);
      toast.success(t('profile.saved'));
    } catch (err: any) {
      if (err.response?.status === 409) toast.error(t('profile.saveConflict'));
      else toast.error(err.response?.data?.error || t('common.error'));
    }
  };

  const CATEGORIES = ['CERTIFICATION', 'DOMAIN_KNOWLEDGE', 'PERSONAL_INFORMATION', 'SOFT_SKILLS', 'LANGUAGE', 'EDUCATION', 'OTHER'];

  const renderValueInput = (av: AttributeValue) => {
    const type = av.attribute.type;
    if (type === 'BOOLEAN') return (
      <input type="checkbox" className="form-check-input" checked={editValue === 'true'}
        onChange={e => setEditValue(e.target.checked ? 'true' : 'false')} />
    );
    if (type === 'ONE_OF_MANY') {
      const options = av.attribute.options ? JSON.parse(av.attribute.options) : [];
      return (
        <select className="form-select form-select-sm" value={editValue} onChange={e => setEditValue(e.target.value)}>
          <option value="">Select...</option>
          {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (type === 'TEXT') return (
      <textarea className="form-control form-control-sm shadow-none" rows={3} value={editValue} onChange={e => setEditValue(e.target.value)} />
    );
    if (type === 'NUMERIC') return (
      <input type="number" className="form-control form-control-sm shadow-none" value={editValue} onChange={e => setEditValue(e.target.value)} />
    );
    if (type === 'DATE') return (
      <input type="date" className="form-control form-control-sm shadow-none" value={editValue} onChange={e => setEditValue(e.target.value)} />
    );
    return <input type="text" className="form-control form-control-sm shadow-none" value={editValue} onChange={e => setEditValue(e.target.value)} />;
  };

  return (
    <div className="row g-4">
      {/* Current attributes */}
      <div className="col-lg-7">
        <h6 className="fw-semibold mb-3">{t('profile.info')}</h6>
        {profile.attributeValues.length === 0
          ? <p className="text-muted">{t('profile.addAttribute')}</p>
          : (
            <div className="card">
              <ul className="list-group list-group-flush">
                {profile.attributeValues.map(av => (
                  <li key={av.attributeId} className="list-group-item cv-attribute-row">
                    <div className="d-flex align-items-start gap-2">
                      <div className="flex-grow-1 ps-2">
                        <div className="fw-medium small mb-1">{av.attribute.name}
                          <span className="badge bg-secondary-subtle text-secondary ms-2" style={{ fontSize: '0.7rem' }}>{av.attribute.category}</span>
                        </div>

                        {editingId === av.attributeId && canEdit ? (
                          <div className="d-flex gap-2 align-items-center">
                            {renderValueInput(av)}
                            <button className="btn btn-sm btn-primary" onClick={() => handleSaveValue(av)}>
                              <i className="bi bi-check" />
                            </button>
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => setEditingId(null)}>
                              <i className="bi bi-x" />
                            </button>
                          </div>
                        ) : (
                          <span
                            className={av.value ? '' : 'empty-value'}
                            onClick={() => { if (canEdit) { setEditingId(av.attributeId); setEditValue(av.value || ''); } }}
                            style={{ cursor: canEdit ? 'pointer' : 'default' }}
                            title={canEdit ? 'Click to edit' : ''}
                          >
                            {av.value || t('cv.emptyValue')}
                            {canEdit && !editingId && <i className="bi bi-pencil-fill ms-2 text-muted" style={{ fontSize: '0.7rem', opacity: 0.5 }} />}
                          </span>
                        )}
                      </div>
                      {canEdit && (
                        <button className="btn btn-sm btn-outline-danger border-0" onClick={() => handleRemove(av.attributeId)}>
                          <i className="bi bi-x-lg" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
      </div>

      {/* Add attributes panel */}
      {canEdit && (
        <div className="col-lg-5">
          <h6 className="fw-semibold mb-3">{t('profile.addAttribute')}</h6>
          <div className="card p-3">
            {recentAttrs.length > 0 && (
              <div className="mb-3">
                <div className="small text-muted mb-2"><i className="bi bi-clock me-1" />{t('attributes.recentlyUsed')}</div>
                <div className="d-flex flex-wrap gap-1">
                  {recentAttrs.filter(a => !profileAttrIds.has(a.id)).slice(0, 5).map(a => (
                    <button key={a.id} className="btn btn-sm btn-outline-primary" onClick={() => handleAdd(a)}>
                      <i className="bi bi-plus me-1" />{a.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <input className="form-control form-control-sm mb-2 shadow-none" placeholder={t('attributes.searchPlaceholder')}
              value={search} onChange={e => setSearch(e.target.value)} />

            <select className="form-select form-select-sm mb-3 shadow-none" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="">{t('attributes.filterByCategory')}</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <div style={{ maxHeight: 240, overflowY: 'auto' }}>
              {availableToAdd.slice(0, 20).map(a => (
                <button key={a.id} className="btn btn-sm btn-outline-secondary w-100 text-start mb-1 d-flex justify-content-between align-items-center"
                  onClick={() => handleAdd(a)}>
                  <span>{a.name}</span>
                  <span className="badge bg-secondary-subtle text-secondary">{a.type}</span>
                </button>
              ))}
              {availableToAdd.length === 0 && <p className="text-muted small text-center">{t('common.noResults')}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}