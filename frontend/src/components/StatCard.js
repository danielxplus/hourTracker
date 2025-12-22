export default function StatCard({
  title,
  subtitle,
  value,
  tone = "primary",
  align = "right",
}) {
  const toneClasses =
    tone === "primary"
      ? "from-primary to-primary-soft"
      : tone === "green"
      ? "from-emerald-500 to-emerald-400"
      : "from-slate-800 to-slate-900";

  const textAlign = align === "center" ? "text-center" : "text-right";

  return (
    <div
      className={`rounded-3xl bg-gradient-to-br ${toneClasses} text-white shadow-soft p-4`}
    >
      <div className={`flex flex-col gap-1 ${textAlign}`}>

        <span className="text-sm font-medium leading-none">{title}</span>
        <span className="mt-2 text-3xl font-semibold leading-tight">
          {value}
        </span>
        {subtitle && (
            <span className="text-xs text-white/80 leading-none">{subtitle}</span>
        )}
      </div>
    </div>
  );
}



