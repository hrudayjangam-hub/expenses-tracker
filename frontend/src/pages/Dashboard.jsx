import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowLeftRight,
  IndianRupee,
  PiggyBank,
  Plus,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import StatCard from '../components/ui/StatCard';
import ChartCard from '../components/ChartCard';
import DateRangeFilter from '../components/DateRangeFilter';
import CategoryBadge from '../components/CategoryBadge';
import Reveal, { EASE } from '../components/motion/Reveal';
import Parallax from '../components/motion/Parallax';
import { Badge, EmptyState, FullSpinner, ProgressBar, SectionHeader } from '../components/ui/Primitives';
import useAsync from '../hooks/useAsync';
import useChartTheme, { PALETTE } from '../hooks/useChartTheme';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { getSummary, getAnalytics } from '../services/dashboardService';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/LanguageContext';
import { useCategories } from '../hooks/useCategories';
import { formatCurrency, relativeDay } from '../utils/format';
import { DEFAULT_PRESET, resolvePreset } from '../utils/datePresets';

const STATUS_TONE = { ok: 'emerald', warning: 'amber', danger: 'amber', over: 'rose' };

export default function Dashboard({ refreshKey = 0, onAddTransaction }) {
  useDocumentTitle('Dashboard');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const currency = user?.currency || 'INR';
  const { categories } = useCategories();
  const chart = useChartTheme();

  const STATUS_LABEL = {
    ok: t('common.onTrack'),
    warning: `75% ${t('common.used')}`,
    danger: `90% ${t('common.used')}`,
    over: t('common.overBudget'),
  };

  const [range, setRange] = useState(() => resolvePreset(DEFAULT_PRESET));

  const summaryQ = useAsync(() => getSummary({ from: range.from, to: range.to }), [range.from, range.to, refreshKey]);
  const analyticsQ = useAsync(() => getAnalytics({ from: range.from, to: range.to }), [range.from, range.to, refreshKey]);

  const summary = summaryQ.data;
  const analytics = analyticsQ.data;
  const money = (v, opts) => formatCurrency(v, currency, opts);

  const pieData = useMemo(() => {
    const rows = analytics?.categoryBreakdown || [];
    if (!rows.length) return [];
    return rows.slice(0, 6).map((r) => ({ name: r.name, value: r.value, color: r.color }));
  }, [analytics]);

  const trendData = useMemo(() => {
    const daily = analytics?.daily || [];
    if (!daily.length) return [];
    if (daily.length > 120) {
      return (analytics.incomeVsExpense || []).map((m) => ({
        label: m.label,
        expense: m.expense,
        income: m.income,
      }));
    }
    return daily.map((d) => ({ label: d.date.slice(5), expense: d.expense, income: d.income }));
  }, [analytics]);

  if (summaryQ.loading && !summary) return <FullSpinner label={t('dash.loading')} />;

  const totals = summary?.totals || { income: 0, expense: 0, savings: 0, count: 0 };
  const month = summary?.month || { income: 0, expense: 0, savings: 0 };
  const recent = summary?.recentTransactions || [];
  const budgets = summary?.budgetProgress || [];
  const activity = summary?.activity || [];
  const stats = analytics?.stats;

  const totalPie = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6">
      <SectionHeader
        title={
          <span>
            {t('dash.hello')}
            {user?.name ? <span className="text-gradient">{`, ${user.name.split(' ')[0]}`}</span> : ''}
          </span>
        }
        subtitle={t('dash.subtitle')}
        action={
          <button onClick={onAddTransaction} className="btn-primary !py-2.5">
            <Plus className="h-4 w-4" /> {t('common.addTransaction')}
          </button>
        }
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <DateRangeFilter preset={range.preset} from={range.from} to={range.to} onChange={setRange} id="dash-range" />
        <p className="text-xs font-medium text-ink-400">{range.label}</p>
      </div>

      {(summaryQ.error || analyticsQ.error) && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {summaryQ.error || analyticsQ.error}
          <button className="ml-3 underline" onClick={() => { summaryQ.reload(); analyticsQ.reload(); }}>
            {t('common.retry')}
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Reveal delay={0} y={26}>
          <Parallax distance={10} className="h-full">
            <StatCard
              variant="hero"
              label={t('dash.totalBalance')}
              value={money(totals.savings)}
              icon={Wallet}
              sub={`${totals.count} ${t('common.entries')} · ${range.label}`}
            />
          </Parallax>
        </Reveal>
        <Reveal delay={0.08} y={26}>
          <StatCard label={t('dash.income')} value={money(totals.income)} icon={TrendingUp} tone="emerald" sub={range.label} />
        </Reveal>
        <Reveal delay={0.16} y={26}>
          <StatCard label={t('dash.expenses')} value={money(totals.expense)} icon={TrendingDown} tone="rose" sub={range.label} />
        </Reveal>
        <Reveal delay={0.24} y={26}>
          <StatCard
            label={t('dash.savings')}
            value={money(month.savings)}
            icon={PiggyBank}
            tone="sky"
            sub={`${money(month.income)} · ${money(month.expense)}`}
          />
        </Reveal>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Reveal className="xl:col-span-2" y={28} amount={0.08}>
          <ChartCard
          className="xl:col-span-2"
          title="Income vs Expense"
          subtitle="Monthly comparison for the selected period"
          loading={analyticsQ.loading && !analytics}
          error={analyticsQ.error}
          onRetry={analyticsQ.reload}
          empty={
            !analyticsQ.loading && analytics && !analytics.incomeVsExpense?.some((m) => m.income || m.expense)
              ? { title: 'No data for this period', description: 'Add transactions to see the comparison chart.' }
              : null
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics?.incomeVsExpense || []} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
              <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
              <YAxis tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => money(v, { compact: true })} />
              <Tooltip
                cursor={{ fill: chart.mutedFill, opacity: 0.6 }}
                contentStyle={{
                  background: chart.tooltipBg,
                  border: `1px solid ${chart.tooltipBorder}`,
                  borderRadius: 12,
                  color: chart.tooltipText,
                  fontSize: 12,
                  fontWeight: 600,
                  boxShadow: '0 12px 32px -12px rgba(10,16,32,0.4)',
                }}
                formatter={(value, name) => [money(value), name === 'income' ? 'Income' : 'Expense']}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, fontWeight: 600 }}
                formatter={(value) => (value === 'income' ? 'Income' : 'Expense')}
              />
              <Bar dataKey="income" fill={PALETTE.income} radius={[6, 6, 0, 0]} maxBarSize={26} />
              <Bar dataKey="expense" fill={PALETTE.expense} radius={[6, 6, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        </Reveal>

        <Reveal delay={0.1} y={28} amount={0.08}>
        <ChartCard
          title="Where money goes"
          subtitle="Expense split by category"
          loading={analyticsQ.loading && !analytics}
          error={analyticsQ.error}
          onRetry={analyticsQ.reload}
          empty={!analyticsQ.loading && !pieData.length ? { title: 'No expenses yet', description: 'Expense categories appear here.' } : null}
          bodyClassName="h-72"
        >
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="62%"
                    outerRadius="92%"
                    paddingAngle={3}
                    stroke="none"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: chart.tooltipBg,
                      border: `1px solid ${chart.tooltipBorder}`,
                      borderRadius: 12,
                      color: chart.tooltipText,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                    formatter={(value, name) => [money(value), name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 space-y-1.5">
              {pieData.slice(0, 4).map((d) => (
                <li key={d.name} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-2 font-medium text-ink-600 dark:text-ink-300">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="truncate">{d.name}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-ink-900 tabular dark:text-white">
                    {money(d.value, { compact: true })}
                    <span className="ml-1 font-normal text-ink-400">
                      {totalPie ? Math.round((d.value / totalPie) * 100) : 0}%
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </ChartCard>
        </Reveal>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Reveal className="xl:col-span-2" y={28} amount={0.08}>
        <ChartCard
          className="xl:col-span-2"
          title="Spending trend"
          subtitle={trendData.length > 120 ? 'Monthly expense progression' : 'Daily expense progression'}
          loading={analyticsQ.loading && !analytics}
          error={analyticsQ.error}
          onRetry={analyticsQ.reload}
          empty={!analyticsQ.loading && !trendData.length ? { title: 'Nothing to chart yet' } : null}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
              <defs>
                <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PALETTE.expense} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={PALETTE.expense} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={28} />
              <YAxis tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => money(v, { compact: true })} />
              <Tooltip
                cursor={{ stroke: chart.axis, strokeDasharray: '3 3' }}
                contentStyle={{
                  background: chart.tooltipBg,
                  border: `1px solid ${chart.tooltipBorder}`,
                  borderRadius: 12,
                  color: chart.tooltipText,
                  fontSize: 12,
                  fontWeight: 600,
                }}
                formatter={(value, name) => [money(value), name === 'expense' ? 'Expense' : 'Income']}
              />
              <Area
                type="monotone"
                dataKey="expense"
                stroke={PALETTE.expense}
                strokeWidth={2.5}
                fill="url(#expenseFill)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        </Reveal>

        <Reveal delay={0.1} y={28} amount={0.08}>
        <ChartCard
          title="Financial activity"
          subtitle="Last 14 days · income vs expense"
          loading={summaryQ.loading && !summary}
          error={summaryQ.error}
          onRetry={summaryQ.reload}
          empty={!activity.some((a) => a.income || a.expense) ? { title: 'Quiet fortnight', description: 'No activity in the last 14 days.' } : null}
          bodyClassName="h-64"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activity} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: chart.axis, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(d) => d.slice(8)} minTickGap={12} />
              <YAxis tick={{ fill: chart.axis, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => money(v, { compact: true })} />
              <Tooltip
                cursor={{ fill: chart.mutedFill, opacity: 0.6 }}
                contentStyle={{
                  background: chart.tooltipBg,
                  border: `1px solid ${chart.tooltipBorder}`,
                  borderRadius: 12,
                  color: chart.tooltipText,
                  fontSize: 12,
                  fontWeight: 600,
                }}
                labelFormatter={(d) => relativeDay(d)}
                formatter={(value, name) => [money(value), name === 'income' ? 'Income' : 'Expense']}
              />
              <Bar dataKey="income" fill={PALETTE.income} radius={[4, 4, 0, 0]} maxBarSize={16} />
              <Bar dataKey="expense" fill={PALETTE.expense} radius={[4, 4, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        </Reveal>
      </div>

      {/* Lists row */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Reveal className="xl:col-span-2" y={26} amount={0.06}>
        <section className="card p-5 xl:col-span-2">
          <SectionHeader
            title="Recent transactions"
            subtitle="Latest records across all categories"
            action={
              <button
                onClick={() => navigate('/transactions')}
                className="btn-secondary !py-2 !text-xs"
              >
                View all
              </button>
            }
          />
          {summaryQ.loading && !summary ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-ink-100 dark:bg-ink-800" />
              ))}
            </div>
          ) : recent.length ? (
            <ul className="divide-y divide-ink-100 dark:divide-ink-800">
              {recent.map((t, i) => (
                <motion.li
                  key={t._id}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.4, delay: Math.min(i, 8) * 0.05, ease: EASE }}
                  className="flex items-center gap-3 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <CategoryBadge name={t.category} type={t.type} categories={categories} />
                    {t.description ? (
                      <p className="mt-0.5 truncate pl-6 text-xs text-ink-400">{t.description}</p>
                    ) : null}
                  </span>
                  <span className="hidden text-xs font-medium text-ink-400 sm:block">{relativeDay(t.date)}</span>
                  <span
                    className={`w-28 shrink-0 text-right text-sm font-bold tabular ${
                      t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-900 dark:text-white'
                    }`}
                  >
                    {t.type === 'income' ? '+' : '−'}
                    {money(t.amount)}
                  </span>
                </motion.li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Receipt}
              title="No transactions yet"
              description="Add your first income or expense to get started."
              action={
                <button onClick={onAddTransaction} className="btn-primary !py-2">
                  <Plus className="h-4 w-4" /> Add transaction
                </button>
              }
            />
          )}
        </section>
        </Reveal>

        <Reveal delay={0.1} y={26} amount={0.06}>
        <section className="card p-5">
          <SectionHeader
            title="Budget progress"
            subtitle="Current month utilisation"
            action={
              <button onClick={() => navigate('/budgets')} className="btn-secondary !py-2 !text-xs">
                Manage
              </button>
            }
          />
          {summaryQ.loading && !summary ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-ink-100 dark:bg-ink-800" />
              ))}
            </div>
          ) : budgets.length ? (
            <ul className="space-y-4">
              {budgets.slice(0, 6).map((b, i) => (
                <motion.li
                  key={b._id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.45, delay: i * 0.07, ease: EASE }}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink-700 dark:text-ink-200">
                      <span className="truncate">{b.category}</span>
                      <Badge tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</Badge>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-ink-500 tabular dark:text-ink-400">
                      {b.percent}%
                    </span>
                  </div>
                  <ProgressBar percent={b.percent} status={b.status} />
                  <p className="mt-1.5 text-xs text-ink-400">
                    {money(b.spent)} of {money(b.amount)} used
                    {b.remaining < 0 ? (
                      <span className="font-semibold text-rose-500"> · over by {money(Math.abs(b.remaining))}</span>
                    ) : (
                      <span> · {money(b.remaining)} left</span>
                    )}
                  </p>
                </motion.li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Wallet}
              title="No budgets for this month"
              description="Set monthly limits to track utilisation."
              action={
                <button onClick={() => navigate('/budgets')} className="btn-primary !py-2">
                  Create budget
                </button>
              }
            />
          )}
        </section>
        </Reveal>
      </div>

      {/* Quick insight strip */}
      {stats && stats.transactionCount > 0 ? (
        <Reveal y={24} amount={0.15}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="card flex items-center gap-3 p-4">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              <IndianRupee className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-ink-400">Avg daily spend</p>
              <p className="truncate text-sm font-bold text-ink-900 tabular dark:text-white">{money(stats.avgDailyExpense)}</p>
            </div>
          </div>
          <div className="card flex items-center gap-3 p-4">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400">
              <ArrowLeftRight className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-ink-400">Savings rate</p>
              <p className="truncate text-sm font-bold text-ink-900 tabular dark:text-white">{stats.savingsRate}%</p>
            </div>
          </div>
          <div className="card flex items-center gap-3 p-4">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
              <TrendingDown className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-ink-400">Top expense</p>
              <p className="truncate text-sm font-bold text-ink-900 dark:text-white">
                {stats.highestCategory || '—'}
                {stats.highestCategoryAmount ? ` · ${money(stats.highestCategoryAmount, { compact: true })}` : ''}
              </p>
            </div>
          </div>
          <div className="card flex items-center gap-3 p-4">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
              <Receipt className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-ink-400">Active days</p>
              <p className="truncate text-sm font-bold text-ink-900 tabular dark:text-white">
                {stats.activeDays} / {stats.daysInPeriod}
              </p>
            </div>
          </div>
        </div>
        </Reveal>
      ) : null}
    </div>
  );
}
