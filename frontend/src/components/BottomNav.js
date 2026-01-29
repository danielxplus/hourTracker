import { NavLink } from "react-router-dom";
import { Home, Clock, Settings } from "lucide-react";

const tabs = [
    { to: "/", label: "בית", icon: Home, exact: true },
    { to: "/history", label: "היסטוריה", icon: Clock },
    { to: "/settings", label: "הגדרות", icon: Settings },
];

export default function BottomNav() {
    return (
        <nav className="fixed bottom-0 inset-x-0 bg-skin-nav-bg backdrop-blur-xl border-t border-skin-border-secondary">
            <div className="max-w-md mx-auto flex justify-around px-4 py-3">
                {tabs.map((tab) => (
                    <NavLink
                        key={tab.to}
                        to={tab.to}
                        end={tab.exact}
                        className={({ isActive }) =>
                            [
                                "relative flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all duration-200",
                                isActive
                                    ? "text-skin-accent-primary"
                                    : "text-skin-text-tertiary hover:text-skin-text-primary",
                            ].join(" ")
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <div className="absolute inset-0 bg-skin-bg-secondary rounded-xl -z-10" />
                                )}
                                <tab.icon
                                    className={[
                                        "w-5 h-5 transition-transform duration-200",
                                        isActive ? "scale-110" : ""
                                    ].join(" ")}
                                    strokeWidth={isActive ? 2.5 : 2}
                                />
                                <span className={[
                                    "text-xs font-medium transition-all",
                                    isActive ? "opacity-100" : "opacity-80"
                                ].join(" ")}>
                                    {tab.label}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}