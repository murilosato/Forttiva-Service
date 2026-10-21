
import React from 'react';
import { X, AlertTriangle, Trash2, HelpCircle, CheckCircle2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger'
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger': return <Trash2 className="text-rose-600" size={24} />;
      case 'warning': return <AlertTriangle className="text-amber-600" size={24} />;
      case 'success': return <CheckCircle2 className="text-emerald-600" size={24} />;
      default: return <HelpCircle className="text-blue-600" size={24} />;
    }
  };

  const getButtonClass = () => {
    switch (type) {
      case 'danger': return 'bg-rose-600 hover:bg-rose-700 text-white';
      case 'warning': return 'bg-[#0c2a1c] hover:bg-[#16462d] text-[#7ea24e] border border-[#7ea24e]/30';
      case 'success': return 'bg-[#16462d] hover:bg-[#0c2a1c] text-white';
      default: return 'bg-[#0c2a1c] hover:bg-[#16462d] text-white';
    }
  };

  return (
    <div className="fixed inset-0 bg-[#071a11]/70 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden border border-[#ded5c4]/60 animate-in zoom-in-95 duration-200">
        <div className="p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-[#f4f3ef] rounded-full flex items-center justify-center mb-2 border border-[#ded5c4]/40">
            {getIcon()}
          </div>
          
          <div className="space-y-2 min-w-0">
            <h3 className="text-lg font-black text-[#0c2a1c] uppercase tracking-tight truncate">{title}</h3>
            <p className="text-xs font-semibold text-slate-500 leading-relaxed uppercase opacity-80 break-words">{message}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <button 
              onClick={onClose}
              className="py-3.5 px-4 bg-[#f4f3ef] hover:bg-[#ded5c4]/60 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap truncate"
            >
              {cancelText}
            </button>
            <button 
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`py-3.5 px-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg whitespace-nowrap truncate ${getButtonClass()}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
