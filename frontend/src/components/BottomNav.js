import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/", label: "בית", icon: "🏠", exact: true },
  { to: "/history", label: "היסטוריה", icon: "⏱️" },
  { to: "/settings", label: "הגדרות", icon: "⚙️" },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur border-t border-slate-200">
      <div className="max-w-md mx-auto flex justify-between px-6 py-2">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.exact}
            className={({ isActive }) =>
              [
                "flex flex-col items-center justify-center text-xs transition-colors",
                isActive ? "text-primary" : "text-slate-400",
              ].join(" ")
            }
          >
            <span className="text-lg mb-0.5">{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}


