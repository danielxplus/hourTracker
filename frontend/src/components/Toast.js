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
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
            <div className={`${bgClass} text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[280px] max-w-[90vw]`} dir="rtl">
                <div className="bg-white/20 p-1.5 rounded-xl">
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm font-medium flex-1">{message}</p>
                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
