import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { KeyRound, Languages, Moon, Save, Sun, UserCircle2 } from 'lucide-react';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n/LanguageContext';
import { changePassword, updateProfile } from '../services/authService';
import { CURRENCIES, formatDate } from '../utils/format';
import { Field, Input, Select, FormError } from '../components/ui/Fields';
import { SectionHeader, Spinner } from '../components/ui/Primitives';
import { getErrorMessage } from '../services/api';

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  currency: z.string().min(3),
  language: z.string().min(2),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirm: z.string(),
  })
  .refine((d) => d.newPassword === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });

export default function Settings() {
  useDocumentTitle('Settings');
  const { user, updateUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t, lang, setLang, languages } = useI18n();

  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '', currency: user?.currency || 'INR', language: lang },
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  });

  useEffect(() => {
    profileForm.reset({ name: user?.name || '', currency: user?.currency || 'INR', language: lang });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.name, user?.currency, lang]);

  const onProfile = async (values) => {
    setProfileError('');
    try {
      setLang(values.language);
      const data = await updateProfile({ name: values.name, currency: values.currency, language: values.language });
      updateUser(data.user);
      toast.success(t('tx.updated').replace('Transaction', 'Profile') || 'Profile updated');
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not update the profile.');
      setProfileError(msg);
      toast.error(msg);
    }
  };

  const onPassword = async (values) => {
    setPasswordError('');
    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      toast.success('Password changed');
      passwordForm.reset({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not change the password.');
      setPasswordError(msg);
      toast.error(msg);
    }
  };

  const initials = (user?.name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="space-y-5">
      <SectionHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Profile */}
        <section className="card glass-card p-5">
          <div className="mb-5 flex items-center gap-4">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-900 text-lg font-bold text-white dark:bg-emerald-500 dark:text-ink-950">
              {initials}
            </span>
            <div className="min-w-0">
              <h2 className="section-title">{user?.name}</h2>
              <p className="truncate text-sm text-ink-500 dark:text-ink-400">{user?.email}</p>
              <p className="mt-0.5 text-xs text-ink-400">
                {t('settings.memberSince')} {user?.createdAt ? formatDate(user.createdAt) : '—'}
              </p>
            </div>
          </div>

          <form onSubmit={profileForm.handleSubmit(onProfile)} className="space-y-4" noValidate>
            <FormError message={profileError} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('settings.fullName')} error={profileForm.formState.errors.name?.message}>
                <Input invalid={Boolean(profileForm.formState.errors.name)} {...profileForm.register('name')} />
              </Field>
              <Field
                label={t('common.currency')}
                error={profileForm.formState.errors.currency?.message}
                hint={t('settings.currencyHint')}
              >
                <Select {...profileForm.register('currency')}>
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label={t('common.language')}
                error={profileForm.formState.errors.language?.message}
                hint={t('settings.languageHint')}
              >
                <Select {...profileForm.register('language')}>
                  {languages.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.native}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="flex justify-end">
              <button className="btn-primary" disabled={profileForm.formState.isSubmitting}>
                {profileForm.formState.isSubmitting ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {t('settings.saveProfile')}
              </button>
            </div>
          </form>
        </section>

        {/* Password */}
        <section className="card glass-card p-5">
          <div className="mb-5 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
              <KeyRound className="h-5 w-5" />
            </span>
            <div>
              <h2 className="section-title">{t('settings.changePassword')}</h2>
              <p className="text-xs text-ink-400">{t('settings.bcryptNote')}</p>
            </div>
          </div>

          <form onSubmit={passwordForm.handleSubmit(onPassword)} className="space-y-4" noValidate>
            <FormError message={passwordError} />
            <Field label={t('settings.currentPassword')} error={passwordForm.formState.errors.currentPassword?.message}>
              <Input
                type="password"
                autoComplete="current-password"
                invalid={Boolean(passwordForm.formState.errors.currentPassword)}
                {...passwordForm.register('currentPassword')}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('settings.newPassword')} error={passwordForm.formState.errors.newPassword?.message}>
                <Input
                  type="password"
                  autoComplete="new-password"
                  invalid={Boolean(passwordForm.formState.errors.newPassword)}
                  {...passwordForm.register('newPassword')}
                />
              </Field>
              <Field label={t('settings.confirmNewPassword')} error={passwordForm.formState.errors.confirm?.message}>
                <Input
                  type="password"
                  autoComplete="new-password"
                  invalid={Boolean(passwordForm.formState.errors.confirm)}
                  {...passwordForm.register('confirm')}
                />
              </Field>
            </div>
            <div className="flex justify-end">
              <button className="btn-secondary" disabled={passwordForm.formState.isSubmitting}>
                {passwordForm.formState.isSubmitting ? <Spinner className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                {t('settings.updatePassword')}
              </button>
            </div>
          </form>
        </section>

        {/* Appearance */}
        <section className="card glass-card p-5">
          <div className="mb-5 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400">
              {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </span>
            <div>
              <h2 className="section-title">{t('common.theme')}</h2>
              <p className="text-xs text-ink-400">{t('settings.themeSaved')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'light', label: t('common.light'), icon: Sun, desc: t('settings.lightDesc') },
              { id: 'dark', label: t('common.dark'), icon: Moon, desc: t('settings.darkDesc') },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTheme(opt.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  theme === opt.id
                    ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/30 dark:bg-emerald-500/10'
                    : 'border-ink-100 hover:border-ink-200 dark:border-ink-800 dark:hover:border-ink-700'
                }`}
              >
                <opt.icon className={`h-5 w-5 ${theme === opt.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-400'}`} />
                <p className="mt-2 text-sm font-bold text-ink-900 dark:text-white">{opt.label}</p>
                <p className="text-xs text-ink-400">{opt.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Language */}
        <section className="card glass-card p-5">
          <div className="mb-5 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
              <Languages className="h-5 w-5" />
            </span>
            <div>
              <h2 className="section-title">{t('common.language')}</h2>
              <p className="text-xs text-ink-400">{t('settings.languageHint')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`rounded-2xl border p-4 text-left transition ${
                  lang === l.code
                    ? 'border-violet-500 bg-violet-50/60 ring-2 ring-violet-500/30 dark:bg-violet-500/10'
                    : 'border-ink-100 hover:border-ink-200 dark:border-ink-800 dark:hover:border-ink-700'
                }`}
              >
                <p className="text-sm font-bold text-ink-900 dark:text-white">{l.native}</p>
                <p className="text-xs text-ink-400">{l.label}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Account */}
        <section className="card glass-card p-5 xl:col-span-2">
          <div className="mb-5 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
              <UserCircle2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="section-title">{t('settings.account')}</h2>
              <p className="text-xs text-ink-400">{t('settings.accountDetails')}</p>
            </div>
          </div>

          <dl className="divide-y divide-ink-100 text-sm dark:divide-ink-800">
            {[
              [t('settings.email'), user?.email],
              [t('settings.name'), user?.name],
              [t('common.currency'), user?.currency || 'INR'],
              [t('settings.userId'), user?._id],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-ink-500 dark:text-ink-400">{k}</dt>
                <dd className="truncate font-semibold text-ink-900 dark:text-white">{v || '—'}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 rounded-xl bg-ink-50 px-4 py-3 text-xs leading-relaxed text-ink-500 dark:bg-ink-800/60 dark:text-ink-400">
            {t('settings.isolationNote')}
          </div>

          <div className="mt-4 flex justify-end">
            <button className="btn-ghost text-rose-600 dark:text-rose-400" onClick={logout}>
              {t('settings.logoutDevice')}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
