import React from 'react';
import { AlertCircle, X } from 'lucide-react';

export default function AlertModal({ isOpen, title, message, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-skin-modal-overlay backdrop-blur-sm flex items-center justify-center z-[110] p-4">
            <div className="bg-skin-card-bg rounded-3xl w-full max-w-sm shadow-2xl border border-skin-border-secondary/50 p-6 animate-in fade-in zoom-in duration-200" dir="rtl">
                <div className="flex flex-col items-center text-center">
                    <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-bold text-skin-text-primary mb-2">{title}</h3>
                    <p className="text-sm text-skin-text-secondary leading-relaxed mb-6">
                        {message}
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full bg-skin-text-primary text-skin-bg-primary py-3.5 rounded-2xl font-bold active:scale-95 transition-all shadow-lg hover:opacity-90"
                    >
                        הבנתי
                    </button>
                </div>
            </div>
        </div>
    );
}
