import { useEffect, useState } from "react";
import { User, Banknote, LogOut, Check, X, Palette, Lock, Briefcase, Plus, Trash2, Edit2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useWorkplace } from "../context/WorkplaceContext";
import api from "../api/client";
import PremiumLock from '../components/PremiumLock';

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const { currentTheme, updateTheme, themes } = useTheme();
  const { workplaces, activeWorkplaceId, setActiveWorkplaceId, refreshWorkplaces } = useWorkplace();

  const [hourlyRate, setHourlyRate] = useState(51);
  const [overtimeHourlyRate, setOvertimeHourlyRate] = useState(63.75);
  const [shabatHourlyRate, setShabatHourlyRate] = useState(76.5);
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSection, setSavedSection] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumExpiresAt, setPremiumExpiresAt] = useState(null);

  // Workplace Modal State
  const [isWorkplaceModalOpen, setIsWorkplaceModalOpen] = useState(false);
  const [editingWorkplace, setEditingWorkplace] = useState(null);
  const [wpForm, setWpForm] = useState({ name: "", color: "#3B82F6", isDefault: false });

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/settings");
        setIsPremium(res.data.isPremium ?? false);
        setPremiumExpiresAt(res.data.premiumExpiresAt);

        if (user) {
          setDisplayName(user.displayName || "");
        }

        // Initial load of rates from settings (fallback)
        // Actual rates will be updated when activeWorkplaceId changes
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
        await api.put(`/workplaces/${activeWorkplaceId}`, {
          name: workplaces.find(w => w.id === activeWorkplaceId)?.name, // Keep name
          color: workplaces.find(w => w.id === activeWorkplaceId)?.color, // Keep color
          hourlyRate: Number(hourlyRate),
          overtimeHourlyRate: Number(overtimeHourlyRate),
          shabatHourlyRate: Number(shabatHourlyRate),
          isDefault: workplaces.find(w => w.id === activeWorkplaceId)?.isDefault
        });
        refreshWorkplaces();
      } else {
        // Legacy Fallback
        await api.post("/settings", {
          hourlyRate: Number(hourlyRate),
          overtimeHourlyRate: Number(overtimeHourlyRate),
          shabatHourlyRate: Number(shabatHourlyRate),
        });
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
  const openWorkplaceModal = (wp = null) => {
    if (wp) {
      setEditingWorkplace(wp);
      setWpForm({ name: wp.name, color: wp.color, isDefault: wp.isDefault });
    } else {
      setEditingWorkplace(null);
      setWpForm({ name: "", color: "#3B82F6", isDefault: false });
    }
    setIsWorkplaceModalOpen(true);
  };

  const handleSaveWorkplace = async () => {
    if (!wpForm.name) return alert("אנא הזן שם מקום עבודה");

    try {
      const payload = {
        ...wpForm,
        // Default rates for new workplace if not editing
        hourlyRate: editingWorkplace ? editingWorkplace.hourlyRate : 50,
        overtimeHourlyRate: editingWorkplace ? editingWorkplace.overtimeHourlyRate : 62.5,
        shabatHourlyRate: editingWorkplace ? editingWorkplace.shabatHourlyRate : 75
      };

      if (editingWorkplace) {
        await api.put(`/workplaces/${editingWorkplace.id}`, payload);
      } else {
        await api.post("/workplaces", payload);
      }
      refreshWorkplaces();
      setIsWorkplaceModalOpen(false);
    } catch (error) {
      console.error(error);
      alert("שגיאה בשמירה");
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


  return (
    <>
      <header className="mb-6 pt-2" dir="rtl">
        <h1 className="text-xl font-medium text-skin-text-primary mb-0.5">הגדרות</h1>
      </header>

      <div className="space-y-3" dir="rtl">
        {/* Workplace Switcher */}
        <div className="bg-skin-card-bg rounded-2xl border border-skin-border-secondary p-4">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-5 h-5 text-skin-accent-primary" />
            <h3 className="text-sm font-medium text-skin-text-primary">מקום עבודה פעיל</h3>
          </div>
          <select
            value={activeWorkplaceId || ""}
            onChange={(e) => setActiveWorkplaceId(Number(e.target.value))}
            className="w-full bg-skin-bg-secondary border border-skin-border-secondary rounded-xl px-4 py-3 text-sm text-skin-text-primary focus:outline-none focus:ring-2 focus:ring-skin-accent-primary/20 transition-all font-medium appearance-none"
          >
            <option value="" disabled>בחר מקום עבודה</option>
            {workplaces.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

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

      {/* Workplace Management List */}
      <div className="bg-skin-card-bg rounded-2xl border border-skin-border-secondary p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-skin-text-primary">ניהול מקומות עבודה</h3>
          <button
            onClick={() => openWorkplaceModal()}
            className="p-1.5 rounded-lg bg-skin-accent-primary-bg text-skin-accent-primary hover:bg-skin-accent-primary/20 transition-colors"
            title="הוסף מקום עבודה"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {workplaces.map(w => (
            <div key={w.id} className="flex items-center justify-between p-3 rounded-xl bg-skin-bg-secondary border border-skin-border-secondary">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: w.color }}></div>
                <span className="text-sm font-medium text-skin-text-primary">{w.name} {w.isDefault && <span className="text-xs text-skin-text-tertiary">(ברירת מחדל)</span>}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openWorkplaceModal(w)}
                  className="p-1.5 rounded-lg text-skin-text-secondary hover:text-skin-accent-primary hover:bg-skin-card-bg"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {workplaces.length > 1 && (
                  <button
                    onClick={() => handleDeleteWorkplace(w.id)}
                    className="p-1.5 rounded-lg text-skin-text-secondary hover:text-red-500 hover:bg-skin-card-bg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
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

      {/* Workplace Edit/Create Modal */}
      {isWorkplaceModalOpen && (
        <div className="fixed inset-0 bg-skin-modal-overlay backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-skin-card-bg rounded-2xl w-full max-w-sm p-6" dir="rtl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-skin-text-primary">
                {editingWorkplace ? "עריכת מקום עבודה" : "מקום עבודה חדש"}
              </h3>
              <button onClick={() => setIsWorkplaceModalOpen(false)} className="text-skin-text-tertiary hover:text-skin-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-skin-text-secondary mb-1">שם המקום</label>
                <input
                  type="text"
                  value={wpForm.name}
                  onChange={e => setWpForm({ ...wpForm, name: e.target.value })}
                  className="w-full bg-skin-bg-secondary border border-skin-border-secondary rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-skin-accent-primary/20"
                  placeholder="לדוגמה: משרד ראשי"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-skin-text-secondary mb-1">צבע</label>
                <div className="flex gap-2 flex-wrap">
                  {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1'].map(color => (
                    <button
                      key={color}
                      onClick={() => setWpForm({ ...wpForm, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${wpForm.color === color ? 'border-skin-accent-primary scale-110' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={wpForm.isDefault}
                  onChange={e => setWpForm({ ...wpForm, isDefault: e.target.checked })}
                  className="w-4 h-4 rounded border-skin-border-secondary text-skin-accent-primary focus:ring-skin-accent-primary"
                />
                <label htmlFor="isDefault" className="text-sm text-skin-text-primary">הגדר כברירת מחדל</label>
              </div>

              <button
                onClick={handleSaveWorkplace}
                className="w-full bg-skin-accent-primary text-white py-3 rounded-xl font-medium active:scale-95 transition-transform mt-2"
              >
                שמור
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}