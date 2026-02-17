import { useEffect, useState } from "react";
import { User, Banknote, LogOut, Check, X, Palette, Lock, Briefcase, Plus, Trash2, Edit2, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useWorkplace } from "../context/WorkplaceContext";
import api from "../api/client";
import PremiumLock from '../components/PremiumLock';

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const { currentTheme, updateTheme, themes } = useTheme();
  const {
    workplaces,
    templates,
    activeWorkplaceId,
    setActiveWorkplaceId,
    refreshWorkplaces,
    selectTemplate
  } = useWorkplace();

  const [hourlyRate, setHourlyRate] = useState(51);
  const [overtimeHourlyRate, setOvertimeHourlyRate] = useState(63.75);
  const [shabatHourlyRate, setShabatHourlyRate] = useState(76.5);
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSection, setSavedSection] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumExpiresAt, setPremiumExpiresAt] = useState(null);

  // Net Salary Predictor Settings
  const [paysTax, setPaysTax] = useState(true);
  const [pensionEnabled, setPensionEnabled] = useState(true);
  const [studyFundEnabled, setStudyFundEnabled] = useState(false);
  const [isFemale, setIsFemale] = useState(false);
  const [isExSoldier, setIsExSoldier] = useState(false);
  const [dischargeDate, setDischargeDate] = useState("");
  const [deductionsSaved, setDeductionsSaved] = useState(false);

  // Workplace Modal State
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/settings");
        setIsPremium(res.data.isPremium ?? false);
        setPremiumExpiresAt(res.data.premiumExpiresAt);

        // Load deduction settings
        setPaysTax(res.data.paysTax ?? true);
        setPensionEnabled(res.data.pensionEnabled ?? true);
        setStudyFundEnabled(res.data.studyFundEnabled ?? false);
        setIsFemale(res.data.isFemale ?? false);
        setIsExSoldier(res.data.isExSoldier ?? false);
        setDischargeDate(res.data.dischargeDate || "");

        if (user) {
          setDisplayName(user.displayName || "");
        }
      } catch {
        // quiet fail
      }
    }
    load();
  }, [user, refreshUser]);

  // Update stats when active workplace changes
  useEffect(() => {
    if (activeWorkplaceId && workplaces.length > 0) {
      const active = workplaces.find(w => w.id === activeWorkplaceId);
      if (active) {
        setHourlyRate(active.hourlyRate || 0);
        setOvertimeHourlyRate(active.overtimeHourlyRate || 0);
        setShabatHourlyRate(active.shabatHourlyRate || 0);
      }
    }
  }, [activeWorkplaceId, workplaces]);

  const activeWorkplace = workplaces.find(w => w.id === activeWorkplaceId);

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
      if (activeWorkplaceId) {
        // Update Active Workplace
        const wp = workplaces.find(w => w.id === activeWorkplaceId);
        await api.put(`/workplaces/${activeWorkplaceId}`, {
          name: wp?.name,
          color: wp?.color,
          hourlyRate: Number(hourlyRate),
          overtimeHourlyRate: Number(overtimeHourlyRate),
          shabatHourlyRate: Number(shabatHourlyRate),
          isDefault: wp?.isDefault
        });
        refreshWorkplaces();
      }
      setSavedSection("salary");
      setTimeout(() => setSavedSection(""), 2000);
    } catch (e) {
      console.error(e);
      alert("שגיאה בשמירה");
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

  // Workplace Handlers
  const handleSelectTemplate = async (templateId) => {
    try {
      await selectTemplate(templateId);
      setIsSelectionModalOpen(false);
    } catch (error) {
      console.error("Workplace selection full error object:", error);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
      }
      const serverError = error.response?.data?.error;
      const msg = serverError ? `שגיאה: ${serverError}` : "שגיאה בבחירת מקום עבודה. אנא נסה שוב או בדוק את לוג השרת.";
      alert(msg);
    }
  };

  const handleDeleteWorkplace = async (id) => {
    if (!window.confirm("האם למחוק את מקום העבודה?")) return;
    try {
      await api.delete(`/workplaces/${id}`);
      refreshWorkplaces();
    } catch (error) {
      console.error(error);
      alert("שגיאה במחיקה");
    }
  };

  // Auto-save deduction settings
  async function handleSaveDeduction(updates) {
    try {
      await api.post("/settings", updates);
      setDeductionsSaved(true);
      setTimeout(() => setDeductionsSaved(false), 1500);
    } catch (e) {
      console.error(e);
    }
  }


  return (
    <>
      <header className="mb-6 pt-2" dir="rtl">
        <h1 className="text-xl font-medium text-skin-text-primary mb-0.5">הגדרות</h1>
      </header>

      <div className="space-y-3 pb-8" dir="rtl">

        {/* Display Name */}
        <div className="bg-skin-card-bg rounded-2xl border border-skin-border-secondary p-4 hover:border-skin-accent-primary focus-ring-accent transition-all shadow-sm">
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

        {/* Active Workplace Card */}
        <div className="bg-skin-card-bg rounded-2xl border border-skin-border-secondary overflow-hidden shadow-sm">
          <div className="p-4 bg-skin-accent-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-skin-accent-primary" />
                <h3 className="text-sm font-medium text-skin-text-primary">מקום עבודה פעיל</h3>
              </div>
              <button
                onClick={() => setIsSelectionModalOpen(true)}
                className="text-xs font-medium text-skin-accent-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> החלף / הוסף
              </button>
            </div>
          </div>

          <div className="p-4">
            {activeWorkplace ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: activeWorkplace.color }}></div>
                  <div>
                    <div className="text-base font-semibold text-skin-text-primary">{activeWorkplace.name}</div>
                    {activeWorkplace.isLocked && (
                      <div className="flex items-center gap-1 text-[10px] text-skin-text-tertiary mt-0.5">
                        <Lock className="w-3 h-3" /> הגדרות משמרת נעולות (פרופיל קבוע)
                      </div>
                    )}
                  </div>
                </div>
                <select
                  value={activeWorkplaceId || ""}
                  onChange={(e) => setActiveWorkplaceId(Number(e.target.value))}
                  className="bg-skin-bg-secondary border border-skin-border-secondary rounded-lg px-3 py-1.5 text-xs text-skin-text-primary focus:outline-none transition-all appearance-none"
                >
                  {workplaces.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-skin-text-secondary mb-3">לא נבחר מקום עבודה</p>
                <button
                  onClick={() => setIsSelectionModalOpen(true)}
                  className="px-4 py-2 bg-skin-accent-primary text-white rounded-xl text-xs font-medium"
                >
                  בחר מקום עבודה ראשון
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Rates Section */}
        <div className="bg-skin-card-bg rounded-2xl border border-skin-border-secondary divide-y divide-skin-border-secondary shadow-sm overflow-hidden">
          <div className="p-4 bg-skin-accent-primary/5">
            <div className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-skin-accent-primary" />
              <h3 className="text-xs font-semibold text-skin-text-primary uppercase tracking-wider">שכר ותעריפים</h3>
            </div>
            <p className="text-[10px] text-skin-text-tertiary mt-1">התעריפים משתנים עבור מקום העבודה הנבחר</p>
          </div>

          <div className="p-4 hover:bg-skin-bg-secondary transition-colors">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-sm text-skin-text-secondary">
                <span>₪ שכר שעתי</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={handleRateChange}
                  className="w-24 text-sm text-left bg-skin-bg-secondary rounded-lg px-3 py-2 border border-skin-border-secondary transition-all text-skin-text-primary focus-ring-accent"
                />
              </div>
            </div>
          </div>

          <div className="p-4 hover:bg-skin-bg-secondary transition-colors">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-sm text-skin-text-secondary">
                <span>₪ שעות נוספות (125%)</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={overtimeHourlyRate}
                  onChange={(e) => setOvertimeHourlyRate(e.target.value)}
                  className="w-24 text-sm text-left bg-skin-bg-secondary rounded-lg px-3 py-2 border border-skin-border-secondary transition-all text-skin-text-primary focus-ring-accent"
                />
              </div>
            </div>
          </div>

          <div className="p-4 hover:bg-skin-bg-secondary transition-colors">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-sm text-skin-text-secondary">
                <span>₪ שכר שבת (150%)</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={shabatHourlyRate}
                  onChange={(e) => setShabatHourlyRate(e.target.value)}
                  className="w-24 text-sm text-left bg-skin-bg-secondary rounded-lg px-3 py-2 border border-skin-border-secondary transition-all text-skin-text-primary focus-ring-accent"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-skin-bg-secondary/50">
            <button
              type="button"
              onClick={handleSaveSalary}
              disabled={isSaving || Number(hourlyRate) <= 0}
              className="w-full rounded-xl bg-skin-accent-primary text-white py-3 text-sm font-medium shadow-sm disabled:opacity-50 hover:opacity-90 transition-all active:scale-95"
            >
              {savedSection === "salary" ? "נשמר ✓" : "שמור תעריפים למקום זה"}
            </button>
          </div>
        </div>

        {/* Net Salary Predictor: Deductions & Taxes */}
        <div className="bg-skin-card-bg rounded-2xl border border-skin-border-secondary divide-y divide-skin-border-secondary shadow-sm overflow-hidden">
          <div className="p-4 bg-skin-accent-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-skin-accent-primary" />
                <h3 className="text-xs font-semibold text-skin-text-primary uppercase tracking-wider">ניכויים ומיסים</h3>
              </div>
              {deductionsSaved && (
                <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1 animate-pulse">
                  <Check className="w-3 h-3" /> נשמר
                </span>
              )}
            </div>
            <p className="text-[10px] text-skin-text-tertiary mt-1">חישוב נטו חכם לפי חוקי המס 2026</p>
          </div>

          {/* Tax Toggle */}
          <div className="p-4 hover:bg-skin-bg-secondary transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-skin-text-primary">משלם/ת מס הכנסה</div>
                <div className="text-[10px] text-skin-text-tertiary mt-0.5">משוחררי צבא בשנה הראשונה עשויים להיות פטורים</div>
              </div>
              <button
                onClick={() => { const v = !paysTax; setPaysTax(v); handleSaveDeduction({ paysTax: v }); }}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${paysTax ? 'bg-emerald-500' : 'bg-skin-border-secondary'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${paysTax ? 'right-0.5' : 'right-[22px]'}`} />
              </button>
            </div>
          </div>

          {/* Pension Toggle */}
          <div className="p-4 hover:bg-skin-bg-secondary transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-skin-text-primary">פנסיה (6%)</div>
                <div className="text-[10px] text-skin-text-tertiary mt-0.5">חלק עובד - ניכוי מהברוטו</div>
              </div>
              <button
                onClick={() => { const v = !pensionEnabled; setPensionEnabled(v); handleSaveDeduction({ pensionEnabled: v }); }}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${pensionEnabled ? 'bg-emerald-500' : 'bg-skin-border-secondary'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${pensionEnabled ? 'right-0.5' : 'right-[22px]'}`} />
              </button>
            </div>
          </div>

          {/* Study Fund Toggle */}
          <div className="p-4 hover:bg-skin-bg-secondary transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-skin-text-primary">קרן השתלמות (2.5%)</div>
                <div className="text-[10px] text-skin-text-tertiary mt-0.5">חלק עובד - הטבה פטורה ממס</div>
              </div>
              <button
                onClick={() => { const v = !studyFundEnabled; setStudyFundEnabled(v); handleSaveDeduction({ studyFundEnabled: v }); }}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${studyFundEnabled ? 'bg-emerald-500' : 'bg-skin-border-secondary'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${studyFundEnabled ? 'right-0.5' : 'right-[22px]'}`} />
              </button>
            </div>
          </div>

          {/* Gender Toggle */}
          <div className="p-4 hover:bg-skin-bg-secondary transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-skin-text-primary">מגדר: {isFemale ? 'נקבה' : 'זכר'}</div>
                <div className="text-[10px] text-skin-text-tertiary mt-0.5">{isFemale ? '2.75 נקודות זיכוי' : '2.25 נקודות זיכוי'}</div>
              </div>
              <button
                onClick={() => { const v = !isFemale; setIsFemale(v); handleSaveDeduction({ isFemale: v }); }}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${isFemale ? 'bg-pink-400' : 'bg-blue-400'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${isFemale ? 'right-0.5' : 'right-[22px]'}`} />
              </button>
            </div>
          </div>

          {/* Ex-Soldier Toggle */}
          <div className="p-4 hover:bg-skin-bg-secondary transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-skin-text-primary">משוחרר/ת שירות</div>
                <div className="text-[10px] text-skin-text-tertiary mt-0.5">+2 נקודות זיכוי ל-36 חודשים</div>
              </div>
              <button
                onClick={() => { const v = !isExSoldier; setIsExSoldier(v); handleSaveDeduction({ isExSoldier: v }); }}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${isExSoldier ? 'bg-emerald-500' : 'bg-skin-border-secondary'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${isExSoldier ? 'right-0.5' : 'right-[22px]'}`} />
              </button>
            </div>
          </div>

          {/* Discharge Date (conditional) */}
          {isExSoldier && (
            <div className="p-4 hover:bg-skin-bg-secondary transition-colors">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-skin-text-secondary">תאריך שחרור</div>
                <input
                  type="date"
                  value={dischargeDate}
                  onChange={(e) => {
                    setDischargeDate(e.target.value);
                    handleSaveDeduction({ dischargeDate: e.target.value || null });
                  }}
                  className="bg-skin-bg-secondary border border-skin-border-secondary rounded-lg px-3 py-2 text-xs text-skin-text-primary focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Theme Selection */}
        <div className="bg-skin-card-bg rounded-2xl border border-skin-border-secondary p-4 relative overflow-hidden shadow-sm">
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

        {/* Workplace List (Simplified) */}
        {workplaces.length > 1 && (
          <div className="bg-skin-card-bg rounded-2xl border border-skin-border-secondary p-4 shadow-sm">
            <h3 className="text-xs font-semibold text-skin-text-secondary uppercase tracking-wider mb-3">מקומות העבודה שלי</h3>
            <div className="space-y-2">
              {workplaces.map(w => (
                <div key={w.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${w.id === activeWorkplaceId ? 'bg-skin-accent-primary-bg border-skin-accent-primary/30' : 'bg-skin-bg-secondary border-skin-border-secondary'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: w.color }}></div>
                    <span className={`text-sm font-medium ${w.id === activeWorkplaceId ? 'text-skin-accent-primary' : 'text-skin-text-primary'}`}>{w.name}</span>
                  </div>
                  <div className="flex gap-2">
                    {w.id !== activeWorkplaceId && (
                      <button
                        onClick={() => handleDeleteWorkplace(w.id)}
                        className="p-1.5 rounded-lg text-skin-text-tertiary hover:text-red-500 hover:bg-skin-card-bg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full rounded-xl border border-skin-border-secondary bg-skin-card-bg text-skin-text-secondary py-3 text-sm font-medium hover:bg-skin-bg-secondary hover:border-skin-border-primary transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> התנתק
          </button>
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
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-skin-modal-overlay backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowLogoutModal(false)}>
          <div className="bg-skin-card-bg rounded-2xl w-full max-w-xs p-5 shadow-2xl" dir="rtl" onClick={(e) => e.stopPropagation()}>
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

      {/* NEW Workplace Template Selection Modal */}
      {isSelectionModalOpen && (
        <div className="fixed inset-0 bg-skin-modal-overlay backdrop-blur-sm flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-skin-card-bg rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl transform transition-transform animate-in slide-in-from-bottom-full duration-300" dir="rtl">
            <div className="p-6 border-b border-skin-border-secondary flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-skin-text-primary">בחר מקום עבודה</h3>
                <p className="text-xs text-skin-text-tertiary">בחר מרשימת המקומות המוגדרים מראש</p>
                <p className="text-xs text-skin-text-tertiary">כולל את כל סוגי המשמרות, שעות התחלה/סיום ותעריפי בסיס מותאמים.</p>
              </div>
              <button onClick={() => setIsSelectionModalOpen(false)} className="p-2 rounded-full bg-skin-bg-secondary text-skin-text-secondary hover:text-skin-text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {templates.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template.id)}
                  className="w-full text-right p-4 rounded-2xl border-2 border-skin-border-secondary hover:border-skin-accent-primary hover:bg-skin-accent-primary-bg group transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-base font-bold text-skin-text-primary group-hover:text-skin-accent-primary transition-colors">{template.nameHe || template.name}</h4>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: template.color }}></div>
                  </div>
                  <div className="mt-4 flex gap-4 overflow-x-auto pb-1 no-scrollbar">
                    {template.shifts.slice(0, 3).map(s => (
                      <div key={s.code} className="bg-skin-bg-secondary px-3 py-1.5 rounded-lg border border-skin-border-secondary flex-shrink-0">
                        <div className="text-[9px] text-skin-text-tertiary mb-0.5">{s.nameHe}</div>
                        <div className="text-[10px] font-bold text-skin-text-primary" dir="ltr">{s.defaultStart} - {s.defaultEnd}</div>
                      </div>
                    ))}
                    {template.shifts.length > 3 && (
                      <div className="flex items-center text-[10px] text-skin-text-tertiary">+{template.shifts.length - 3} נוספים</div>
                    )}
                  </div>
                </button>
              ))}

              <div className="p-4 rounded-2xl bg-skin-bg-secondary border border-dashed border-skin-border-primary text-center">
                <Lock className="w-5 h-5 text-skin-text-tertiary mx-auto mb-2" />
                <p className="text-xs text-skin-text-secondary">מקומות עבודה נוספים יתווספו בקרוב</p>
                <div className="text-[10px] text-skin-text-tertiary mt-2">יש לכם הצעה למקום עבודה נוסף? צרו קשר!</div>
              </div>
            </div>

            <div className="p-4 bg-skin-bg-secondary">
              <button
                onClick={() => setIsSelectionModalOpen(false)}
                className="w-full py-3 rounded-xl bg-skin-card-bg border border-skin-border-secondary text-sm font-medium text-skin-text-primary"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}