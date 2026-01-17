import { AlertCircle, Home, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

export default function ErrorPage() {
    const navigate = useNavigate();

    return (
        <Layout>
            <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center" dir="rtl">

                {/* Icon Container - Same style as your shift type icons */}
                <div className="w-24 h-24 bg-zinc-50 rounded-3xl border border-zinc-200 flex items-center justify-center mb-6 shadow-sm">
                    <AlertCircle className="w-10 h-10 text-zinc-400" />
                </div>

                {/* Title */}
                <h1 className="text-2xl font-semibold text-zinc-900 mb-3">
                    אופס! משהו השתבש
                </h1>

                {/* Description */}
                <p className="text-sm text-zinc-500 mb-8 max-w-xs leading-relaxed">
                    הדף שחיפשת לא קיים, או שנתקלנו בבעיה בטעינת הנתונים.
                </p>

                {/* Buttons Container */}
                <div className="w-full max-w-xs space-y-3">

                    {/* Primary Button - Matches your "Save" button */}
                    <button
                        onClick={() => navigate("/")}
                        className="w-full bg-zinc-900 text-white py-3.5 rounded-xl font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-zinc-200"
                    >
                        <Home className="w-4 h-4" />
                        חזרה למסך הבית
                    </button>

                    {/* Secondary Button - Matches your "Cancel" style */}
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-white border border-zinc-200 text-zinc-700 py-3.5 rounded-xl font-medium flex items-center justify-center gap-2 active:bg-zinc-50 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        רענון עמוד
                    </button>
                </div>
            </div>
        </Layout>
    );
}