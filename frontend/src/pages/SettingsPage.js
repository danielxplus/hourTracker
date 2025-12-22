import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [hourlyRate, setHourlyRate] = useState(0);
  const [overtimeHourlyRate, setOvertimeHourlyRate] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/settings");
        setHourlyRate(res.data.hourlyRate ?? 0);
        setOvertimeHourlyRate(res.data.overtimeHourlyRate ?? 0);
        if (user) {
          setDisplayName(user.displayName || "");
        }
      } catch {
        // ignore
      }
    }
    load();
  }, [user]);

  async function handleSave() {
    setIsSaving(true);
    try {
      await api.post("/settings", {
        hourlyRate: Number(hourlyRate),
        overtimeHourlyRate: Number(overtimeHourlyRate),
      });
    } catch {
      // ignore for now
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
    } catch {
      // ignore
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
  }

  return (
    <Layout>
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 text-right">
          הגדרות
        </h1>
        <p className="text-xs text-slate-500 text-right">
          נהל את פרטי השכר שלך
        </p>
      </header>

      <section className="space-y-4">
        <div className="rounded-3xl bg-white shadow-soft p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm font-medium text-slate-800">
                שם תצוגה
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-32 rounded-xl border border-slate-200 px-3 py-1 text-sm text-right"
                placeholder="הזן שם"
              />
              <button
                type="button"
                onClick={handleSaveName}
                disabled={isSaving || !displayName.trim()}
                className="rounded-xl bg-primary text-white px-3 py-1 text-xs font-medium disabled:opacity-50"
              >
                שמור
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white shadow-soft p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm font-medium text-slate-800">
                שכר שעתי
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">₪</span>
              <input
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="w-20 rounded-xl border border-slate-200 px-2 py-1 text-sm text-left"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100">
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm font-medium text-slate-800">
                שכר שעות נוספות
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">₪</span>
              <input
                type="number"
                value={overtimeHourlyRate}
                onChange={(e) => setOvertimeHourlyRate(e.target.value)}
                className="w-20 rounded-xl border border-slate-200 px-2 py-1 text-sm text-left"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full rounded-2xl bg-primary text-white py-3 text-sm font-semibold shadow-soft disabled:opacity-50"
        >
          שמירת הגדרות
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-2xl border border-red-200 bg-red-50 text-red-600 py-3 text-sm font-semibold"
        >
          התנתק
        </button>
      </section>
    </Layout>
  );
}


