import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { Field, Input, FormError } from '../components/ui/Fields';
import { Spinner } from '../components/ui/Primitives';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';
import useDocumentTitle from '../hooks/useDocumentTitle';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function Login() {
  useDocumentTitle('Login');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      await login(values);
      toast.success('Welcome back!');
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      const msg = getErrorMessage(err, 'Unable to log in.');
      setServerError(msg);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to your dashboard to continue."
      footer={
        <>
          New to Expenses Tracker?{' '}
          <Link to="/register" className="font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormError message={serverError} />

        <Field label="Email address" error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            invalid={Boolean(errors.email)}
            {...register('email')}
          />
        </Field>

        <Field label="Password" error={errors.password?.message}>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
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

        <button type="submit" className="btn-primary w-full !py-3" disabled={isSubmitting}>
          {isSubmitting ? <Spinner className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </AuthShell>
  );
}
