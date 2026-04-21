import React from 'react';
import { LogOut, ShieldAlert, Leaf } from 'lucide-react';
import Modal from './Modal';

interface LogoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({ isOpen, onClose, onConfirm }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-xl">
      <div className="space-y-5">
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1">
            <Leaf size={12} className="text-emerald-700" />
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-800">AgriLink Confirmation</p>
          </div>
          <div className="mt-3 flex items-start gap-3">
            <div className="mt-0.5 h-11 w-11 rounded-xl bg-rose-100 text-rose-700 grid place-items-center shrink-0">
              <ShieldAlert size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-bold tracking-tight text-slate-900">Confirm Sign Out</h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">
                You are about to end your current AgriLink session on this device.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-900">
          Please ensure any unsaved changes are saved before proceeding.
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Confirm Sign Out
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default LogoutConfirmationModal;
