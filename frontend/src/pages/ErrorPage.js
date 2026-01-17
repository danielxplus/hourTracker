import { AlertCircle, Home, LogOut, Terminal } from "lucide-react";
import { useNavigate, useRouteError } from "react-router-dom";
import Layout from "../components/Layout";

export default function ErrorPage() {
    const navigate = useNavigate();
    const error = useRouteError();

    // Safe access to error properties (sometimes it's null or different shape)
    const errorStatus = error?.status || error?.statusCode || "Error";
    const errorMessage = error?.statusText || error?.message || "Unknown error occurred";

    const handleBootOut = async () => {
        try {
            // Tell server to kill the session (HttpOnly cookie)
            // use the new /api/logout endpoint
            await fetch('/api/logout', { method: 'POST' });
        } catch (e) {
            console.error("Logout failed", e);
        }

        // Clear Local Storage
        localStorage.clear();
        sessionStorage.clear();

        // Force reload to Login
        window.location.href = "/login";
    };

    return (
        <Layout hideNav>
            <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center" dir="rtl">

                {/* Icon Container */}
                <div className="w-24 h-24 bg-red-50 rounded-3xl border border-red-100 flex items-center justify-center mb-6 shadow-sm">
                    <AlertCircle className="w-10 h-10 text-red-400" />
                </div>

                {/* Title */}
                <h1 className="text-2xl font-semibold text-zinc-900 mb-2">
                    אופס! שגיאה {errorStatus}
                </h1>

                {/* User Friendly Description */}
                <p className="text-sm text-zinc-500 mb-6 max-w-xs leading-relaxed">
                    משהו השתבש בטעינת הנתונים.
                </p>

                {/* Technical Error Box */}
                <div className="w-full max-w-xs bg-zinc-50 border border-zinc-200 rounded-xl p-3 mb-8 text-left" dir="ltr">
                    <div className="flex items-center gap-2 mb-1">
                        <Terminal className="w-3 h-3 text-zinc-400" />
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Debug Info</span>
                    </div>
                    <code className="text-xs text-zinc-600 font-mono break-all">
                        {errorMessage}
                    </code>
                </div>

                {/* Buttons Container */}
                <div className="w-full max-w-xs space-y-3">
                    <button
                        onClick={() => navigate("/")}
                        className="w-full bg-zinc-900 text-white py-3.5 rounded-xl font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-zinc-200"
                    >
                        <Home className="w-4 h-4" />
                        חזרה למסך הבית
                    </button>

                    {/* "Boot Out" Button */}
                    <button
                        onClick={handleBootOut}
                        className="w-full bg-white border border-red-100 text-red-600 py-3.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-50 active:scale-95 transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        איפוס ויציאה (ניקוי נתונים)
                    </button>
                </div>
            </div>
        </Layout>
    );
}