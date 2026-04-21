import React from 'react';
import { ShieldAlert, Leaf, type LucideIcon } from 'lucide-react';
import Modal from './Modal';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'success';
  icon?: LucideIcon;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  icon: Icon = ShieldAlert
}) => {
  const getStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          border: 'border-rose-100',
          gradient: 'from-rose-50 via-white to-white',
          labelBorder: 'border-rose-200',
          labelText: 'text-rose-800',
          iconBg: 'bg-rose-100',
          iconColor: 'text-rose-600',
          buttonBg: 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/10'
        };
      case 'warning':
        return {
          border: 'border-amber-100',
          gradient: 'from-amber-50 via-white to-white',
          labelBorder: 'border-amber-200',
          labelText: 'text-amber-800',
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
          buttonBg: 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/10'
        };
      default:
        return {
          border: 'border-emerald-100',
          gradient: 'from-emerald-50 via-white to-white',
          labelBorder: 'border-emerald-200',
          labelText: 'text-emerald-800',
          iconBg: 'bg-emerald-100',
          iconColor: 'text-emerald-600',
          buttonBg: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/10'
        };
    }
  };

  const styles = getStyles();

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-xl">
      <div className="space-y-6">
        <div className={`rounded-2xl border ${styles.border} bg-gradient-to-br ${styles.gradient} p-6`}>
          <div className={`inline-flex items-center gap-2 rounded-full border ${styles.labelBorder} bg-white/80 px-3 py-1`}>
            <Leaf size={12} className={variant === 'danger' ? 'text-rose-700' : 'text-emerald-700'} />
            <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${styles.labelText}`}>AgriLink Confirmation</p>
          </div>
          
          <div className="mt-4 flex items-start gap-4">
            <div className={`mt-0.5 h-12 w-12 rounded-xl ${styles.iconBg} ${styles.iconColor} grid place-items-center shrink-0`}>
              <Icon size={24} />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-bold tracking-tight text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {message}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 px-1">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`inline-flex items-center justify-center gap-2 rounded-xl ${styles.buttonBg} px-6 py-3 text-sm font-semibold text-white transition-all shadow-lg active:scale-95`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
