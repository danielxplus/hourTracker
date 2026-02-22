import React from 'react';
import { HelpCircle, X } from 'lucide-react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = "אישור", cancelText = "ביטול", isDestructive = false }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-skin-modal-overlay backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={onCancel}>
            <div className="bg-skin-card-bg rounded-3xl w-full max-w-sm shadow-2xl border border-skin-border-secondary/50 p-6 animate-in fade-in zoom-in duration-200" dir="rtl" onClick={(e) => e.stopPropagation()}>
                <div className="flex flex-col items-center text-center">
                    <div className={`w-14 h-14 ${isDestructive ? 'bg-red-50' : 'bg-skin-accent-primary-bg'} rounded-2xl flex items-center justify-center mb-4`}>
                        <HelpCircle className={`w-8 h-8 ${isDestructive ? 'text-red-500' : 'text-skin-accent-primary'}`} />
                    </div>
                    <h3 className="text-lg font-bold text-skin-text-primary mb-2">{title}</h3>
                    <p className="text-sm text-skin-text-secondary leading-relaxed mb-6">
                        {message}
                    </p>
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onCancel}
                            className="flex-1 bg-skin-bg-secondary text-skin-text-primary py-3 rounded-2xl font-bold active:scale-95 transition-all hover:bg-skin-bg-primary"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`flex-1 ${isDestructive ? 'bg-red-600' : 'bg-skin-accent-primary'} text-white py-3 rounded-2xl font-bold active:scale-95 transition-all shadow-lg hover:opacity-90`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
