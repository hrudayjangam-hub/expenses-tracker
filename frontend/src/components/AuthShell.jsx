import { Link } from 'react-router-dom';
import { BarChart3, PieChart, ShieldCheck, Wallet } from 'lucide-react';
import { Logo } from './ui/Primitives';
import { useI18n } from '../i18n/LanguageContext';

export default function AuthShell({ title, subtitle, children, footer }) {
  const { t, lang, setLang, languages } = useI18n();

  const FEATURES = [
    { icon: Wallet, title: t('dash.totalBalance'), text: t('auth.privacyNote') },
    { icon: BarChart3, title: t('dash.budgetProgress'), text: t('auth.heroSub') },
    { icon: PieChart, title: t('nav.analytics'), text: t('dash.subtitle') },
    { icon: ShieldCheck, title: t('auth.brandTagline'), text: t('settings.isolationNote') },
  ];

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950 lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-ink-950 p-12 lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(16,185,129,0.20), transparent 45%), radial-gradient(circle at 80% 70%, rgba(71,85,138,0.40), transparent 50%)',
          }}
        />
        <span className="et-blob pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />
        <span className="et-blob et-blob-delayed pointer-events-none absolute -right-20 bottom-1/4 h-80 w-80 rounded-full bg-sky-500/15 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(circle at 30% 40%, black, transparent 75%)',
          }}
        />
        <div className="relative">
          <Link to="/" className="flex items-center gap-3">
            <Logo className="h-10 w-10" />
            <div>
              <p className="text-base font-extrabold tracking-tight text-white">{t('nav.brand')}</p>
              <p className="text-xs font-medium text-ink-400">{t('auth.brandTagline')}</p>
            </div>
          </Link>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white">
            {t('auth.heroTitle1')}
            <span className="text-gradient">{t('auth.heroTitle2')}</span>
            {t('auth.heroTitle3')}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-300">{t('auth.heroSub')}</p>
          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, title: fTitle, text }) => (
              <li key={fTitle} className="flex gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/25 to-sky-500/20 text-emerald-300 ring-1 ring-white/10">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{fTitle}</p>
                  <p className="text-xs leading-relaxed text-ink-400">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-ink-500">{t('auth.batch')}</p>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex items-center justify-between lg:justify-end">
            <div className="flex items-center gap-3 lg:hidden">
              <Logo />
              <div>
                <p className="text-sm font-extrabold text-ink-900 dark:text-white">{t('nav.brand')}</p>
                <p className="text-xs text-ink-400">{t('nav.tagline')}</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                    lang === l.code
                      ? 'bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/40 dark:text-emerald-400'
                      : 'text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800'
                  }`}
                  aria-label={l.label}
                >
                  {l.code.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white">{title}</h1>
          <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">{subtitle}</p>

          <div className="glass-card mt-7 rounded-2xl border border-white/60 p-5 dark:border-white/5">{children}</div>

          {footer ? <div className="mt-6 text-center text-sm text-ink-500 dark:text-ink-400">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
