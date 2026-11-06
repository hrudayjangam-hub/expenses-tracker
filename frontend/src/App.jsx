import { useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import { FullSpinner } from './components/ui/Primitives';
import TransactionModal from './components/TransactionModal';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Categories from './pages/Categories';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import { useCategories } from './hooks/useCategories';

function Protected({ children }) {
  const { isAuthenticated, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <FullSpinner label="Restoring your session…" />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

export default function App() {
  const { isAuthenticated, initializing } = useAuth();
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txRefreshKey, setTxRefreshKey] = useState(0);
  const { categories } = useCategories();

  const openAddTransaction = () => setTxModalOpen(true);
  const handleSaved = () => setTxRefreshKey((k) => k + 1);

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated && !initializing ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/register"
          element={isAuthenticated && !initializing ? <Navigate to="/" replace /> : <Register />}
        />
        <Route
          element={
            <Protected>
              <DashboardLayout onAddTransaction={openAddTransaction} />
            </Protected>
          }
        >
          <Route path="/" element={<Dashboard refreshKey={txRefreshKey} onAddTransaction={openAddTransaction} />} />
          <Route path="/transactions" element={<Transactions refreshKey={txRefreshKey} onAdd={openAddTransaction} />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>

      <TransactionModal
        open={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        categories={categories}
        onSaved={handleSaved}
      />
    </>
  );
}
