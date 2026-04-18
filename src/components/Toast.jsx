import React from 'react';
import { useToast } from '../context/ToastContext';
import { Check, AlertCircle, X } from 'lucide-react';

export default function Toast() {
  const { toasts, removeToast } = useToast();

  const getColorClasses = (type) => {
    const colors = {
      success: 'bg-green-50 border-green-200 text-green-800',
      error: 'bg-red-50 border-red-200 text-red-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800'
    };
    return colors[type] || colors.info;
  };

  const getIcon = (type) => {
    const iconProps = { className: 'w-5 h-5' };
    switch (type) {
      case 'success':
        return <Check {...iconProps} />;
      case 'error':
        return <AlertCircle {...iconProps} />;
      default:
        return <AlertCircle {...iconProps} />;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`rounded-lg border p-4 flex items-start gap-3 shadow-lg animate-in fade-in slide-in-from-bottom-4 ${getColorClasses(toast.type)}`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {getIcon(toast.type)}
          </div>
          <div className="flex-1 text-sm font-medium">
            {toast.message}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-current opacity-70 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
