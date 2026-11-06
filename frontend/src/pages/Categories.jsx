import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useCategories } from '../hooks/useCategories';
import { createCategory, updateCategory, deleteCategory } from '../services/categoryService';
import { COLOR_PRESETS, ICON_NAMES, getIcon } from '../utils/icons';
import { Badge, EmptyState, FullSpinner, SectionHeader, Spinner } from '../components/ui/Primitives';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { Field, Input, Select, FormError } from '../components/ui/Fields';
import { getErrorMessage } from '../services/api';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  type: z.enum(['income', 'expense']),
  icon: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Pick a valid colour'),
});

export default function Categories() {
  useDocumentTitle('Categories');
  const { categories, loading, error, reload, setCategories } = useCategories();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { name: '', type: 'expense', icon: 'Tag', color: '#0f766e' } });

  const watchedIcon = watch('icon');
  const watchedColor = watch('color');
  const PreviewIcon = getIcon(watchedIcon);

  useEffect(() => {
    if (!modalOpen) return;
    if (editing) {
      reset({ name: editing.name, type: editing.type, icon: editing.icon || 'Tag', color: editing.color || '#64748b' });
    } else {
      reset({ name: '', type: 'expense', icon: 'Tag', color: '#0f766e' });
    }
  }, [modalOpen, editing, reset]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const onSubmit = async (values) => {
    try {
      if (editing) {
        const data = await updateCategory(editing._id, values);
        setCategories((prev) => prev.map((c) => (c._id === editing._id ? data.category : c)));
        toast.success('Category updated');
      } else {
        const data = await createCategory(values);
        setCategories((prev) => [...prev, data.category].sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name)));
        toast.success('Category created');
      }
      setModalOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the category.'));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteCategory(deleting._id);
      setCategories((prev) => prev.filter((c) => c._id !== deleting._id));
      toast.success('Category deleted');
      setDeleting(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete the category.'));
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading && !categories.length) return <FullSpinner label="Loading categories…" />;

  const groups = [
    { type: 'expense', title: 'Expense categories', subtitle: 'Used when recording spending', tone: 'rose' },
    { type: 'income', title: 'Income categories', subtitle: 'Used when recording earnings', tone: 'emerald' },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Categories"
        subtitle="Organise transactions with custom icons and colours."
        action={
          <button className="btn-primary !py-2.5" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New category
          </button>
        }
      />

      {error ? (
        <div className="card flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-sm font-medium text-rose-500">{error}</p>
          <button className="btn-secondary !py-2" onClick={reload}>Retry</button>
        </div>
      ) : !categories.length ? (
        <EmptyState icon={Tags} title="No categories" description="Create your first category to organise transactions." />
      ) : (
        groups.map((g) => {
          const items = categories.filter((c) => c.type === g.type);
          if (!items.length) return null;
          return (
            <section key={g.type} className="card p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="section-title">{g.title}</h2>
                  <p className="mt-0.5 text-xs text-ink-400">
                    {g.subtitle} · {items.length} total
                  </p>
                </div>
                <Badge tone={g.tone}>{g.type}</Badge>
              </div>

              <div className="et-hscroll -mx-1 flex gap-3 overflow-x-auto px-1 pb-2 scrollbar-thin sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-3">
                {items.map((c) => {
                  const Icon = getIcon(c.icon);
                  return (
                    <div
                      key={c._id}
                      className="card-hover group flex min-w-[250px] shrink-0 snap-start items-center gap-3 rounded-xl border border-ink-100 bg-white p-3.5 sm:min-w-0 dark:border-ink-800 dark:bg-ink-800/40"
                    >
                      <span
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${c.color}1f`, color: c.color }}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{c.name}</p>
                        <p className="truncate text-xs text-ink-400">{c.color}</p>
                      </div>
                      <div className="flex shrink-0 gap-1 opacity-70 transition group-hover:opacity-100">
                        <button
                          aria-label={`Edit ${c.name}`}
                          onClick={() => {
                            setEditing(c);
                            setModalOpen(true);
                          }}
                          className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-800 dark:hover:bg-ink-700 dark:hover:text-white"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          aria-label={`Delete ${c.name}`}
                          onClick={() => setDeleting(c)}
                          className="rounded-lg p-2 text-ink-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? 'Edit category' : 'New category'}
        description="Name, type, icon and colour are stored on your account."
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormError message={errors.root?.message} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={errors.name?.message}>
              <Input placeholder="e.g. Subscriptions" invalid={Boolean(errors.name)} {...register('name')} />
            </Field>
            <Field label="Type" error={errors.type?.message}>
              <Select {...register('type')}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Icon" error={errors.icon?.message}>
              <Select {...register('icon')}>
                {ICON_NAMES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Colour" error={errors.color?.message}>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={watchedColor}
                  onChange={(e) => setValue('color', e.target.value, { shouldValidate: true, shouldDirty: true })}
                  className="h-11 w-14 cursor-pointer rounded-xl border border-ink-200 bg-white p-1 dark:border-ink-700 dark:bg-ink-800"
                  aria-label="Pick colour"
                />
                <Input
                  value={watchedColor}
                  onChange={(e) => setValue('color', e.target.value, { shouldValidate: true, shouldDirty: true })}
                  className="font-mono uppercase"
                  aria-label="Colour hex value"
                />
              </div>
            </Field>
          </div>

          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Use colour ${c}`}
                onClick={() => setValue('color', c, { shouldValidate: true, shouldDirty: true })}
                className={`h-7 w-7 rounded-full ring-2 transition ${watchedColor?.toLowerCase() === c ? 'ring-ink-900 dark:ring-white' : 'ring-transparent hover:scale-110'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-ink-50 px-4 py-3 dark:bg-ink-800">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${watchedColor}1f`, color: watchedColor }}>
              <PreviewIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-900 dark:text-white">{watch('name') || 'Preview'}</p>
              <p className="text-xs text-ink-400 capitalize">{watch('type')} category</p>
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
              {editing ? 'Save changes' : 'Create category'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete category?"
        message={`"${deleting?.name}" will be removed. Existing transactions keep their category label, but you will no longer be able to select it for new records.`}
        confirmLabel="Delete"
        loading={deleteLoading}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
