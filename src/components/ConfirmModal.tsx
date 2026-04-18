import React, { useEffect } from 'react';
import { AlertCircle, Trash2, CheckCircle2, Info } from 'lucide-react';

export type ConfirmModalType = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: ConfirmModalType;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  type = 'warning',
  onConfirm,
  onCancel,
  isLoading = false
}: ConfirmModalProps) {
  
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const icons = {
    danger: <Trash2 className="w-6 h-6 text-red-600" />,
    warning: <AlertCircle className="w-6 h-6 text-amber-600" />,
    info: <Info className="w-6 h-6 text-blue-600" />,
    success: <CheckCircle2 className="w-6 h-6 text-green-600" />
  };

  const bgColors = {
    danger: 'bg-red-100',
    warning: 'bg-amber-100',
    info: 'bg-blue-100',
    success: 'bg-green-100'
  };

  const btnColors = {
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    success: 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      <div 
        className="fixed inset-0 transition-opacity bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={!isLoading ? onCancel : undefined}
      />
      
      <div className="relative z-10 w-full max-w-sm overflow-hidden transition-all transform bg-white rounded-3xl shadow-2xl sm:my-8 sm:w-full animate-in zoom-in-95 duration-200">
        <div className="px-4 pt-5 pb-4 bg-white sm:p-6 sm:pb-4">
          <div className="sm:flex sm:items-start">
            <div className={`flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto rounded-full sm:mx-0 sm:h-10 sm:w-10 ${bgColors[type]}`}>
              {icons[type]}
            </div>
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <h3 className="text-lg font-semibold leading-6 text-slate-900" id="modal-title">
                {title}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-slate-500">
                  {description}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="px-4 py-3 bg-slate-50/80 sm:flex sm:flex-row-reverse sm:px-6 gap-2 border-t border-slate-100">
          <button
            type="button"
            disabled={isLoading}
            className={`inline-flex justify-center items-center w-full px-5 py-2.5 text-sm font-semibold text-white transition-colors rounded-xl shadow-sm sm:w-auto sm:text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed ${btnColors[type]}`}
            onClick={onConfirm}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              confirmLabel
            )}
          </button>
          <button
            type="button"
            disabled={isLoading}
            className="inline-flex justify-center items-center w-full px-5 py-2.5 mt-3 text-sm font-semibold transition-colors bg-white border border-slate-200 rounded-xl text-slate-700 shadow-sm hover:bg-slate-50 sm:mt-0 sm:w-auto sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
