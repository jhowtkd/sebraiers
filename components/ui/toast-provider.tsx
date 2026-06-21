'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type Variant = 'default' | 'success' | 'error' | 'info';
type Toast = { id: string; title: string; description?: string; variant: Variant };
type Ctx = { toast: (t: Omit<Toast, 'id'>) => void };
const ToastContext = React.createContext<Ctx | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}

const variantClass: Record<Variant, string> = {
  default: 'bg-surface-elevated text-text-primary border-border-subtle',
  success: 'bg-state-success/10 text-state-success-strong border-state-success/30',
  error: 'bg-state-error/10 text-state-error-strong border-state-error/30',
  info: 'bg-state-info/10 text-state-info-strong border-state-info/30',
};
const variantIcon = { default: Info, success: CheckCircle2, error: AlertCircle, info: Info } as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const toast = React.useCallback((t: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div aria-live="polite" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((t) => {
          const Icon = variantIcon[t.variant];
          return (
            <div key={t.id} role="status" className={cn('flex items-start gap-3 rounded-md border p-3 shadow-md animate-fade-in', variantClass[t.variant])}>
              <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-body-sm font-medium">{t.title}</p>
                {t.description && <p className="text-caption mt-0.5 opacity-80">{t.description}</p>}
              </div>
              <button onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} aria-label="Fechar" className="opacity-60 hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}