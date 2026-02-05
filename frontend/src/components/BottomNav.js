import { Link, useLocation } from "react-router-dom";
import { Home, Clock, Settings } from "lucide-react";
import { useMemo } from "react";

const tabs = [
    { id: "/", label: "בית", icon: Home },
    { id: "/history", label: "היסטוריה", icon: Clock },
    { id: "/settings", label: "הגדרות", icon: Settings },
];

export default function BottomNav() {
    const location = useLocation();

    // Calculate active index based on current path
    const activeIndex = useMemo(() => {
        const index = tabs.findIndex(t => t.id === location.pathname);
        return index === -1 ? 0 : index;
    }, [location.pathname]);

    return (
        <nav className="fixed bottom-0 inset-x-0 pb-6 px-4 pointer-events-none z-50" dir="rtl">
            <div className="max-w-md mx-auto pointer-events-auto">
                <div
                    className="backdrop-blur-xl rounded-[28px] border border-skin-border-primary shadow-lg shadow-black/5"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--nav-bg), transparent 10%)' }}
                >
                    <div className="relative flex justify-around px-2 py-2">
                        {/* Animated Background Slider */}
                        <div
                            className="absolute top-2 bottom-2 rounded-[20px] shadow-sm transition-all duration-300 ease-out"
                            style={{
                                right: `${2 + activeIndex * (100 / tabs.length)}%`,
                                width: `${100 / tabs.length - 4}%`,
                                backgroundColor: 'var(--bg-primary)', // Use theme's primary bg (usually card color)
                            }}
                        />

                        {tabs.map((tab) => {
                            const isActive = location.pathname === tab.id;
                            const Icon = tab.icon;
                            return (
                                <Link
                                    key={tab.id}
                                    to={tab.id}
                                    className={[
                                        "relative flex flex-col items-center gap-1 px-6 py-2.5 rounded-[20px] transition-all duration-300 z-10 flex-1",
                                        isActive
                                            ? "text-skin-accent-primary"
                                            : "text-skin-text-tertiary hover:text-skin-text-primary active:scale-95",
                                    ].join(" ")}
                                >
                                    <Icon
                                        className={[
                                            "w-6 h-6 transition-all duration-300",
                                            isActive ? "scale-110" : ""
                                        ].join(" ")}
                                        strokeWidth={isActive ? 2.5 : 2}
                                    />
                                    <span className={[
                                        "text-[11px] font-semibold tracking-tight transition-all",
                                        isActive ? "opacity-100" : "opacity-70"
                                    ].join(" ")}>
                                        {tab.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </nav>
    );
}