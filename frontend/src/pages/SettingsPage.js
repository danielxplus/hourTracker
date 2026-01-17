import { useEffect, useState } from "react";
import { User, Banknote, LogOut, Check, X } from "lucide-react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();

  const [hourlyRate, setHourlyRate] = useState(51);
  const [overtimeHourlyRate, setOvertimeHourlyRate] = useState(63.75);
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSection, setSavedSection] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/settings");
        const fetchedRate = res.data.hourlyRate || 51;
        setHourlyRate(fetchedRate);

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
    if (val) {
      setOvertimeHourlyRate((parseFloat(val) * 1.25).toFixed(2));
    }
  }

  async function handleSaveSalary() {
    setIsSaving(true);
    try {
      await api.post("/settings", {
        hourlyRate: Number(hourlyRate),
        overtimeHourlyRate: Number(overtimeHourlyRate),
      });
      setSavedSection("salary");
      setTimeout(() => setSavedSection(""), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveName() {
    if (!displayName.trim()) return;
    setIsSaving(true);
    try {
      await api.post("/me/display-name", { displayName: displayName.trim() });
      await refreshUser();
      setSavedSection("name");
      setTimeout(() => setSavedSection(""), 2000);
    } catch {
      // ignore
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    setShowLogoutModal(false);
    await logout();
  }

  return (
      <Layout>
        <header className="mb-6 pt-2" dir="rtl">
          <h1 className="text-xl font-medium text-zinc-900">הגדרות</h1>
        </header>

        <div className="space-y-3" dir="rtl">
          {/* Display Name */}
          <div className="bg-white rounded-2xl border border-zinc-200/60 p-4 hover:border-emerald-200 transition-colors">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-emerald-600" />
                </div>
                <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
                    placeholder="שם תצוגה"
                />
              </div>
              <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={isSaving || !displayName.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium disabled:opacity-50 hover:bg-emerald-700 transition-colors flex-shrink-0 shadow-sm"
              >
                {savedSection === "name" ? <Check className="w-3.5 h-3.5" /> : "שמור"}
              </button>
            </div>
          </div>

          {/* Rates Section */}
          <div className="bg-white rounded-2xl border border-zinc-200/60 divide-y divide-zinc-100">
            <div className="p-4 hover:bg-emerald-50/30 transition-colors">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-sm text-zinc-700">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span>שכר שעתי</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                      type="number"
                      value={hourlyRate}
                      onChange={handleRateChange}
                      className="w-24 text-sm text-left bg-zinc-50 rounded-lg px-3 py-2 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                  />
                  <span className="text-xs text-zinc-400 font-medium">₪</span>
                </div>
              </div>
            </div>

            <div className="p-4 hover:bg-emerald-50/30 transition-colors">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-sm text-zinc-700">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span>שעות נוספות</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                      type="number"
                      step="0.1"
                      value={overtimeHourlyRate}
                      onChange={(e) => setOvertimeHourlyRate(e.target.value)}
                      className="w-24 text-sm text-left bg-zinc-50 rounded-lg px-3 py-2 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                  />
                  <span className="text-xs text-zinc-400 font-medium">₪</span>
                </div>
              </div>
            </div>
          </div>

          <button
              type="button"
              onClick={handleSaveSalary}
              disabled={isSaving}
              className="w-full rounded-xl bg-zinc-900 text-white py-3 text-sm font-medium shadow-sm disabled:opacity-50 hover:bg-emerald-700 transition-all active:scale-95"
          >
            {savedSection === "salary" ? "נשמר ✓" : "שמור שינויים"}
          </button>

          <div className="pt-2">
            <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                className="w-full rounded-xl border border-zinc-200 bg-white text-zinc-600 py-3 text-sm font-medium hover:bg-zinc-50 hover:border-zinc-300 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              התנתק
            </button>
          </div>
        </div>

        {/* Logout Confirmation Modal */}
        {showLogoutModal && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowLogoutModal(false)}>
              <div className="bg-white rounded-2xl w-full max-w-xs p-5" dir="rtl" onClick={(e) => e.stopPropagation()}>
                <div className="text-center mb-5">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                    <LogOut className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900 mb-1">התנתקות מהמערכת</h3>
                  <p className="text-sm text-zinc-500">האם אתה בטוח שברצונך להתנתק?</p>
                </div>
                <div className="flex gap-2">
                  <button
                      onClick={() => setShowLogoutModal(false)}
                      className="flex-1 py-3 rounded-xl font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                  >
                    ביטול
                  </button>
                  <button
                      onClick={handleLogout}
                      className="flex-1 bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 active:scale-95 transition-all"
                  >
                    התנתק
                  </button>
                </div>
              </div>
            </div>
        )}
      </Layout>
  );
}