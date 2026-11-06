import { useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Sparkles, Split, X } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Field, Input, Select, Textarea, FormError } from './ui/Fields';
import { Spinner } from './ui/Primitives';
import { PAYMENT_METHODS, toISODate, formatCurrency } from '../utils/format';
import { getErrorMessage } from '../services/api';
import { createTransaction, updateTransaction } from '../services/transactionService';
import { listAccounts } from '../services/accountService';
import { useI18n } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { suggestCategory } from '../utils/suggestCategory';

const schema = z
  .object({
    type: z.enum(['income', 'expense']),
    amount: z.coerce.number({ invalid_type_error: 'Enter a valid amount' }).positive('Amount must be greater than 0'),
    category: z.string().optional().default(''),
    date: z.string().min(1, 'Date is required'),
    paymentMethod: z.enum(PAYMENT_METHODS, { errorMap: () => ({ message: 'Pick a payment method' }) }),
    description: z.string().max(300, 'Max 300 characters').optional().default(''),
    accountId: z.string().optional().default(''),
    splitEnabled: z.boolean().default(false),
    splits: z
      .array(
        z.object({
          category: z.string().min(1, 'Pick a category'),
          amount: z.coerce.number().positive('Must be > 0'),
        })
      )
      .default([]),
  })
  .refine((d) => !d.splitEnabled || d.category, {
    message: 'Pick a category or enable splits',
    path: ['category'],
  });

