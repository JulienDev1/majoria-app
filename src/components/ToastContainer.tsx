import React from 'react';
import { CheckCircle2, AlertTriangle, Info, AlertOctagon } from 'lucide-react';
import { ToastItem } from '../types';

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemoveToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemoveToast }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container font-mono">
      {toasts.map((t) => {
        const getIcon = () => {
          switch (t.type) {
            case 'success':
              return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
            case 'warning':
              return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
            case 'danger':
              return <AlertOctagon className="w-4 h-4 text-red-400 shrink-0" />;
            case 'info':
            default:
              return <Info className="w-4 h-4 text-cyan-400 shrink-0" />;
          }
        };

        return (
          <div
            key={t.id}
            onClick={() => onRemoveToast(t.id)}
            className={`toast toast-${t.type} cursor-pointer hover:scale-102 transition-transform`}
          >
            {getIcon()}
            <span className="text-xs">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
};
