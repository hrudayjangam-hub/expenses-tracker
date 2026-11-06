import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Logo } from '../components/ui/Primitives';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink-50 px-6 text-center dark:bg-ink-950">
      <Logo className="h-12 w-12" />
      <p className="text-6xl font-extrabold tracking-tight text-ink-900 dark:text-white">404</p>
      <h1 className="text-lg font-bold text-ink-900 dark:text-white">This page does not exist</h1>
      <p className="max-w-sm text-sm text-ink-500 dark:text-ink-400">
        The link may be broken, or the page has been moved.
      </p>
      <Link to="/" className="btn-primary mt-2">
        <Compass className="h-4 w-4" /> Back to dashboard
      </Link>
    </div>
  );
}
