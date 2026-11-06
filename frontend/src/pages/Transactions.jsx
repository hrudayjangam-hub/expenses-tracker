import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Pencil, Plus, Receipt, Search, Trash2, Filter } from 'lucide-react';
import useAsync from '../hooks/useAsync';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { listTransactions, deleteTransaction, transactionStats } from '../services/transactionService';
import { useCategories } from '../hooks/useCategories';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatCurrency, relativeDay, PAYMENT_METHODS } from '../utils/format';
import { DEFAULT_PRESET, resolvePreset } from '../utils/datePresets';
import DateRangeFilter from '../components/DateRangeFilter';
import CategoryBadge from '../components/CategoryBadge';
import TransactionModal from '../components/TransactionModal';
import { Badge, EmptyState, FullSpinner, Pagination, SectionHeader, Spinner } from '../components/ui/Primitives';
import { EASE } from '../components/motion/Reveal';
import { ConfirmDialog, Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Fields';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../services/api';

const TYPE_TONE = { income: 'emerald', expense: 'rose' };

export default function Transactions({ refreshKey = 0, onAdd }) {
  useDocumentTitle('Transactions');
  const { user } = useAuth();
  const currency = user?.currency || 'INR';
  const { categories } = useCategories();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [range, setRange] = useState(() => resolvePreset('all'));
  const [sort, setSort] = useState('date');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const params = useMemo(
    () => ({
      search,
      type,
      category,
      paymentMethod,
      from: range.from,
      to: range.to,
      sort,
      order,
      page,
      limit: 12,
    }),
    [search, type, category, paymentMethod, range.from, range.to, sort, order, page]
  );

  const listQ = useAsync(() => listTransactions(params), [JSON.stringify(params), refreshKey]);
  const statsQ = useAsync(() => transactionStats(params), [JSON.stringify(params), refreshKey]);

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setType('');
    setCategory('');
    setPaymentMethod('');
    setRange(resolvePreset('all'));
    setSort('date');
    setOrder('desc');
    setPage(1);
  };

  const toggleSort = (field) => {
    if (sort === field) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(field);
      setOrder(field === 'date' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteTransaction(deleting._id);
      toast.success('Transaction deleted');
      setDeleting(null);
      listQ.reload();
      statsQ.reload();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete the transaction.'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const onSaved = () => {
    listQ.reload();
    statsQ.reload();
  };

  if (listQ.loading && !listQ.data) return <FullSpinner label="Loading transactions…" />;

  const rows = listQ.data?.transactions || [];
  const pagination = listQ.data?.pagination || { page: 1, totalPages: 1, total: 0 };
  const totals = statsQ.data?.totals || { income: 0, expense: 0 };
  const hasFilters = Boolean(search || type || category || paymentMethod || range.preset !== 'all');

  const SortHeader = ({ field, children, className = '' }) => (
    <button
      onClick={() => toggleSort(field)}
      className={`inline-flex items-center gap-1 font-semibold uppercase tracking-wide transition hover:text-ink-900 dark:hover:text-white ${className}`}
    >
      {children}
      {sort === field ? (
        order === 'asc' ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : null}
    </button>
  );

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Transactions"
        subtitle="Search, filter, sort and manage every income and expense record."
        action={
          <button
            className="btn-primary !py-2.5"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add transaction
          </button>
        }
      />

      {/* Totals strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Income</p>
          <p className="mt-1 truncate text-lg font-bold text-emerald-600 tabular dark:text-emerald-400">
            {formatCurrency(totals.income, currency)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Expenses</p>
          <p className="mt-1 truncate text-lg font-bold text-rose-600 tabular dark:text-rose-400">
            {formatCurrency(totals.expense, currency)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Net</p>
          <p className="mt-1 truncate text-lg font-bold text-ink-900 tabular dark:text-white">
            {formatCurrency(totals.income - totals.expense, currency)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Records</p>
          <p className="mt-1 truncate text-lg font-bold text-ink-900 tabular dark:text-white">{pagination.total}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search description or category…"
              className="!pl-9"
              aria-label="Search transactions"
            />
          </div>
          <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label="Filter by type" className="!w-auto min-w-[140px]">
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </Select>
          <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} aria-label="Filter by category" className="!w-auto min-w-[160px]">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={`${c.type}-${c.name}`} value={c.name}>
                {c.name} ({c.type === 'income' ? 'in' : 'exp'})
              </option>
            ))}
          </Select>
          <Select value={paymentMethod} onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }} aria-label="Filter by payment method" className="!w-auto min-w-[150px]">
            <option value="">All payments</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
          {hasFilters ? (
            <button onClick={resetFilters} className="btn-ghost !py-2.5 text-xs">
              <Filter className="h-4 w-4" /> Clear
            </button>
          ) : null}
        </div>

        <DateRangeFilter preset={range.preset} from={range.from} to={range.to} onChange={(r) => { setRange(r); setPage(1); }} id="tx-range" />
      </div>

      {/* Table */}
      <div className="card relative overflow-hidden">
        {listQ.error ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <p className="text-sm font-medium text-rose-500">{listQ.error}</p>
            <button className="btn-secondary !py-2" onClick={listQ.reload}>Retry</button>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Receipt}
              title={hasFilters ? 'No transactions match these filters' : 'No transactions yet'}
              description={
                hasFilters
                  ? 'Try adjusting the search, category or date range.'
                  : 'Record your first income or expense to begin tracking.'
              }
              action={
                hasFilters ? (
                  <button onClick={resetFilters} className="btn-secondary !py-2">Clear filters</button>
                ) : (
                  <button onClick={onAdd} className="btn-primary !py-2">
                    <Plus className="h-4 w-4" /> Add transaction
                  </button>
                )
              }
            />
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ink-100 bg-ink-50/70 dark:border-ink-800 dark:bg-ink-800/50">
                  <tr className="text-[11px] text-ink-500 dark:text-ink-400">
                    <th className="px-5 py-3">
                      <SortHeader field="date">Date</SortHeader>
                    </th>
                    <th className="px-5 py-3">
                      <SortHeader field="category">Category</SortHeader>
                    </th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wide">Description</th>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wide">Payment</th>
                    <th className="px-5 py-3 text-right">
                      <SortHeader field="amount" className="justify-end">Amount</SortHeader>
                    </th>
                    <th className="px-5 py-3 text-right font-semibold uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                  {rows.map((t, i) => (
                    <motion.tr
                      key={t._id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: Math.min(i, 12) * 0.035, ease: EASE }}
                      onClick={() => setViewing(t)}
                      className="group cursor-pointer transition hover:bg-ink-50/70 dark:hover:bg-ink-800/40"
                    >
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <p className="font-medium text-ink-800 dark:text-ink-100">{formatDate(t.date)}</p>
                        <p className="text-xs text-ink-400">{relativeDay(t.date)}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <CategoryBadge name={t.category} type={t.type} categories={categories} />
                      </td>
                      <td className="max-w-[240px] px-5 py-3.5">
                        <p className="truncate text-ink-600 dark:text-ink-300">{t.description || '—'}</p>
                        <Badge tone={TYPE_TONE[t.type]} className="mt-1 capitalize md:hidden">{t.type}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-ink-500 dark:text-ink-400">{t.paymentMethod}</td>
                      <td
                        className={`whitespace-nowrap px-5 py-3.5 text-right font-bold tabular ${
                          t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-900 dark:text-white'
                        }`}
                      >
                        {t.type === 'income' ? '+' : '−'}
                        {formatCurrency(t.amount, currency)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right">
                        <div className="inline-flex gap-1 opacity-60 transition group-hover:opacity-100">
                          <button
                            aria-label="Edit transaction"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditing(t);
                              setModalOpen(true);
                            }}
                            className="rounded-lg p-2 text-ink-500 transition hover:bg-ink-100 hover:text-ink-800 dark:hover:bg-ink-700 dark:hover:text-white"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            aria-label="Delete transaction"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleting(t);
                            }}
                            className="rounded-lg p-2 text-ink-500 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-ink-100 md:hidden dark:divide-ink-800">
              {rows.map((t, i) => (
                <motion.li
                  key={t._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(i, 12) * 0.04, ease: EASE }}
                  onClick={() => setViewing(t)}
                  className="flex cursor-pointer items-start gap-3 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <CategoryBadge name={t.category} type={t.type} categories={categories} />
                      <span
                        className={`shrink-0 text-sm font-bold tabular ${
                          t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-900 dark:text-white'
                        }`}
                      >
                        {t.type === 'income' ? '+' : '−'}
                        {formatCurrency(t.amount, currency)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-ink-600 dark:text-ink-300">{t.description || 'No description'}</p>
                    <p className="mt-1 text-xs text-ink-400">
                      {formatDate(t.date)} · {t.paymentMethod}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      aria-label="Edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(t);
                        setModalOpen(true);
                      }}
                      className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      aria-label="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleting(t);
                      }}
                      className="rounded-lg p-2 text-ink-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.li>
              ))}
            </ul>

            <div className="border-t border-ink-100 px-5 py-3 dark:border-ink-800">
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                onPage={setPage}
                label="transactions"
              />
            </div>
          </>
        )}
        {listQ.loading && listQ.data ? (
          <div className="absolute right-4 top-4">
            <Spinner className="h-4 w-4 text-emerald-500" />
          </div>
        ) : null}
      </div>

      <TransactionModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        transaction={editing}
        categories={categories}
        onSaved={onSaved}
      />

      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title="Transaction details"
        description={viewing ? `Record created ${formatDate(viewing.createdAt || viewing.date)}` : ''}
        size="sm"
      >
        {viewing ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-ink-50 px-4 py-4 text-center dark:bg-ink-800/70">
              <Badge tone={TYPE_TONE[viewing.type]} className="capitalize">{viewing.type}</Badge>
              <p
                className={`mt-2 text-3xl font-extrabold tracking-tight tabular ${
                  viewing.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-900 dark:text-white'
                }`}
              >
                {viewing.type === 'income' ? '+' : '−'}
                {formatCurrency(viewing.amount, currency)}
              </p>
            </div>

            <dl className="divide-y divide-ink-100 text-sm dark:divide-ink-800">
              {[
                ['Category', viewing.category],
                ['Date', formatDate(viewing.date)],
                ['Payment method', viewing.paymentMethod],
                ['Description', viewing.description || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-4 py-2.5">
                  <dt className="shrink-0 text-ink-500 dark:text-ink-400">{k}</dt>
                  <dd className="text-right font-semibold text-ink-900 dark:text-white">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setViewing(null)}>
                Close
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setEditing(viewing);
                  setViewing(null);
                  setModalOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" /> Edit
              </button>
              <button
                className="btn-danger"
                onClick={() => {
                  setDeleting(viewing);
                  setViewing(null);
                }}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete transaction?"
        message={`This will permanently remove the ${deleting?.type} of ${formatCurrency(deleting?.amount || 0, currency)} (${deleting?.category}). This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteLoading}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
