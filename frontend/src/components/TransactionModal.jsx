import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Modal } from './ui/Modal';
import { Field, Input, Select, Textarea, FormError } from './ui/Fields';
import { Spinner } from './ui/Primitives';
import { PAYMENT_METHODS, toISODate } from '../utils/format';
import { getErrorMessage } from '../services/api';
import { createTransaction, updateTransaction } from '../services/transactionService';

const schema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number({ invalid_type_error: 'Enter a valid amount' }).positive('Amount must be greater than 0'),
  category: z.string().min(1, 'Pick a category'),
  date: z.string().min(1, 'Date is required'),
  paymentMethod: z.enum(PAYMENT_METHODS, { errorMap: () => ({ message: 'Pick a payment method' }) }),
  description: z.string().max(300, 'Max 300 characters').optional().default(''),
});

export default function TransactionModal({ open, onClose, transaction, categories = [], onSaved }) {
  const [serverError, setServerError] = useState('');
  const isEdit = Boolean(transaction?._id);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
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
    },
  });

  const type = watch('type');

  const visibleCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  );

  useEffect(() => {
    if (!open) return;
    setServerError('');
    if (transaction) {
      reset({
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        date: toISODate(transaction.date),
        paymentMethod: transaction.paymentMethod,
        description: transaction.description || '',
      });
    } else {
      reset({
        type: 'expense',
        amount: '',
        category: '',
        date: toISODate(new Date()),
        paymentMethod: 'Cash',
        description: '',
      });
    }
  }, [open, transaction, reset]);

  useEffect(() => {
    if (!open) return;
    const current = watch('category');
    if (!visibleCategories.some((c) => c.name === current)) {
      setValue('category', visibleCategories[0]?.name || '');
    }
  }, [type, visibleCategories, open, setValue, watch]);

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const payload = { ...values, amount: Number(values.amount), description: values.description || '' };
      if (isEdit) {
        await updateTransaction(transaction._id, payload);
        toast.success('Transaction updated');
      } else {
        await createTransaction(payload);
        toast.success('Transaction added');
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
      title={isEdit ? 'Edit transaction' : 'Add transaction'}
      description={isEdit ? 'Update the details of this record.' : 'Record a new income or expense entry.'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormError message={serverError} />

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-ink-100 p-1 dark:bg-ink-800">
          {['expense', 'income'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setValue('type', t, { shouldValidate: true, shouldDirty: true })}
              className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize transition ${
                type === t
                  ? t === 'income'
                    ? 'bg-white text-emerald-700 shadow-sm dark:bg-emerald-500 dark:text-ink-950'
                    : 'bg-white text-rose-700 shadow-sm dark:bg-rose-500 dark:text-white'
                  : 'text-ink-500 hover:text-ink-700 dark:text-ink-400'
              }`}
            >
              {t === 'income' ? 'Income' : 'Expense'}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount" error={errors.amount?.message}>
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

          <Field label="Date" error={errors.date?.message}>
            <Input type="date" invalid={Boolean(errors.date)} {...register('date')} />
          </Field>

          <Field label="Category" error={errors.category?.message}>
            <Select invalid={Boolean(errors.category)} {...register('category')}>
              <option value="">Select category</option>
              {visibleCategories.map((c) => (
                <option key={`${c.type}-${c.name}`} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Payment method" error={errors.paymentMethod?.message}>
            <Select invalid={Boolean(errors.paymentMethod)} {...register('paymentMethod')}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Description" error={errors.description?.message} hint="Optional note about this transaction">
          <Textarea placeholder="e.g. Grocery run at the supermarket" {...register('description')} />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? <Spinner className="h-4 w-4" /> : null}
            {isEdit ? 'Save changes' : 'Add transaction'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
