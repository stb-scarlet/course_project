import { useTranslation } from 'react-i18next';

interface Props {
  page: number;
  pages: number;
  onChange: (p: number) => void;
}

export default function Pagination({ page, pages, onChange }: Props) {
  const { t } = useTranslation();
  if (pages <= 1) return null;
  return (
    <nav className="d-flex align-items-center gap-2 justify-content-center mt-3">
      <button className="btn btn-sm btn-outline-secondary" disabled={page === 1} onClick={() => onChange(page - 1)}>
        <i className="bi bi-chevron-left" />
      </button>
      <span className="text-muted small">{t('common.page')} {page} {t('common.of')} {pages}</span>
      <button className="btn btn-sm btn-outline-secondary" disabled={page === pages} onClick={() => onChange(page + 1)}>
        <i className="bi bi-chevron-right" />
      </button>
    </nav>
  );
}