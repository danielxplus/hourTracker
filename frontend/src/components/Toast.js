import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose, duration = 3000 }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const bgClass = type === 'success' ? 'bg-skin-accent-primary' : 'bg-red-600';
    const Icon = type === 'success' ? CheckCircle : AlertCircle;

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 transform translate-y-0 opacity-100">
            <div className={`${bgClass} text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[300px] max-w-[90vw] border border-white/10`} dir="rtl">
                <div className="bg-white/20 p-2 rounded-xl">
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold">{message}</p>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors ml-1"
                >
                    <X className="w-4 h-4 text-white/80" />
                </button>
            </div>
        </div>
    );
}
