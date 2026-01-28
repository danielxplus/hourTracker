import { Lock } from "lucide-react";

export default function PremiumLock({ message = "תכונה זו זמינה למשתמשי פרמיום בלבד" }) {
    return (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-30 p-6" dir="rtl">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4 shadow-lg">
                <Lock className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2 text-center">
                תכונת פרמיום
            </h3>
            <p className="text-sm text-zinc-600 text-center max-w-xs leading-relaxed">
                {message}
            </p>
            <button className="mt-4 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all active:scale-95">
                שדרג לפרמיום
            </button>
        </div>
    );
}
