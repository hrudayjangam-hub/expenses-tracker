import { useEffect } from 'react';

export default function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Expenses Tracker` : 'Expenses Tracker';
  }, [title]);
}
