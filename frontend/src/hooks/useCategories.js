import { useCallback, useEffect, useState } from 'react';
import { listCategories } from '../services/categoryService';
import { getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function useCategories(type) {
  const { isAuthenticated, initializing } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listCategories(type ? { type } : {});
      setCategories(data.categories || []);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load categories.'));
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    if (initializing) return;
    if (!isAuthenticated) {
      setCategories([]);
      setError('');
      setLoading(false);
      return;
    }
    load();
  }, [load, isAuthenticated, initializing]);

  return { categories, loading, error, reload: load, setCategories };
}
