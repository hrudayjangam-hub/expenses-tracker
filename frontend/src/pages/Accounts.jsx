import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  Banknote,
  CreditCard,
  Landmark,
  Pencil,
  PiggyBank,
  Plus,
  Smartphone,
  Trash2,
  Wallet,
  WalletCards,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import useAsync from '../hooks/useAsync';
import useDocumentTitle from '../hooks/useDocumentTitle';
import useChartTheme from '../hooks/useChartTheme';
import { listAccounts, createAccount, updateAccount, deleteAccount, netWorthHistory } from '../services/accountService';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/format';
import { Badge, EmptyState, FullSpinner, SectionHeader, Spinner } from '../components/ui/Primitives';
import Reveal from '../components/motion/Reveal';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { Field, Input, Select, FormError } from '../components/ui/Fields';
import { getErrorMessage } from '../services/api';

const TYPES = [
  { id: 'checking', label: 'Checking', icon: Landmark },
  { id: 'savings', label: 'Savings', icon: PiggyBank },
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'wallet', label: 'Wallet', icon: Smartphone },
  { id: 'credit', label: 'Credit card', icon: CreditCard },
];

const COLORS = ['#10b981', '#0ea5e9', '#8b5cf6', '#f97316', '#ec4899', '#eab308', '#14b8a6', '#64748b'];

const schema = z.object({
  name: z.string().trim().min(1, 'Account name is required').max(40),
  type: z.enum(['checking', 'savings', 'cash', 'wallet', 'credit']),
  openingBalance: z.coerce.number({ invalid_type_error: 'Enter a valid balance' }).max(100000000000).min(-100000000000),
  color: z.string().optional(),
});

