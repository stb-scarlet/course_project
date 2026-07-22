import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Select from 'react-select';
import { positionApi, attributeApi } from '@/api';
import { Attribute, FilterOperator, PositionAccessType } from '@/types';

const OPERATORS: FilterOperator[] = ['EQ', 'NEQ', 'GT', 'GTE', 'LT', 'LTE', 'CONTAINS', 'IN'];

interface AttrOption { value: string; label: string; attr: Attribute; }

export default function PositionFormPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [accessType, setAccessType] = useState<PositionAccessType>('PUBLIC');
  const [maxProjects, setMaxProjects] = useState(3);
  const [version, setVersion] = useState(0);
  const [selectedAttrs, setSelectedAttrs] = useState<{ attributeId: string; order: number; required: boolean }[]>([]);
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [accessRules, setAccessRules] = useState<{ attributeId: string; operator: FilterOperator; value: string }[]>([]);
  const [allAttrs, setAllAttrs] = useState<Attribute[]>([]);
  const [saving, setSaving] = useState(false);

  // Load attributes
  useEffect(() => {
    attributeApi.list({ limit: 100 })
      .then(r => setAllAttrs(r.data.items))
      .catch(() => { toast.error( t('common.error')) });
  }, []);

  // Load position for edit
  useEffect(() => {
    if (!isEdit || !id) return;
    positionApi.get(id).then(r => {
      const p = r.data;
      setTitle(p.title); setDescription(p.shortDescription);
      setAccessType(p.accessType); setMaxProjects(p.maxProjects); setVersion(p.version);
      setSelectedAttrs(p.attributes?.map((a: any) => ({ attributeId: a.attributeId, order: a.order, required: a.required })) || []);
      setTagNames(p.positionTags?.map((pt: any) => pt.tag.name) || []);
      setAccessRules(p.accessRules?.map((r: any) => ({ attributeId: r.attributeId, operator: r.operator, value: r.value })) || []);
    }).catch(() => { toast.error(t('common.error')) });
  }, [id]);

  const attrOptions: AttrOption[] = allAttrs.map(a => ({ value: a.id, label: `${a.name} (${a.type})`, attr: a }));

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const v = tagInput.trim();
      if (v && !tagNames.includes(v)) setTagNames(prev => [...prev, v]);
      setTagInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Title is required');

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        shortDescription: description.trim(), 
        accessType,
        maxProjects: maxProjects,
        attributeIds: selectedAttrs,
        tagNames,
        accessRules,
        version
      }
      if (isEdit) {
        await positionApi.update(id!, payload);
        toast.success('Position updated');
      } else {
        await positionApi.create(payload);
        toast.success('Position created');
      }
      navigate('/positions');
    } catch (err: any) {
      if (err.response?.status === 409) toast.error(t('profile.saveConflict'));
      else toast.error(err.response?.data?.error || t('common.error'));
    } finally { setSaving(false); }
  };

  return (
    <div className="container-lg" style={{ maxWidth: 820 }}>
      <h3 className="fw-bold mb-4">
        <i className={`bi bi-${isEdit ? 'pencil' : 'plus-circle'} me-2 text-primary`} />
        {isEdit ? t('positions.edit') : t('positions.new')}
      </h3>

      <form onSubmit={handleSubmit}>
        <div className="card p-4 mb-4">
          <h6 className="fw-semibold mb-3">Basic Information</h6>
          <div className="mb-3">
            <label className="form-label fw-medium">Title <span className="text-danger">*</span></label>
            <input className="form-control" required value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="form-label fw-medium">Short Description</label>
            <textarea className="form-control" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label fw-medium">{t('positions.access')}</label>
              <select className="form-select" value={accessType} onChange={e => setAccessType(e.target.value as PositionAccessType)}>
                <option value="PUBLIC">{t('positions.public')}</option>
                <option value="RESTRICTED">{t('positions.restricted')}</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label fw-medium">{t('positions.maxProjects')}</label>
              <input type="number" className="form-control" min={0} max={20} value={maxProjects} onChange={e => setMaxProjects(+e.target.value)} />
            </div>
          </div>
        </div>

        {/* Attributes */}
        <div className="card p-4 mb-4">
          <h6 className="fw-semibold mb-3"><i className="bi bi-list-check me-2 text-primary" />{t('positions.attributes')}</h6>
          <Select
            isMulti
            closeMenuOnSelect={false}
            options={attrOptions}
            value={attrOptions.filter(o => selectedAttrs.some(a => a.attributeId === o.value))}
            onChange={(vals) => setSelectedAttrs((vals as AttrOption[]).map((v, i) => ({ attributeId: v.value, order: i, required: false })))}
            placeholder="Select attributes..."
            classNamePrefix="react-select"
          />
          {selectedAttrs.length > 0 && (
            <div className="mt-3">
              {selectedAttrs.map((sa, i) => {
                const attr = allAttrs.find(a => a.id === sa.attributeId);
                return (
                  <div key={sa.attributeId} className="d-flex align-items-center gap-2 mb-2">
                    <span className="text-muted small" style={{ minWidth: 20 }}>{i + 1}.</span>
                    <span className="flex-grow-1 fw-medium">{attr?.name}</span>
                    <div className="form-check mb-0">
                      <input type="checkbox" className="form-check-input" checked={sa.required}
                        onChange={e => setSelectedAttrs(prev => prev.map((a, j) => j === i ? { ...a, required: e.target.checked } : a))} />
                      <label className="form-check-label small">Required</label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="card p-4 mb-4">
          <h6 className="fw-semibold mb-3"><i className="bi bi-tags me-2 text-primary" />{t('positions.tags')}</h6>
          <input className="form-control mb-2" placeholder="Type tag and press Enter or comma..."
            value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleAddTag} />
          <div className="d-flex flex-wrap gap-1">
            {tagNames.map(tag => (
              <span key={tag} className="tag-pill d-flex align-items-center gap-1">
                {tag}
                <button type="button" className="btn-close btn-close-sm" style={{ fontSize: '0.5rem' }}
                  onClick={() => setTagNames(prev => prev.filter(t => t !== tag))} />
              </span>
            ))}
          </div>
        </div>

        {/* Access Rules */}
        {accessType === 'RESTRICTED' && (
          <div className="card p-4 mb-4">
            <h6 className="fw-semibold mb-3"><i className="bi bi-shield-check me-2 text-warning" />{t('positions.accessRules')}</h6>
            {accessRules.map((rule, i) => (
              <div key={i} className="row g-2 mb-2 align-items-center">
                <div className="col">
                  <select className="form-select form-select-sm" value={rule.attributeId}
                    onChange={e => setAccessRules(prev => prev.map((r, j) => j === i ? { ...r, attributeId: e.target.value } : r))}>
                    <option value="">Select attribute...</option>
                    {allAttrs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div className="col-auto">
                  <select className="form-select form-select-sm" value={rule.operator}
                    onChange={e => setAccessRules(prev => prev.map((r, j) => j === i ? { ...r, operator: e.target.value as FilterOperator } : r))}>
                    {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
                  </select>
                </div>
                <div className="col">
                  <input className="form-control form-control-sm" placeholder="Value (JSON)" value={rule.value}
                    onChange={e => setAccessRules(prev => prev.map((r, j) => j === i ? { ...r, value: e.target.value } : r))} />
                </div>
                <div className="col-auto">
                  <button type="button" className="btn btn-sm btn-outline-danger"
                    onClick={() => setAccessRules(prev => prev.filter((_, j) => j !== i))}>
                    <i className="bi bi-trash" />
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-sm btn-outline-secondary mt-1"
              onClick={() => setAccessRules(prev => [...prev, { attributeId: '', operator: 'EQ', value: '' }])}>
              <i className="bi bi-plus me-1" />Add Rule
            </button>
          </div>
        )}

        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <span className="spinner-border spinner-border-sm me-2" />}
            {t('common.save')}
          </button>
          <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}