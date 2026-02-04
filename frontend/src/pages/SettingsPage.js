import { useEffect, useState } from "react";
import { User, Banknote, LogOut, Check, X, Palette, Lock } from "lucide-react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import api from "../api/client";
import PremiumLock from '../components/PremiumLock';

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const { currentTheme, updateTheme, themes } = useTheme();

  const [hourlyRate, setHourlyRate] = useState(51);
  const [overtimeHourlyRate, setOvertimeHourlyRate] = useState(63.75);
  const [shabatHourlyRate, setShabatHourlyRate] = useState(76.5);
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSection, setSavedSection] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumExpiresAt, setPremiumExpiresAt] = useState(null);

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

        const fetchedShabat = res.data.shabatHourlyRate;
        if (!fetchedShabat) {
          setShabatHourlyRate(fetchedRate * 1.5);
        } else {
          setShabatHourlyRate(fetchedShabat);
        }

        setIsPremium(res.data.isPremium ?? false);
        setPremiumExpiresAt(res.data.premiumExpiresAt);

        if (user) {
          setDisplayName(user.displayName || "");
        }
      } catch {
        // quiet fail
      }
    }
    load();
  }, [user, refreshUser]); // added refreshUser to dependency if needed, though usually stable

  function handleRateChange(e) {
    const val = e.target.value;
    setHourlyRate(val);
    if (val) {
      setOvertimeHourlyRate((parseFloat(val) * 1.25).toFixed(2));
      setShabatHourlyRate((parseFloat(val) * 1.5).toFixed(2));
    }
  }

  async function handleSaveSalary() {
    setIsSaving(true);
    try {
      await api.post("/settings", {
        hourlyRate: Number(hourlyRate),
        overtimeHourlyRate: Number(overtimeHourlyRate),
        shabatHourlyRate: Number(shabatHourlyRate),
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
        <h1 className="text-xl font-medium text-skin-text-primary">הגדרות</h1>
      </header>

      <div className="space-y-3" dir="rtl">
        {/* Display Name */}
        <div className="bg-skin-card-bg rounded-2xl border border-skin-border-secondary p-4 hover:border-skin-accent-primary focus-ring-accent transition-all">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full bg-skin-accent-primary-bg flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-skin-accent-primary" />
              </div>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1 bg-transparent text-sm text-skin-text-primary placeholder:text-skin-text-tertiary focus:outline-none"
                placeholder="שם תצוגה"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveName}
              disabled={isSaving || !displayName.trim()}
              className="px-3.5 py-1.5 rounded-lg bg-skin-accent-primary text-white text-xs font-medium disabled:opacity-50 hover:opacity-90 transition-colors flex-shrink-0 shadow-sm"
            >
              {savedSection === "name" ? <Check className="w-3.5 h-3.5" /> : "שמור"}
            </button>
          </div>
        </div>

        {/* Rates Section */}
        <div className="bg-skin-card-bg rounded-2xl border border-skin-border-secondary divide-y divide-skin-border-secondary">
          <div className="p-4 hover:bg-skin-bg-secondary transition-colors">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-sm text-skin-text-secondary">
                <Banknote className="w-4 h-4 text-skin-accent-primary" />
                <span>שכר שעתי</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={handleRateChange}
                  className="w-24 text-sm text-left bg-skin-bg-secondary rounded-lg px-3 py-2 border border-skin-border-secondary transition-all text-skin-text-primary focus-ring-accent"
                />
                <span className="text-xs text-skin-text-tertiary font-medium">₪</span>
              </div>
            </div>
          </div>

          <div className="p-4 hover:bg-skin-bg-secondary transition-colors">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-sm text-skin-text-secondary">
                <Banknote className="w-4 h-4 text-skin-accent-primary" />
                <span>שעות נוספות</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={overtimeHourlyRate}
                  onChange={(e) => setOvertimeHourlyRate(e.target.value)}
                  className="w-24 text-sm text-left bg-skin-bg-secondary rounded-lg px-3 py-2 border border-skin-border-secondary transition-all text-skin-text-primary focus-ring-accent"
                />
                <span className="text-xs text-skin-text-tertiary font-medium">₪</span>
              </div>
            </div>
          </div>

          <div className="p-4 hover:bg-skin-bg-secondary transition-colors">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-sm text-skin-text-secondary">
                <Banknote className="w-4 h-4 text-skin-accent-primary" />
                <span>שכר שבת (150%)</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={shabatHourlyRate}
                  onChange={(e) => setShabatHourlyRate(e.target.value)}
                  className="w-24 text-sm text-left bg-skin-bg-secondary rounded-lg px-3 py-2 border border-skin-border-secondary transition-all text-skin-text-primary focus-ring-accent"
                />
                <span className="text-xs text-skin-text-tertiary font-medium">₪</span>
              </div>
            </div>
          </div>
        </div>

        {/* Theme Selection */}
        <div className="bg-skin-card-bg rounded-2xl border border-skin-border-secondary p-4 relative overflow-hidden">
          {!isPremium && <PremiumLock message="התאמה אישית של ערכת הנושא זמינה למשתמשי פרמיום בלבד" />}
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-skin-accent-primary" />
            <h3 className="text-sm font-medium text-skin-text-primary">ערכת נושא</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(themes).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => updateTheme(key)}
                disabled={!isPremium && key !== 'default'}
                className={`relative p-3 rounded-xl border-2 transition-all ${currentTheme === key
                  ? 'border-skin-accent-primary bg-skin-accent-primary-bg'
                  : 'border-skin-border-primary hover:border-skin-border-secondary'
                  }`}
              >
                <div className="flex flex-col items-start gap-2">
                  <div className="flex items-center gap-2 w-full">
                    <div className="text-sm font-medium text-skin-text-primary">{theme.name}</div>
                    {currentTheme === key && (
                      <Check className="w-4 h-4 text-skin-accent-primary mr-auto" />
                    )}
                  </div>
                  <div className="text-xs text-skin-text-secondary text-right">{theme.description}</div>
                  {/* Theme preview */}
                  <div className="flex gap-1 mt-1">
                    <div
                      className="w-6 h-6 rounded border border-skin-border-primary"
                      style={{ backgroundColor: theme.vars['--bg-primary'] }}
                    />
                    <div
                      className="w-6 h-6 rounded border border-skin-border-primary"
                      style={{ backgroundColor: theme.vars['--accent-primary'] }}
                    />
                    <div
                      className="w-6 h-6 rounded border border-skin-border-primary"
                      style={{ backgroundColor: theme.vars['--accent-secondary'] }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveSalary}
          disabled={isSaving || Number(hourlyRate) <= 0}
          className="w-full rounded-xl bg-skin-accent-primary text-white py-3 text-sm font-medium shadow-sm disabled:opacity-50 hover:opacity-90 transition-all active:scale-95"
        >
          {savedSection === "salary" ? "נשמר ✓" : "שמור שינויים"}
        </button>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full rounded-xl border border-skin-border-secondary bg-skin-card-bg text-skin-text-secondary py-3 text-sm font-medium hover:bg-skin-bg-secondary hover:border-skin-border-primary transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> התנתק
          </button>
        </div>
      </div>
      <div className="pt-2">
        <div className="text-center text-xs text-skin-text-secondary">
          {isPremium ? (
            <div className="mb-2">
              משתמש פרמיום בתוקף עד: {premiumExpiresAt ? new Date(premiumExpiresAt).toLocaleDateString('he-IL') : 'תאריך לא ידוע'}
            </div>
          ) : (
            <div className="mb-2">משתמש חינמי. לרכישת פרמיום שלחו הודעה ל-0506425121</div>
          )}

        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-skin-modal-overlay backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowLogoutModal(false)}>
          <div className="bg-skin-card-bg rounded-2xl w-full max-w-xs p-5" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                <LogOut className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-skin-text-primary mb-1">התנתקות מהמערכת</h3>
              <p className="text-sm text-skin-text-secondary">האם את/ה בטוח/ה שברצונך להתנתק?</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 rounded-xl font-medium text-skin-text-secondary hover:bg-skin-bg-secondary transition-colors"
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