export default function Accounts() {
  useDocumentTitle('Accounts');
  const { user } = useAuth();
  const currency = user?.currency || 'INR';
  const chart = useChartTheme();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const accountsQ = useAsync(() => listAccounts(), []);
  const historyQ = useAsync(() => netWorthHistory(12), []);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { name: '', type: 'checking', openingBalance: 0, color: COLORS[0] } });

  const pickedColor = watch('color');

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', type: 'checking', openingBalance: 0, color: COLORS[0] });
    setModalOpen(true);
  };

  const openEdit = (a) => {
    setEditing(a);
    reset({ name: a.name, type: a.type, openingBalance: a.openingBalance || 0, color: a.color || COLORS[0] });
    setModalOpen(true);
  };

  const onSubmit = async (values) => {
    try {
      if (editing) {
        await updateAccount(editing._id, values);
        toast.success('Account updated');
      } else {
        await createAccount(values);
        toast.success('Account created');
      }
      setModalOpen(false);
      setEditing(null);
      accountsQ.reload();
      historyQ.reload();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the account.'));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteAccount(deleting._id);
      toast.success('Account deleted');
      setDeleting(null);
      accountsQ.reload();
      historyQ.reload();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete the account.'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const accounts = accountsQ.data?.accounts || [];
  const netWorth = accountsQ.data?.netWorth ?? 0;
  const points = historyQ.data?.points || [];
  const typeMeta = useMemo(() => Object.fromEntries(TYPES.map((t) => [t.id, t])), []);

  if (accountsQ.loading && !accountsQ.data) return <FullSpinner label="Loading accounts…" />;

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Accounts"
        subtitle="Cash, bank and wallet balances in one place."
        action={
          <button className="btn-primary !py-2.5" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New account
          </button>
        }
      />

      {/* Net worth hero */}
      <Reveal y={24}>
        <div className="card-hover relative overflow-hidden rounded-2xl bg-ink-950 p-5 text-white shadow-pop sm:p-6">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(30rem 16rem at 110% -20%, rgba(16,185,129,0.45), transparent 60%), radial-gradient(24rem 14rem at -20% 120%, rgba(59,130,246,0.35), transparent 60%)',
            }}
          />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300/80">Net worth</p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight tabular sm:text-4xl">
                {formatCurrency(netWorth, currency)}
              </p>
              <p className="mt-1 text-xs font-medium text-ink-300">
                {accounts.length} account{accounts.length === 1 ? '' : 's'} · last 12 months
              </p>
            </div>
            <div className="h-28 w-full max-w-md sm:w-72">
              {points.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={points} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                    <Line
                      type="monotone"
                      dataKey="balance"
                      stroke="#34d399"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#0a1020',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10,
                        color: '#f4f6fa',
                        fontSize: 12,
                      }}
                      formatter={(v) => [formatCurrency(v, currency), 'Balance']}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </Reveal>

      {accountsQ.error ? (
        <div className="card flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-sm font-medium text-rose-500">{accountsQ.error}</p>
          <button className="btn-secondary !py-2" onClick={accountsQ.reload}>Retry</button>
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={WalletCards}
          title="No accounts yet"
          description="Add your bank accounts, wallets and cash to see balances and net worth."
          action={
            <button className="btn-primary !py-2" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add account
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((a, i) => {
            const meta = typeMeta[a.type] || typeMeta.checking;
            const Icon = meta.icon;
            return (
              <Reveal key={a._id} delay={Math.min(i, 8) * 0.06} y={22} amount={0.15}>
                <article className="card group relative p-5 transition hover:-translate-y-0.5 hover:shadow-pop">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                        style={{ backgroundColor: a.color || '#10b981' }}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-ink-900 dark:text-white">{a.name}</h3>
                        <p className="text-xs text-ink-400">{meta.label}</p>
                      </div>
                    </div>
                    <Badge tone={a.balance >= 0 ? 'emerald' : 'rose'}>
                      {a.balance >= 0 ? 'Active' : 'Owed'}
                    </Badge>
                  </div>

                  <p className="mt-4 text-2xl font-extrabold tracking-tight tabular text-ink-900 dark:text-white">
                    {formatCurrency(a.balance, currency)}
                  </p>
                  <p className="mt-1 text-xs text-ink-400">
                    In {formatCurrency(a.income, currency)} · Out {formatCurrency(a.expense, currency)}
                  </p>

                  <div className="mt-4 flex gap-2 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                    <button className="btn-secondary flex-1 !py-2 !text-xs" onClick={() => openEdit(a)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      className="btn-ghost !px-3 !py-2 !text-xs text-rose-500"
                      onClick={() => setDeleting(a)}
                      aria-label="Delete account"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? 'Edit account' : 'New account'}
        description="Opening balance is counted before any tracked transactions."
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormError message={errors.root?.message} />
          <Field label="Account name" error={errors.name?.message}>
            <Input placeholder="HDFC Savings" invalid={Boolean(errors.name)} {...register('name')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type" error={errors.type?.message}>
              <Select {...register('type')}>
                {TYPES.map((tt) => (
                  <option key={tt.id} value={tt.id}>
                    {tt.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Opening balance" error={errors.openingBalance?.message} hint={`In ${currency}`}>
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="0"
                invalid={Boolean(errors.openingBalance)}
                {...register('openingBalance')}
              />
            </Field>
          </div>
          <div>
            <p className="label">Colour</p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => reset((v) => ({ ...v, color: c }))}
                  aria-label={`Colour ${c}`}
                  className={`h-8 w-8 rounded-full transition ${
                    pickedColor === c ? 'ring-2 ring-ink-900 ring-offset-2 dark:ring-white dark:ring-offset-ink-900' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
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
              {editing ? 'Save changes' : 'Create account'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete account?"
        message={
          deleting && deleting.balance !== 0
            ? `${deleting.name} has a balance of ${formatCurrency(deleting.balance, currency)}. Archive it from the edit dialog instead, or delete anyway if it has no transactions.`
            : `“${deleting?.name}” will be permanently removed.`
        }
        confirmLabel="Delete"
        loading={deleteLoading}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
