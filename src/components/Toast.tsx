import React, { useState, useEffect, useCallback } from "react";
import { ToastContext, type Toast } from "../context/ToastContext";

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, "id">): string => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast: Toast = { ...toast, id };

      setToasts((prev) => [...prev, newToast]);

      // Auto-remove after duration if specified
      if (toast.duration !== undefined && toast.duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, toast.duration);
      }

      return id;
    },
    [removeToast]
  );

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAll }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  removeToast,
}) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Auto-remove error toasts after 8 seconds if no duration specified
    if (toast.type === "error" && toast.duration === undefined) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(onClose, 300);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  const getTypeStyles = () => {
    switch (toast.type) {
      case "success":
        return "bg-green-900/80 border-green-700 text-green-100";
      case "error":
        return "bg-red-900/80 border-red-700 text-red-100";
      case "warning":
        return "bg-yellow-900/80 border-yellow-700 text-yellow-100";
      case "info":
      default:
        return "bg-blue-900/80 border-blue-700 text-blue-100";
    }
  };

  const getIcon = () => {
    if (toast.icon) return toast.icon;
    switch (toast.type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
      default:
        return "ℹ️";
    }
  };

  return (
    <div
      className={`
        pointer-events-auto
        border rounded-lg p-4 shadow-lg
        transition-all duration-300
        ${getTypeStyles()}
        ${
          isExiting ? "opacity-0 translate-x-full" : "opacity-100 translate-x-0"
        }
      `}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0">{getIcon()}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold wrap-break-word">{toast.message}</p>
          {toast.rewards && toast.rewards.length > 0 && (
            <div className="mt-2 space-y-1">
              {toast.rewards.map((reward, idx) => (
                <p key={idx} className="text-sm opacity-90">
                  {reward}
                </p>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => {
            setIsExiting(true);
            setTimeout(onClose, 300);
          }}
          className="shrink-0 text-lg opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
