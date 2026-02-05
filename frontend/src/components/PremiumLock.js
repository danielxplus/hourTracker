import { Lock } from "lucide-react";

export default function PremiumLock({ message = "תכונה זו זמינה למשתמשי פרמיום בלבד" }) {
    return (
        <div className="absolute inset-0 bg-skin-card-bg/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-30 p-6" dir="rtl">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4 shadow-lg">
                <Lock className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-skin-text-primary mb-2 text-center">
                תכונת פרמיום
            </h3>
            <p className="text-sm text-skin-text-secondary text-center max-w-xs leading-relaxed">
                {message}
            </p>
            <p className="text-sm text-skin-text-secondary text-center max-w-xs leading-relaxed">
                לרכישת פרמיום שלחו הודעה ל-0506425121
            </p>
        </div>
    );
}
