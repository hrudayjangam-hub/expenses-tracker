import { getIcon } from '../utils/icons';

const FALLBACK = '#64748b';

export default function CategoryBadge({ name, type = 'expense', categories = [], size = 'md' }) {
  const found = categories.find((c) => c.name === name);
  const color = found?.color || (type === 'income' ? '#10b981' : FALLBACK);
  const Icon = getIcon(found?.icon || 'Tag');

  return (
    <span
      className={`inline-flex items-center gap-2 font-medium text-ink-700 dark:text-ink-200 ${
        size === 'sm' ? 'text-xs' : 'text-sm'
      }`}
    >
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}1f`, color }}
      >
        <Icon className={size === 'sm' ? 'h-3.5 w-3.5 p-0.5' : 'h-4 w-4 p-0.5'} />
      </span>
      <span className="truncate">{name}</span>
    </span>
  );
}
