import { useEffect, useState } from "react";
import { User, DollarSign, LogOut, Save, UserCircle } from "lucide-react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();

  const [hourlyRate, setHourlyRate] = useState(51);
  const [overtimeHourlyRate, setOvertimeHourlyRate] = useState(63.75);
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/settings");
        // Backend now defaults to 51/63.75 for new users, but we also handled 0.0 case in backend.
        // We use 'hourlyRate' as per backend API, NOT 'baseHourlyRate'.
        const fetchedRate = res.data.hourlyRate || 51;
        setHourlyRate(fetchedRate);

        // If overtime is missing or 0, auto-calc, otherwise use fetched
        const fetchedOvertime = res.data.overtimeHourlyRate;
        if (!fetchedOvertime) {
          setOvertimeHourlyRate(fetchedRate * 1.25);
        } else {
          setOvertimeHourlyRate(fetchedOvertime);
        }

        if (user) {
          setDisplayName(user.displayName || "");
        }
      } catch {
        // quiet fail
      }
    }
    load();
  }, [user]);

  function handleRateChange(e) {
    const val = e.target.value;
    setHourlyRate(val);
    // Auto-calculate overtime when base rate changes (optional UX choice, highly requested)
    if (val) {
      setOvertimeHourlyRate((parseInt(val) * 1.25).toFixed(2));
    }
  }

  async function handleSaveSalary() {
    setIsSaving(true);
    try {
      await api.post("/settings", {
        hourlyRate: Number(hourlyRate),
        overtimeHourlyRate: Number(overtimeHourlyRate),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveName() {
    if (!displayName.trim()) return;
    setIsSavingName(true);
    try {
      await api.post("/me/display-name", { displayName: displayName.trim() });
      await refreshUser();
    } catch {
      // ignore
    } finally {
      setIsSavingName(false);
    }
  }

  return (
    <Layout>
      <header className="mb-8 text-right">
        <h1 className="text-2xl font-bold text-slate-900">
          הגדרות
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          ניהול פרופיל והגדרות שכר
        </p>
      </header>

      <div className="space-y-6 text-right" dir="rtl">
        {/* Profile Card */}
        <section className="bg-white rounded-3xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
          <div className="px-6 pt-6 pb-3 border-b border-slate-50">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-violet-50 rounded-xl">
                <UserCircle className="w-5 h-5 text-violet-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">שם תצוגה</h2>
            </div>
          </div>

          <div className="px-6 pb-6 pt-3">
            <div className="flex gap-3">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 text-right text-sm rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 block w-full p-3 outline-none transition-all"
                placeholder="הכנס שם מלא"
              />
              <button
                onClick={handleSaveName}
                disabled={isSavingName || !displayName.trim()}
                className="px-6 py-3 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-90 transition-all shadow-md shadow-violet-200 whitespace-nowrap min-w-[6rem]"
              >
                שמור
              </button>
            </div>
          </div>
        </section>

        {/* Salary Settings Card */}
        <section className="bg-white rounded-3xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-emerald-50 rounded-xl">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">הגדרות שכר</h2>
            </div>
          </div>

          <div className="px-6 pb-6 pt-3 space-y-6">
            {/* Hourly Rate */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 text-right">
                שכר שעתי (בסיס)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  value={hourlyRate}
                  onChange={handleRateChange}
                  className="bg-slate-50 border border-slate-200 text-slate-900 text-right text-lg font-medium rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 block w-full p-4 pr-12 outline-none transition-all"
                  placeholder="51"
                  dir="ltr"
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <span className="text-slate-400 font-medium">₪</span>
                </div>
              </div>
            </div>

            {/* Overtime Rate */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 text-right">
                שכר שעות נוספות
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={overtimeHourlyRate}
                  onChange={(e) => setOvertimeHourlyRate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-900 text-right text-lg font-medium rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 block w-full p-4 pr-12 outline-none transition-all"
                  placeholder="63.75"
                  dir="ltr"
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <span className="text-slate-400 font-medium">₪</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveSalary}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-semibold py-4 rounded-xl shadow-md shadow-emerald-200 transition-all disabled:opacity-90"
            >
              <Save className="w-5 h-5" />
              שמור הגדרות שכר
            </button>
          </div>
        </section>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="w-full bg-white border border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 font-medium rounded-2xl py-4 flex items-center justify-center gap-2 transition-all"
        >
          <LogOut className="w-5 h-5" />
          התנתק מהמערכת
        </button>

        <p className="text-center text-xs text-slate-300 mt-8">
          HourTracker v1.0.0 © by dxp
        </p>
      </div>
    </Layout>
  );
}


