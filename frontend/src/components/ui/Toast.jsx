import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const ToastContext = createContext(undefined);

const styleMap = {
  success: 'border-emerald-700/60 bg-emerald-950/80 text-emerald-100',
  error: 'border-rose-700/60 bg-rose-950/80 text-rose-100',
  info: 'border-zinc-700 bg-zinc-900 text-zinc-100',
};

const iconMap = {
  success: <CheckCircle2 size={16} />,
  error: <AlertCircle size={16} />,
  info: <Info size={16} />,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (title, variant = 'info') => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev, { id, title, variant }]);
      window.setTimeout(() => removeToast(id), 3500);
    },
    [removeToast],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[70] space-y-2">
        {toasts.map((toast) => (
          <div key={toast.id} className={`flex min-w-[260px] items-start gap-2 rounded-lg border px-3 py-2 shadow-lg ${styleMap[toast.variant]}`}>
            <span className="mt-0.5">{iconMap[toast.variant]}</span>
            <p className="flex-1 text-sm leading-5">{toast.title}</p>
            <button type="button" onClick={() => removeToast(toast.id)} className="rounded p-0.5 hover:bg-black/20">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}
