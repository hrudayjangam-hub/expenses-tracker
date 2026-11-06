import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { Field, Input, FormError } from '../components/ui/Fields';
import { Spinner } from '../components/ui/Primitives';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';
import useDocumentTitle from '../hooks/useDocumentTitle';

const schema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
    email: z.string().trim().email('Enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

export default function Register() {
  useDocumentTitle('Create account');
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', confirm: '' },
  });

  const onSubmit = async ({ confirm, ...values }) => {
    setServerError('');
    void confirm;
    try {
      await registerUser(values);
      toast.success('Account created — welcome!');
      navigate('/', { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err, 'Unable to create the account.'));
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start tracking income, expenses and budgets in under a minute."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormError message={serverError} />

        <Field label="Full name" error={errors.name?.message}>
          <Input
            type="text"
            autoComplete="name"
            placeholder="Aditi Sharma"
            invalid={Boolean(errors.name)}
            {...register('name')}
          />
        </Field>

        <Field label="Email address" error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            invalid={Boolean(errors.email)}
            {...register('email')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" error={errors.password?.message}>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Min. 6 characters"
                className="pr-11"
                invalid={Boolean(errors.password)}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-400 hover:text-ink-600 dark:hover:text-ink-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          <Field label="Confirm password" error={errors.confirm?.message}>
            <Input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repeat password"
              invalid={Boolean(errors.confirm)}
              {...register('confirm')}
            />
          </Field>
        </div>

        <button type="submit" className="btn-primary w-full !py-3" disabled={isSubmitting}>
          {isSubmitting ? <Spinner className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-center text-xs leading-relaxed text-ink-400">
          Your data stays private to your account. Default categories are seeded automatically.
        </p>
      </form>
    </AuthShell>
  );
}
