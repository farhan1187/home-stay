import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  showToast: (title: string, message?: string, type?: ToastType) => void;
  showError: (err: any, fallbackTitle?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((title: string, message?: string, type: ToastType = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, [removeToast]);

  const showError = useCallback((err: any, fallbackTitle = 'Action Failed') => {
    const msg = err?.message || String(err || 'An unexpected error occurred');
    
    // Check for room conflict / exclusion violation
    if (
      msg.includes('Room Conflict') ||
      msg.includes('no_overlapping_bookings') ||
      msg.includes('exclusion_violation') ||
      err?.code === '23P01'
    ) {
      showToast(
        'Room Conflict: Dates Unavailable',
        'This room is already booked for the selected dates. Please choose another date or room.',
        'error'
      );
      return;
    }

    showToast(fallbackTitle, msg, 'error');
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showError }}>
      {children}
      {/* Toast floating container */}
      <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isSuccess = toast.type === 'success';
          const isWarning = toast.type === 'warning';

          const bgColor = isError
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : isWarning
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : isSuccess
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-blue-50 border-blue-200 text-blue-900';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg transition-all animate-slideDown ${bgColor}`}
            >
              <div className="mt-0.5 shrink-0">
                {isError ? (
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                ) : isWarning ? (
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                ) : isSuccess ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Info className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.message && (
                  <p className="text-xs mt-0.5 opacity-90 break-words">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 rounded hover:bg-black/5 opacity-70 hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
