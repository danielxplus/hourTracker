import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import StatCard from "../components/StatCard";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

function getGreeting(hour) {
  if (hour >= 5 && hour < 12) return "בוקר טוב";
  if (hour >= 12 && hour < 17) return "צהריים טובים";
  if (hour >= 17 && hour < 22) return "ערב טוב";
  return "לילה טוב";
}

export default function HomePage() {
  const { user, refreshUser } = useAuth();
  const [summary, setSummary] = useState(null);
  const [shiftTypes, setShiftTypes] = useState([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedShiftCode, setSelectedShiftCode] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [isOvertimeOpen, setIsOvertimeOpen] = useState(false);
  const [overtimeHours, setOvertimeHours] = useState("");
  const [overtimeRate, setOvertimeRate] = useState("");
  const [overtimeRateFromSettings, setOvertimeRateFromSettings] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        refreshUser();
        const [summaryRes, typesRes, settingsRes] = await Promise.all([
          api.get("/summary"),
          api.get("/shift-types"),
          api.get("/settings").catch(() => ({ data: { overtimeHourlyRate: 0 } })),
        ]);
        setSummary(summaryRes.data);
        setShiftTypes(typesRes.data);
        setOvertimeRateFromSettings(settingsRes.data.overtimeHourlyRate || 0);
      } catch (e) {
        // not logged in or server error
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return getGreeting(hour);
  }, []);

  const userName = user?.displayName || "אורח";

  async function refreshSummary() {
    try {
      const res = await api.get("/summary");
      setSummary(res.data);
    } catch {
      // ignore
    }
  }

  async function handleCreateShift() {
    if (!selectedShiftCode || !selectedDate) return;
    try {
      await api.post("/shifts", {
        shiftCode: selectedShiftCode,
        date: selectedDate,
        overtimeHours: overtimeHours ? Number(overtimeHours) : 0,
        overtimeHourlyRate: overtimeRate ? Number(overtimeRate) : (overtimeHours ? overtimeRateFromSettings : null),
      });
      setIsAddOpen(false);
      setIsOvertimeOpen(false);
      setOvertimeHours("");
      setOvertimeRate("");
      await refreshSummary();
      await refreshUser();
    } catch {
      // likely not logged in yet
    }
  }

  function formatDateForDisplay(dateStr) {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  return (
    <Layout>
      <header className="mb-6">
        <div className="flex flex-col gap-1 text-right">
          <h1 className="text-xl font-semibold text-slate-900">
            {greeting}, {userName}
          </h1>
          <p className="text-xs text-slate-500">
            {new Date().toLocaleDateString("he-IL", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </header>

      <section className="space-y-3 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            title="שעות החודש"
            value={(summary?.monthHours ?? 0).toFixed(1)}
            tone="green"
          />
          <StatCard
            title="שעות השבוע"
            value={(summary?.weekHours ?? 0).toFixed(1)}
            tone="primary"
          />
        </div>
        <StatCard
          title="משכורת צפויה לחודש"
          subtitle={`שכר לשעה ₪${summary?.hourlyRate ?? 0}`}
          value={`₪${(summary?.expectedMonthSalary ?? 0).toFixed(0)}`}
          tone="dark"
          align="center"
        />
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">
          משמרות אחרונות
        </h2>
        <div className="space-y-3">
          {(summary?.recentShifts ?? []).map((shift) => (
            <article
              key={shift.id}
              className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 flex items-center justify-between"
            >
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-amber-600 font-medium">
                  {shift.shiftType}
                </span>
                <span className="text-[10px] text-slate-500">
                  {new Date(shift.date).toLocaleDateString("he-IL")}
                </span>
              </div>
              <div className="flex flex-col items-start gap-1">
                <span className="text-xs text-slate-700">
                  שעות {shift.hours.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-500">
                  {shift.startTime} - {shift.endTime}
                </span>
              </div>
            </article>
          ))}
          {(summary?.recentShifts?.length ?? 0) === 0 && (
            <p className="text-xs text-slate-400 text-center">
              עדיין אין משמרות שמורות. התחבר כדי להתחיל לעקוב.
            </p>
          )}
        </div>
      </section>

      <button
        onClick={() => setIsAddOpen(true)}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 max-w-xs w-[72%] rounded-full bg-primary text-white py-3 text-sm font-semibold shadow-soft"
      >
        הוסף משמרת +
      </button>

      {isAddOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center z-20">
          <div className="bg-white rounded-t-3xl max-w-md w-full px-4 pt-4 pb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">
                הוספת משמרת
              </h2>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-xs text-slate-400"
              >
                סגירה
              </button>
            </div>

            <div className="mb-3">
              <label className="block text-xs text-slate-600 mb-1 text-right">
                תאריך
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-left"
              />
              <p className="text-[10px] text-slate-400 mt-1 text-right">
                {formatDateForDisplay(selectedDate)}
              </p>
            </div>

            <div className="mb-4">
              <p className="text-xs text-slate-600 mb-2 text-right">
                סוג משמרת
              </p>
              <div className="grid grid-cols-3 gap-2">
                {shiftTypes.map((t) => (
                  <button
                    key={t.code}
                    type="button"
                    onClick={() => setSelectedShiftCode(t.code)}
                    className={`rounded-2xl px-2 py-2 text-xs border text-center ${
                      selectedShiftCode === t.code
                        ? "bg-primary text-white border-primary"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    <div className="font-medium mb-1">{t.nameHe}</div>
                    <div className="text-[10px] text-slate-500">
                      {t.defaultStart} - {t.defaultEnd}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {!isOvertimeOpen && (
              <button
                type="button"
                onClick={() => setIsOvertimeOpen(true)}
                className="w-full mb-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 py-2 text-xs font-medium"
              >
                שעות נוספות
              </button>
            )}

            {isOvertimeOpen && (
              <div className="mb-4 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-600 text-right">שעות נוספות</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOvertimeOpen(false);
                      setOvertimeHours("");
                      setOvertimeRate("");
                    }}
                    className="text-[10px] text-slate-400"
                  >
                    הסר
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-slate-600 mb-1 text-right">
                      שעות נוספות
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={overtimeHours}
                      onChange={(e) => setOvertimeHours(e.target.value)}
                      className="rounded-xl border border-slate-200 px-2 py-1 text-sm text-left"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-slate-600 mb-1 text-right">
                      שכר לשעה
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={overtimeRate || overtimeRateFromSettings}
                      onChange={(e) => setOvertimeRate(e.target.value)}
                      className="rounded-xl border border-slate-200 px-2 py-1 text-sm text-left"
                      placeholder={overtimeRateFromSettings || "0"}
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleCreateShift}
              className="w-full rounded-2xl bg-primary text-white py-3 text-sm font-semibold shadow-soft disabled:opacity-50"
              disabled={!selectedShiftCode}
            >
              שמירת משמרת
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}


