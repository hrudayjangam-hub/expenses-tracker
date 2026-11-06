import { useMemo, useState } from 'react';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Download,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  PiggyBank,
  Receipt,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import ChartCard from '../components/ChartCard';
import StatCard from '../components/ui/StatCard';
import Reveal from '../components/motion/Reveal';
import { Badge, FullSpinner, SectionHeader, Spinner } from '../components/ui/Primitives';
import { Input } from '../components/ui/Fields';
import useAsync from '../hooks/useAsync';
import useChartTheme, { PALETTE } from '../hooks/useChartTheme';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { getReportSummary } from '../services/dashboardService';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate, monthName, toISODate } from '../utils/format';
import { getErrorMessage } from '../services/api';

const MODES = [
  { id: 'month', label: 'Monthly' },
  { id: 'year', label: 'Yearly' },
  { id: 'custom', label: 'Custom range' },
];

const pad = (n) => String(n).padStart(2, '0');
const lastDay = (y, m) => new Date(y, m, 0).getDate();

export default function Reports() {
  useDocumentTitle('Reports');
  const { user } = useAuth();
  const currency = user?.currency || 'INR';
  const chart = useChartTheme();

  const now = new Date();
  const [mode, setMode] = useState('month');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [customFrom, setCustomFrom] = useState(toISODate(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [customTo, setCustomTo] = useState(toISODate(now));
  const [exporting, setExporting] = useState(null);

  const range = useMemo(() => {
    if (mode === 'month') {
      return {
        from: `${year}-${pad(month)}-01`,
        to: `${year}-${pad(month)}-${pad(lastDay(year, month))}`,
        label: monthName(month, year),
      };
    }
    if (mode === 'year') {
      return { from: `${year}-01-01`, to: `${year}-12-31`, label: `Year ${year}` };
    }
    if (!customFrom || !customTo) return { from: '', to: '', label: 'Select dates' };
    const [f, t] = customFrom <= customTo ? [customFrom, customTo] : [customTo, customFrom];
    return { from: f, to: t, label: `${formatDate(f)} → ${formatDate(t)}` };
  }, [mode, month, year, customFrom, customTo]);

  const q = useAsync(
    () => getReportSummary({ from: range.from, to: range.to, include: 'transactions' }),
    [range.from, range.to]
  );

  const money = (v, opts) => formatCurrency(v, currency, opts);
  const report = q.data;

  const downloadCsv = () => {
    if (!report) return;
    setExporting('csv');
    try {
      const rows = [
        ['Expenses Tracker — Financial Report'],
        ['Generated', new Date().toLocaleString('en-GB')],
        ['Account', `${user?.name} (${user?.email})`],
        ['Period', report.period?.label || range.label],
        ['Currency', currency],
        [],
        ['Summary'],
        ['Total Income', report.totalIncome],
        ['Total Expenses', report.totalExpenses],
        ['Savings', report.savings],
        ['Savings Rate (%)', report.savingsRate],
        ['Transactions', report.transactionCount],
        [],
        ['Category', 'Type', 'Amount', 'Transactions', 'Percent (%)'],
        ...report.categoryBreakdown.map((c) => [c.category, c.type, c.amount, c.count, c.percent]),
        [],
        ['Payment Method', 'Amount', 'Transactions', 'Percent (%)'],
        ...report.paymentMethodBreakdown.map((p) => [p.method, p.amount, p.count, p.percent]),
        [],
        ['Date', 'Type', 'Category', 'Description', 'Amount', 'Payment Method'],
        ...(report.transactions || []).map((t) => [
          formatDate(t.date),
          t.type,
          t.category,
          t.description || '',
          t.amount,
          t.paymentMethod,
        ]),
      ];

      const csv = Papa.unparse(rows, { header: false });
      const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
      triggerDownload(blob, `expenses-report-${range.from || 'all'}_${range.to || 'all'}.csv`);
      toast.success('CSV downloaded');
    } catch (err) {
      toast.error(getErrorMessage(err, 'CSV export failed.'));
    } finally {
      setExporting(null);
    }
  };

  const downloadPdf = () => {
    if (!report) return;
    setExporting('pdf');
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFillColor(10, 16, 32);
      doc.rect(0, 0, pageWidth, 86, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('Financial Report', 40, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(164, 176, 200);
      doc.text(`Expenses Tracker  ·  ${user?.name}  ·  ${report.period?.label || range.label}`, 40, 62);
      doc.text(`Generated ${new Date().toLocaleString('en-GB')}`, 40, 76);

      doc.setTextColor(10, 16, 32);
      autoTable(doc, {
        startY: 108,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 7, textColor: [31, 42, 68] },
        headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
        body: [
          ['Total Income', money(report.totalIncome)],
          ['Total Expenses', money(report.totalExpenses)],
          ['Net Savings', money(report.savings)],
          ['Savings Rate', `${report.savingsRate}%`],
          ['Transactions', String(report.transactionCount)],
        ],
        columnStyles: { 1: { halign: 'right' } },
      });

      if (report.categoryBreakdown.length) {
        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 24,
          head: [['Category', 'Type', 'Amount', 'Txns', '%']],
          body: report.categoryBreakdown.map((c) => [c.category, c.type, money(c.amount), c.count, `${c.percent}%`]),
          theme: 'striped',
          styles: { fontSize: 9, cellPadding: 6 },
          headStyles: { fillColor: [31, 42, 68] },
          columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
        });
      }

      if (report.paymentMethodBreakdown.length) {
        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 24,
          head: [['Payment Method', 'Amount', 'Txns', '%']],
          body: report.paymentMethodBreakdown.map((p) => [p.method, money(p.amount), p.count, `${p.percent}%`]),
          theme: 'striped',
          styles: { fontSize: 9, cellPadding: 6 },
          headStyles: { fillColor: [31, 42, 68] },
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
        });
      }

      if (report.largestExpenses.length) {
        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 24,
          head: [['Date', 'Category', 'Description', 'Amount']],
          body: report.largestExpenses.map((t) => [formatDate(t.date), t.category, t.description || '—', money(t.amount)]),
          theme: 'striped',
          styles: { fontSize: 9, cellPadding: 6 },
          headStyles: { fillColor: [31, 42, 68] },
          columnStyles: { 3: { halign: 'right' } },
        });
      }

      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i += 1) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120, 130, 150);
        doc.text(`Expenses Tracker · Batch 21CS29 · Page ${i} of ${pages}`, 40, doc.internal.pageSize.getHeight() - 24);
      }

      doc.save(`expenses-report-${range.from || 'all'}_${range.to || 'all'}.pdf`);
      toast.success('PDF downloaded');
    } catch (err) {
      toast.error(getErrorMessage(err, 'PDF export failed.'));
    } finally {
      setExporting(null);
    }
  };

  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (q.loading && !report) return <FullSpinner label="Building your report…" />;

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
        title="Reports"
        subtitle="Generate monthly, yearly or custom period summaries and export them."
        action={
          <div className="flex gap-2">
            <button className="btn-secondary !py-2.5" onClick={downloadCsv} disabled={!report || Boolean(exporting)}>
              {exporting === 'csv' ? <Spinner className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}
              CSV
            </button>
            <button className="btn-primary !py-2.5" onClick={downloadPdf} disabled={!report || Boolean(exporting)}>
              {exporting === 'pdf' ? <Spinner className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              PDF
            </button>
          </div>
        }
      />

      {/* Period controls */}
      <div className="card space-y-4 p-5">
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                mode === m.id
                  ? 'bg-ink-900 text-white dark:bg-emerald-500 dark:text-ink-950'
                  : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {mode === 'month' ? (
            <>
              <div>
                <label className="label" htmlFor="rep-month">Month</label>
                <Input
                  id="rep-month"
                  type="month"
                  className="!w-auto"
                  value={`${year}-${pad(month)}`}
                  onChange={(e) => {
                    const [y, m] = e.target.value.split('-').map(Number);
                    if (y && m) {
                      setYear(y);
                      setMonth(m);
                    }
                  }}
                />
              </div>
            </>
          ) : null}

          {mode === 'year' ? (
            <div>
              <label className="label" htmlFor="rep-year">Year</label>
              <Input
                id="rep-year"
                type="number"
                min="2000"
                max="2100"
                className="!w-36"
                value={year}
                onChange={(e) => setYear(Number(e.target.value) || now.getFullYear())}
              />
            </div>
          ) : null}

          {mode === 'custom' ? (
            <>
              <div>
                <label className="label" htmlFor="rep-from">From</label>
                <Input id="rep-from" type="date" className="!w-auto" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="rep-to">To</label>
                <Input id="rep-to" type="date" className="!w-auto" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </div>
            </>
          ) : null}

          <div className="ml-auto flex items-center gap-2 pb-1">
            <FileBarChart className="h-4 w-4 text-ink-400" />
            <span className="text-sm font-semibold text-ink-700 dark:text-ink-200">{range.label}</span>
          </div>
        </div>
      </div>

      {q.error ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-sm font-medium text-rose-500">{q.error}</p>
          <button className="btn-secondary !py-2" onClick={q.reload}>Retry</button>
        </div>
      ) : !report || report.transactionCount === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <Receipt className="h-8 w-8 text-ink-300" />
          <div>
            <p className="text-sm font-bold text-ink-900 dark:text-white">No records in this period</p>
            <p className="mt-1 text-sm text-ink-500">Pick a different range or add transactions first.</p>
          </div>
        </div>
      ) : (
        <>
          <Reveal y={24} amount={0.2}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total income" value={money(report.totalIncome)} icon={TrendingUp} tone="emerald" sub={`${report.transactionCount} records`} />
            <StatCard label="Total expenses" value={money(report.totalExpenses)} icon={TrendingDown} tone="rose" sub={range.label} />
            <StatCard label="Net savings" value={money(report.savings)} icon={PiggyBank} tone={report.savings >= 0 ? 'sky' : 'rose'} sub={`${report.savingsRate}% savings rate`} />
            <StatCard
              label="Avg per transaction"
              value={money(report.transactionCount ? report.totalExpenses / report.transactionCount : 0)}
              icon={Receipt}
              tone="ink"
              sub="Across expenses"
            />
          </div>
          </Reveal>

          <Reveal y={26} amount={0.08}>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard
              title="Monthly trend"
              subtitle="Income vs expense inside the report period"
              loading={q.loading && !report}
              empty={!report?.monthly?.length ? { title: 'No monthly data' } : null}
              bodyClassName="h-72"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.monthly} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                  <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => money(v, { compact: true })} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [money(v), n === 'income' ? 'Income' : 'Expense']} cursor={{ fill: chart.mutedFill, opacity: 0.5 }} />
                  <Bar dataKey="income" fill={PALETTE.income} radius={[6, 6, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="expense" fill={PALETTE.expense} radius={[6, 6, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <section className="card p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="section-title">Category breakdown</h2>
                  <p className="mt-0.5 text-xs text-ink-400">Where the money went</p>
                </div>
                <Badge tone="ink">{report.categoryBreakdown.length} rows</Badge>
              </div>
              <div className="max-h-72 space-y-3 overflow-y-auto pr-1 scrollbar-thin">
                {report.categoryBreakdown.map((c) => (
                  <div key={`${c.type}-${c.category}`}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2 font-medium text-ink-700 dark:text-ink-200">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                        <span className="truncate">{c.category}</span>
                        <Badge tone={c.type === 'income' ? 'emerald' : 'rose'}>{c.type}</Badge>
                      </span>
                      <span className="shrink-0 font-bold text-ink-900 tabular dark:text-white">{money(c.amount)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, c.percent)}%`, backgroundColor: c.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
          </Reveal>

          <Reveal y={26} amount={0.08}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="card p-5">
              <h2 className="section-title mb-4">Payment methods</h2>
              <ul className="space-y-3">
                {report.paymentMethodBreakdown.map((p) => (
                  <li key={p.method} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-ink-700 dark:text-ink-200">{p.method}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-xs text-ink-400">{p.count} txns</span>
                      <span className="font-bold text-ink-900 tabular dark:text-white">{money(p.amount)}</span>
                      <span className="w-12 text-right text-xs font-semibold text-ink-400">{p.percent}%</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card p-5">
              <h2 className="section-title mb-4">Largest expenses</h2>
              <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                {report.largestExpenses.slice(0, 6).map((t) => (
                  <li key={t._id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">
                        {t.description || t.category}
                      </p>
                      <p className="text-xs text-ink-400">
                        {formatDate(t.date)} · {t.category} · {t.paymentMethod}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-rose-600 tabular dark:text-rose-400">
                      −{money(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          </Reveal>
        </>
      )}
    </div>
  );
}
