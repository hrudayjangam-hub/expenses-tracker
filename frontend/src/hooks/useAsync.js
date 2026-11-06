import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../services/api';

/**
 * Runs an async loader whenever `deps` change and exposes { data, loading, error, reload }.
 */
export default function useAsync(fn, deps = [], options = {}) {
  const { enabled = true, initialData = null } = options;
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    if (!enabled) return undefined;
    setLoading(true);
    try {
      const result = await fnRef.current();
      if (mounted.current) {
        setData(result);
        setError('');
      }
      return result;
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not load data.');
      if (mounted.current) setError(msg);
      throw err;
    } finally {
      if (mounted.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }
    run().catch(() => {});
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, enabled]);

  return { data, loading, error, reload: run, setData };
}
