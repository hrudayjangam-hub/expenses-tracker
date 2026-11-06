import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { AlertTriangle, ChevronLeft, ChevronRight, Pencil, PiggyBank, Plus, Trash2, Wallet } from 'lucide-react';
import useAsync from '../hooks/useAsync';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { listBudgets, createBudget, updateBudget, deleteBudget } from '../services/budgetService';
import { useCategories } from '../hooks/useCategories';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, monthName } from '../utils/format';
import { Badge, EmptyState, FullSpinner, ProgressBar, SectionHeader } from '../components/ui/Primitives';
import Reveal from '../components/motion/Reveal';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { Field, Input, Select, FormError } from '../components/ui/Fields';
import { Spinner } from '../components/ui/Primitives';
import { getErrorMessage } from '../services/api';

const OVERALL = 'Overall';
const STATUS_TONE = { ok: 'emerald', warning: 'amber', danger: 'amber', over: 'rose' };
const STATUS_LABEL = { ok: 'On track', warning: '75% used', danger: '90% used', over: 'Over budget' };

const schema = z.object({
  category: z.string().min(1, 'Pick a category'),
  amount: z.coerce.number({ invalid_type_error: 'Enter a valid amount' }).positive('Budget must be greater than 0'),
});

function shiftMonth(month, year, delta) {
  const d = new Date(year, month - 1 + delta, 1);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export default function Budgets() {
  useDocumentTitle('Budgets');
  const { user } = useAuth();
  const currency = user?.currency || 'INR';
  const { categories } = useCategories('expense');

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const budgetsQ = useAsync(() => listBudgets({ month, year }), [month, year]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { category: '', amount: '' } });

  const openCreate = () => {
    setEditing(null);
    reset({ category: '', amount: '' });
    setModalOpen(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    reset({ category: b.category, amount: b.amount });
    setModalOpen(true);
  };

  const onSubmit = async (values) => {
    const payload = { ...values, amount: Number(values.amount), month, year };
    try {
      if (editing) {
        await updateBudget(editing._id, { ...payload, category: values.category });
        toast.success('Budget updated');
      } else {
        await createBudget(payload);
        toast.success('Budget created');
      }
      setModalOpen(false);
      setEditing(null);
      budgetsQ.reload();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the budget.'));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteBudget(deleting._id);
      toast.success('Budget deleted');
      setDeleting(null);
      budgetsQ.reload();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete the budget.'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const budgets = budgetsQ.data?.budgets || [];
  const usedCategories = useMemo(() => new Set(budgets.map((b) => b.category)), [budgets]);
  const alerts = budgets.filter((b) => b.percent >= 75);

  const categoryOptions = categories.filter((c) => !usedCategories.has(c.name) || editing?.category === c.name);

  if (budgetsQ.loading && !budgetsQ.data) return <FullSpinner label="Loading budgets…" />;

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Budgets"
        subtitle="Set monthly limits for the whole wallet or per category."
        action={
          <button className="btn-primary !py-2.5" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New budget
          </button>
        }
      />

      {/* Month picker */}
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2">
          <button
            aria-label="Previous month"
            onClick={() => {
              const p = shiftMonth(month, year, -1);
              setMonth(p.month);
              setYear(p.year);
            }}
            className="rounded-xl p-2 text-ink-600 ring-1 ring-ink-200 transition hover:bg-ink-50 dark:text-ink-300 dark:ring-ink-700 dark:hover:bg-ink-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[170px] text-center">
            <p className="text-sm font-bold text-ink-900 dark:text-white">{monthName(month, year)}</p>
            <p className="text-xs text-ink-400">
              {month === now.getMonth() + 1 && year === now.getFullYear() ? 'Current month' : 'Historical view'}
            </p>
          </div>
          <button
            aria-label="Next month"
            onClick={() => {
              const p = shiftMonth(month, year, 1);
              setMonth(p.month);
              setYear(p.year);
            }}
            className="rounded-xl p-2 text-ink-600 ring-1 ring-ink-200 transition hover:bg-ink-50 dark:text-ink-300 dark:ring-ink-700 dark:hover:bg-ink-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary !py-2 !text-xs"
            onClick={() => {
              setMonth(now.getMonth() + 1);
              setYear(now.getFullYear());
            }}
          >
            Today
          </button>
          <span className="text-xs font-medium text-ink-400">
            {budgets.length} budget{budgets.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {alerts.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Budget alerts</p>
              <ul className="mt-1 space-y-0.5 text-sm text-amber-700 dark:text-amber-400/90">
                {alerts.map((b) => (
                  <li key={b._id}>
                    <span className="font-semibold">{b.category}</span> is at{' '}
                    <span className="font-bold">{b.percent}%</span> of {formatCurrency(b.amount, currency)}
                    {b.status === 'over'
                      ? ` — over by ${formatCurrency(Math.abs(b.remaining), currency)}`
                      : b.status === 'danger'
                        ? ` — only ${formatCurrency(b.remaining, currency)} left`
                        : ''}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {budgetsQ.error ? (
        <div className="card flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-sm font-medium text-rose-500">{budgetsQ.error}</p>
          <button className="btn-secondary !py-2" onClick={budgetsQ.reload}>Retry</button>
        </div>
      ) : budgets.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title={`No budgets for ${monthName(month, year)}`}
          description="Create an overall budget or category limits to start tracking utilisation."
          action={
            <button className="btn-primary !py-2" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Create budget
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {budgets.map((b, i) => (
            <Reveal key={b._id} delay={Math.min(i, 8) * 0.06} y={22} amount={0.15}>
            <article className="card group relative p-5 transition hover:-translate-y-0.5 hover:shadow-pop">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      b.category === OVERALL
                        ? 'bg-ink-900 text-white dark:bg-emerald-500 dark:text-ink-950'
                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                    }`}
                  >
                    <Wallet className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-ink-900 dark:text-white">{b.category}</h3>
                    <p className="text-xs text-ink-400">
                      {formatCurrency(b.amount, currency)} limit
                    </p>
                  </div>
                </div>
                <Badge tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</Badge>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                  <span className="text-ink-500 dark:text-ink-400">
                    Spent <span className="text-ink-800 tabular dark:text-ink-100">{formatCurrency(b.spent, currency)}</span>
                  </span>
                  <span className="text-ink-900 tabular dark:text-white">{b.percent}%</span>
                </div>
                <ProgressBar percent={b.percent} status={b.status} />
                <p className="mt-2 text-xs text-ink-400">
                  {b.remaining >= 0 ? (
                    <>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(b.remaining, currency)}
                      </span>{' '}
                      remaining
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        {formatCurrency(Math.abs(b.remaining), currency)}
                      </span>{' '}
                      overspent
                    </>
                  )}
                </p>
              </div>

              <div className="mt-4 flex gap-2 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                <button className="btn-secondary flex-1 !py-2 !text-xs" onClick={() => openEdit(b)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button className="btn-ghost !px-3 !py-2 !text-xs text-rose-500" onClick={() => setDeleting(b)} aria-label="Delete budget">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
            </Reveal>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? 'Edit budget' : 'Create budget'}
        description={`Budgets apply to ${monthName(month, year)}.`}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormError message={errors.root?.message} />
          <Field label="Category" error={errors.category?.message}>
            <Select invalid={Boolean(errors.category)} {...register('category')}>
              <option value="">Select category</option>
              <option value={OVERALL}>{OVERALL} (entire month)</option>
              {categoryOptions.map((c) => (
                <option key={c._id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Amount" error={errors.amount?.message} hint={`Monthly limit in ${currency}`}>
            <Input
              type="number"
              step="0.01"
              min="1"
              inputMode="decimal"
              placeholder="10000"
              invalid={Boolean(errors.amount)}
              {...register('amount')}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setModalOpen(false);
                setEditing(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? <Spinner className="h-4 w-4" /> : null}
              {editing ? 'Save changes' : 'Create budget'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete budget?"
        message={`The ${deleting?.category} budget of ${formatCurrency(deleting?.amount || 0, currency)} for ${monthName(month, year)} will be removed. Transactions are not affected.`}
        confirmLabel="Delete"
        loading={deleteLoading}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
