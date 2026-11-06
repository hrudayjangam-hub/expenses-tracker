import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { MotionConfig } from 'framer-motion';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3500,
                style: {
                  background: '#0a1020',
                  color: '#f4f6fa',
                  borderRadius: '14px',
                  fontSize: '14px',
                  fontWeight: 600,
                  boxShadow: '0 18px 40px -18px rgba(10,16,32,0.6)',
                  border: '1px solid rgba(255,255,255,0.08)',
                },
                success: { iconTheme: { primary: '#10b981', secondary: '#0a1020' } },
                error: { iconTheme: { primary: '#f43f5e', secondary: '#0a1020' } },
              }}
            />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </MotionConfig>
  </React.StrictMode>
);