export default function TransactionModal({ open, onClose, transaction, categories = [], onSaved }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const currency = user?.currency || 'INR';
  const [serverError, setServerError] = useState('');
  const [accounts, setAccounts] = useState([]);
  const isEdit = Boolean(transaction?._id);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'expense',
      amount: '',
      category: '',
      date: toISODate(new Date()),
      paymentMethod: 'Cash',
      description: '',
      accountId: '',
      splitEnabled: false,
      splits: [{ category: '', amount: '' }, { category: '', amount: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'splits' });

  const type = watch('type');
  const splitEnabled = watch('splitEnabled');
  const amount = Number(watch('amount')) || 0;
  const description = watch('description');
  const watchedCategory = watch('category');
  const splits = watch('splits');

  const visibleCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  );

  useEffect(() => {
    if (!open) return;
    listAccounts()
      .then((d) => setAccounts(d.accounts || []))
      .catch(() => setAccounts([]));
  }, [open]);

  // AI category suggestion from the description
  const suggestion = useMemo(
    () => suggestCategory(description, categories, type),
    [description, categories, type]
  );
  const showSuggestion =
    suggestion && !splitEnabled && suggestion.category !== watchedCategory && suggestion.confidence >= 0.5;

  const splitTotal = (splits || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const splitRemainder = Math.round((amount - splitTotal) * 100) / 100;
  const splitValid = !splitEnabled || (fields.length >= 2 && Math.abs(splitRemainder) < 0.01);

  useEffect(() => {
    if (!open) return;
    setServerError('');
    if (transaction) {
      reset({
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category === 'Split' ? '' : transaction.category,
        date: toISODate(transaction.date),
        paymentMethod: transaction.paymentMethod,
        description: transaction.description || '',
        accountId: transaction.accountId || '',
        splitEnabled: Boolean(transaction.splits?.length),
        splits:
          transaction.splits && transaction.splits.length >= 2
            ? transaction.splits.map((s) => ({ category: s.category, amount: s.amount }))
            : [
                { category: '', amount: '' },
                { category: '', amount: '' },
              ],
      });
    } else {
      reset({
        type: 'expense',
        amount: '',
        category: '',
        date: toISODate(new Date()),
        paymentMethod: 'Cash',
        description: '',
        accountId: '',
        splitEnabled: false,
        splits: [
          { category: '', amount: '' },
          { category: '', amount: '' },
        ],
      });
    }
  }, [open, transaction, reset]);

  useEffect(() => {
    if (!open || splitEnabled) return;
    const current = watch('category');
    if (!visibleCategories.some((c) => c.name === current)) {
      setValue('category', visibleCategories[0]?.name || '');
    }
  }, [type, visibleCategories, open, setValue, watch, splitEnabled]);

  const applySuggestion = () => {
    if (suggestion) setValue('category', suggestion.category, { shouldValidate: true });
  };

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const payload = {
        type: values.type,
        amount: Number(values.amount),
        date: values.date,
        paymentMethod: values.paymentMethod,
        description: values.description || '',
        accountId: values.accountId || null,
      };
      if (values.splitEnabled) {
        payload.splits = values.splits.map((s) => ({
          category: s.category,
          amount: Number(s.amount),
        }));
        payload.category = 'Split';
      } else {
        payload.category = values.category;
        payload.splits = null;
      }
      if (isEdit) {
        await updateTransaction(transaction._id, payload);
        toast.success(t('tx.updated'));
      } else {
        await createTransaction(payload);
        toast.success(t('tx.added'));
      }
      onSaved?.();
      onClose();
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not save the transaction.');
      setServerError(msg);
      toast.error(msg);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('tx.edit') : t('tx.add')}
      description={isEdit ? t('tx.updateDetails') : t('tx.recordNew')}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormError message={serverError} />

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-ink-100 p-1 dark:bg-ink-800">
          {['expense', 'income'].map((tt) => (
            <button
              key={tt}
              type="button"
              onClick={() => setValue('type', tt, { shouldValidate: true, shouldDirty: true })}
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                type === tt
                  ? tt === 'income'
                    ? 'bg-white text-emerald-700 shadow-sm dark:bg-emerald-500 dark:text-ink-950'
                    : 'bg-white text-rose-700 shadow-sm dark:bg-rose-500 dark:text-white'
                  : 'text-ink-500 hover:text-ink-700 dark:text-ink-400'
              }`}
            >
              {tt === 'income' ? t('tx.income') : t('tx.expense')}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('tx.amount')} error={errors.amount?.message}>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              placeholder="0.00"
              invalid={Boolean(errors.amount)}
              {...register('amount')}
            />
          </Field>

          <Field label={t('tx.date')} error={errors.date?.message}>
            <Input type="date" invalid={Boolean(errors.date)} {...register('date')} />
          </Field>

          {!splitEnabled && (
            <Field label={t('tx.category')} error={errors.category?.message}>
              <Select invalid={Boolean(errors.category)} {...register('category')}>
                <option value="">{t('tx.selectCategory')}</option>
                {visibleCategories.map((c) => (
                  <option key={`${c.type}-${c.name}`} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label={t('tx.paymentMethod')} error={errors.paymentMethod?.message}>
            <Select invalid={Boolean(errors.paymentMethod)} {...register('paymentMethod')}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>

          {accounts.length > 0 && (
            <Field label="Account" error={errors.accountId?.message} hint="Optional — track per account">
              <Select {...register('accountId')}>
                <option value="">No account</option>
                {accounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name} ({formatCurrency(a.balance, currency)})
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>

        {/* AI suggestion chip */}
        {showSuggestion && (
          <button
            type="button"
            onClick={applySuggestion}
            className="flex w-full items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2.5 text-left text-sm font-medium text-violet-700 transition hover:bg-violet-100 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20"
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>
              Suggested category: <strong>{suggestion.category}</strong>
              <span className="ml-1 text-xs opacity-70">
                ({Math.round(suggestion.confidence * 100)}% match)
              </span>
            </span>
            <span className="ml-auto text-xs font-semibold underline">Apply</span>
          </button>
        )}

        {/* Split toggle */}
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink-100 px-3.5 py-3 dark:border-ink-800">
          <input
            type="checkbox"
            className="h-4 w-4 rounded accent-emerald-600"
            {...register('splitEnabled')}
          />
          <span className="flex items-center gap-2 text-sm font-semibold text-ink-700 dark:text-ink-200">
            <Split className="h-4 w-4 text-emerald-600" /> Split across categories
          </span>
          <span className="ml-auto text-xs text-ink-400">One payment, several categories</span>
        </label>

        {splitEnabled && (
          <div className="space-y-2 rounded-xl border border-ink-100 p-3 dark:border-ink-800">
            {fields.map((field, idx) => (
              <div key={field.id} className="flex items-start gap-2">
                <div className="flex-1">
                  <Select
                    invalid={Boolean(errors.splits?.[idx]?.category)}
                    {...register(`splits.${idx}.category`)}
                  >
                    <option value="">{t('tx.selectCategory')}</option>
                    {visibleCategories.map((c) => (
                      <option key={`${c.type}-${c.name}`} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    invalid={Boolean(errors.splits?.[idx]?.amount)}
                    {...register(`splits.${idx}.amount`)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  disabled={fields.length <= 2}
                  aria-label="Remove split"
                  className="mt-2 rounded-lg p-1.5 text-ink-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-30"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => append({ category: '', amount: '' })}
                disabled={fields.length >= 10}
                className="btn-ghost !py-1.5 !text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Add part
              </button>
              <p
                className={`text-xs font-semibold tabular ${
                  Math.abs(splitRemainder) < 0.01
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {Math.abs(splitRemainder) < 0.01
                  ? 'Splits add up ✓'
                  : `${formatCurrency(splitRemainder, currency)} ${splitRemainder > 0 ? 'left to assign' : 'over-assigned'}`}
              </p>
            </div>
            {errors.splits && (
              <p className="field-error">{errors.splits.message || 'Check the split amounts'}</p>
            )}
          </div>
        )}

        <Field label={t('tx.description')} error={errors.description?.message} hint={t('tx.descHint')}>
          <Textarea placeholder="e.g. Grocery run at the supermarket" {...register('description')} />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting || !splitValid}>
            {isSubmitting ? <Spinner className="h-4 w-4" /> : null}
            {isEdit ? t('tx.saveChanges') : t('tx.addBtn')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
