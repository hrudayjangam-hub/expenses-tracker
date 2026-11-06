import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, CalendarDays, PieChart as PieIcon, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import ChartCard from '../components/ChartCard';
import DateRangeFilter from '../components/DateRangeFilter';
import StatCard from '../components/ui/StatCard';
import Reveal from '../components/motion/Reveal';
import { Badge, EmptyState, FullSpinner, SectionHeader } from '../components/ui/Primitives';
import useAsync from '../hooks/useAsync';
import useChartTheme, { PALETTE } from '../hooks/useChartTheme';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { getAnalytics } from '../services/dashboardService';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/format';
import { resolvePreset } from '../utils/datePresets';

export default function Analytics() {
  useDocumentTitle('Analytics');
  const { user } = useAuth();
  const currency = user?.currency || 'INR';
  const chart = useChartTheme();
  const [range, setRange] = useState(() => resolvePreset('year'));

  const q = useAsync(
    () => getAnalytics({ from: range.from, to: range.to }),
    [range.from, range.to]
  );

  const money = (v, opts) => formatCurrency(v, currency, opts);
  const data = q.data;

  const savingsSeries = useMemo(
    () => (data?.incomeVsExpense || []).map((m) => ({ ...m, savings: Number((m.income - m.expense).toFixed(2)) })),
    [data]
  );

  const topCategories = useMemo(() => {
    const rows = [...(data?.categoryBreakdown || [])].sort((a, b) => b.value - a.value);
    const max = rows[0]?.value || 1;
    return rows.slice(0, 6).map((r) => ({ ...r, share: Math.round((r.value / max) * 100) }));
  }, [data]);

  const weekly = data?.weekly || [];
  const daily = data?.daily || [];
  const dailyOrWeekly = daily.length <= 92 ? daily.map((d) => ({ label: d.date.slice(5), value: d.expense })) : weekly.map((w) => ({ label: w.label, value: w.expense }));

  if (q.loading && !data) return <FullSpinner label="Crunching your numbers…" />;
  if (q.error && !data) {
    return (
      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <p className="text-sm font-medium text-rose-500">{q.error}</p>
        <button className="btn-secondary !py-2" onClick={q.reload}>Retry</button>
      </div>
    );
  }

  const stats = data?.stats || {};
  const tooltipStyle = {
    background: chart.tooltipBg,
    border: `1px solid ${chart.tooltipBorder}`,
    borderRadius: 12,
    color: chart.tooltipText,
    fontSize: 12,
    fontWeight: 600,
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Analytics"
        subtitle="Daily, weekly, monthly and yearly spending behaviour — computed from your records."
        action={
          <span className="rounded-lg bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-600 dark:bg-ink-800 dark:text-ink-300">
            {range.label}
          </span>
        }
      />

      <DateRangeFilter preset={range.preset} from={range.from} to={range.to} onChange={setRange} id="analytics-range" />

      <Reveal y={24} amount={0.2}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Avg daily expense" value={money(stats.avgDailyExpense)} icon={CalendarDays} tone="rose" sub={`${stats.daysInPeriod || 0} days in period`} />
        <StatCard label="Avg monthly expense" value={money(stats.avgMonthlyExpense)} icon={Activity} tone="amber" sub={`${data?.incomeVsExpense?.length || 0} months`} />
        <StatCard
          label="Savings rate"
          value={`${stats.savingsRate ?? 0}%`}
          icon={TrendingUp}
          tone="emerald"
          sub={`${money(stats.savings)} saved`}
        />
        <StatCard
          label="Highest category"
          value={stats.highestCategory || '—'}
          icon={TrendingDown}
          tone="ink"
          sub={stats.highestCategoryAmount ? money(stats.highestCategoryAmount) : 'No expenses yet'}
        />
      </div>
      </Reveal>

      {!stats.transactionCount ? (
        <EmptyState
          icon={PieIcon}
          title="Not enough data to analyse"
          description="Add income and expenses for this period to unlock analytics."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard
              title="Income vs expenses"
              subtitle="Monthly comparison"
              loading={q.loading && !data}
              bodyClassName="h-72"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.incomeVsExpense} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                  <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={22} />
                  <YAxis tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => money(v, { compact: true })} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [money(v), n === 'income' ? 'Income' : 'Expense']} cursor={{ fill: chart.mutedFill, opacity: 0.5 }} />
                  <Bar dataKey="income" fill={PALETTE.income} radius={[6, 6, 0, 0]} maxBarSize={24} />
                  <Bar dataKey="expense" fill={PALETTE.expense} radius={[6, 6, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Savings overview"
              subtitle="Income minus expense per month"
              loading={q.loading && !data}
              bodyClassName="h-72"
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={savingsSeries} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                  <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={22} />
                  <YAxis tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => money(v, { compact: true })} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [money(v), 'Savings']} cursor={{ stroke: chart.axis, strokeDasharray: '3 3' }} />
                  <Line type="monotone" dataKey="savings" stroke={PALETTE.savings} strokeWidth={3} dot={{ r: 3, fill: PALETTE.savings }} activeDot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard
              title={daily.length <= 92 ? 'Daily spending' : 'Weekly spending'}
              subtitle={daily.length <= 92 ? 'Expense per day in range' : 'Expense per week in range'}
              loading={q.loading && !data}
              bodyClassName="h-72"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyOrWeekly} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                  <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={22} />
                  <YAxis tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => money(v, { compact: true })} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [money(v), 'Expense']} cursor={{ fill: chart.mutedFill, opacity: 0.5 }} />
                  <Bar dataKey="value" fill={PALETTE.expense} radius={[5, 5, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Yearly spending"
              subtitle="All-time income vs expense by year"
              loading={q.loading && !data}
              empty={!data?.yearly?.length ? { title: 'No yearly data yet' } : null}
              bodyClassName="h-72"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.yearly} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                  <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => money(v, { compact: true })} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [money(v), n === 'income' ? 'Income' : 'Expense']} cursor={{ fill: chart.mutedFill, opacity: 0.5 }} />
                  <Bar dataKey="income" fill={PALETTE.income} radius={[6, 6, 0, 0]} maxBarSize={34} />
                  <Bar dataKey="expense" fill={PALETTE.expense} radius={[6, 6, 0, 0]} maxBarSize={34} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <Reveal y={26} amount={0.08}>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <ChartCard
              title="Category-wise analysis"
              subtitle="Share of total expenses"
              loading={q.loading && !data}
              empty={!data?.categoryBreakdown?.length ? { title: 'No expense data' } : null}
              bodyClassName="h-72"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.categoryBreakdown} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="90%" paddingAngle={3} stroke="none">
                    {data.categoryBreakdown.map((c) => (
                      <Cell key={c.name} fill={c.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [money(v), n]} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <section className="card p-5 xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="section-title">Highest spending categories</h2>
                  <p className="mt-0.5 text-xs text-ink-400">Ranked by amount spent in range</p>
                </div>
                <Badge tone="rose">Top {topCategories.length}</Badge>
              </div>

              {topCategories.length ? (
                <ul className="space-y-4">
                  {topCategories.map((c, i) => {
                    const totalExpense = data.stats.totalExpenses || 1;
                    return (
                      <li key={c.name}>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                          <span className="flex min-w-0 items-center gap-2 font-semibold text-ink-700 dark:text-ink-200">
                            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white" style={{ backgroundColor: c.color }}>
                              {i + 1}
                            </span>
                            <span className="truncate">{c.name}</span>
                          </span>
                          <span className="shrink-0 font-bold text-ink-900 tabular dark:text-white">
                            {money(c.value)}{' '}
                            <span className="ml-1 text-xs font-medium text-ink-400">
                              {Math.round((c.value / totalExpense) * 100)}%
                            </span>
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${c.share}%`, backgroundColor: c.color }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState icon={Wallet} title="No expenses recorded" description="Expenses will rank here once recorded." />
              )}
            </section>
          </div>
          </Reveal>

          <Reveal y={26} amount={0.1}>
          <div className="card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="section-title">Period breakdown</h2>
                <p className="mt-0.5 text-xs text-ink-400">Key figures for {range.label.toLowerCase()}</p>
              </div>
              {stats.biggestExpenseDay?.date ? (
                <p className="text-xs font-semibold text-ink-500 dark:text-ink-400">
                  Biggest expense day:{' '}
                  <span className="text-ink-900 dark:text-white">
                    {formatDate(stats.biggestExpenseDay.date)} · {money(stats.biggestExpenseDay.expense)}
                  </span>
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              {[
                { label: 'Total income', value: money(data.stats.totalIncome), tone: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Total expenses', value: money(data.stats.totalExpenses), tone: 'text-rose-600 dark:text-rose-400' },
                { label: 'Net savings', value: money(data.stats.savings), tone: 'text-ink-900 dark:text-white' },
                { label: 'Transactions', value: data.stats.transactionCount, tone: 'text-ink-900 dark:text-white' },
                { label: 'Active days', value: `${data.stats.activeDays}/${data.stats.daysInPeriod}`, tone: 'text-ink-900 dark:text-white' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-ink-50 px-4 py-3 dark:bg-ink-800/60">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{s.label}</p>
                  <p className={`mt-1 truncate text-base font-bold tabular ${s.tone}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
          </Reveal>
        </>
      )}
    </div>
  );
}
