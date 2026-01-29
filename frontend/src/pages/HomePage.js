import { useEffect, useMemo, useState } from "react";
import { Sun, Sunset, Moon, Clock, X, Plus, Wallet, Pencil, Trash2, MoreVertical, AlertTriangle, CalendarDays } from "lucide-react";
import Layout from "../components/Layout";
import ShiftForm from "../components/ShiftForm";
import WeeklyShiftModal from "../components/WeeklyShiftModal";
import { useAuth } from "../context/AuthContext";
import { shiftConfig, getShiftTypeMap } from "../utils/shiftUtils";
import api from "../api/client";
import dayjs from "dayjs";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function getGreeting(hour) {
    if (hour >= 5 && hour < 12) return "בוקר טוב";
    if (hour >= 12 && hour < 17) return "צהריים טובים";
    if (hour >= 17 && hour < 22) return "ערב טוב";
    return "לילה טוב";
}

export default function HomePage() {
    const { user, refreshUser } = useAuth();
    const [summary, setSummary] = useState(null);
    const [recentShifts, setRecentShifts] = useState([]);
    const [shiftTypes, setShiftTypes] = useState([]);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isTipOpen, setIsTipOpen] = useState(false);
    const [selectedShiftCode, setSelectedShiftCode] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [isOvertimeOpen, setIsOvertimeOpen] = useState(false);
    const [overtimeHours, setOvertimeHours] = useState("");
    const [overtimeRate, setOvertimeRate] = useState("");
    const [overtimeRateFromSettings, setOvertimeRateFromSettings] = useState(0);
    const [tipAmount, setTipAmount] = useState("");
    const [tipShiftId, setTipShiftId] = useState(null);
    const [editShiftId, setEditShiftId] = useState(null);
    const [endedLocalIds, setEndedLocalIds] = useState([]);
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [deleteShiftId, setDeleteShiftId] = useState(null);
    const [endShiftId, setEndShiftId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isWeeklyShiftOpen, setIsWeeklyShiftOpen] = useState(false);

    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const shiftTypeMap = useMemo(() => getShiftTypeMap(shiftTypes), [shiftTypes]);

    const userName = user?.displayName || "אורח";

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        return getGreeting(hour);
    }, []);

    async function refreshSummary() {
        try {
            const [summaryRes, historyRes, settingsRes] = await Promise.all([
                api.get("/summary"),
                api.get("/history"),
                api.get("/settings")
            ]);

            setSummary(summaryRes.data);

            // Get a pool of shifts (Summary prefers recentShifts, fallback to History)
            let shiftsPool = [];
            if (summaryRes.data.recentShifts && summaryRes.data.recentShifts.length > 0) {
                shiftsPool = summaryRes.data.recentShifts;
            } else if (historyRes.data.items) {
                // Only fetch 5 items since we display max 4 (1 active + 3 history)
                shiftsPool = historyRes.data.items.slice(0, 5);
            }

            // Store raw shifts without sorting - we'll sort in useMemo for better performance
            setRecentShifts(shiftsPool);

            if (settingsRes.data.overtimeHourlyRate) {
                setOvertimeRateFromSettings(settingsRes.data.overtimeHourlyRate);
            }
        } catch {
            // ignore
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        refreshUser();
        refreshSummary();
        api.get("/shift-types").then(res => setShiftTypes(res.data));
    }, []);

    // Memoized helper functions for shift calculations
    const formatTime = useMemo(() => (val) => {
        if (Array.isArray(val)) {
            return `${String(val[0]).padStart(2, '0')}:${String(val[1]).padStart(2, '0')}`;
        }
        if (typeof val === 'string') {
            return val.slice(0, 5);
        }
        return "";
    }, []);

    const formatDate = useMemo(() => (d) => {
        if (Array.isArray(d)) {
            return `${d[0]}-${String(d[1]).padStart(2, '0')}-${String(d[2]).padStart(2, '0')}`;
        }
        return d;
    }, []);

    // Memoized function to check if a shift is currently active
    const isShiftActive = useMemo(() => (shift) => {
        if (shift.isEnded || endedLocalIds.includes(shift.id)) return false;

        const now = dayjs();
        const dateStr = formatDate(shift.date);
        const sTime = formatTime(shift.startTime) || shiftTypeMap[shift.shiftType]?.defaultStart;
        const eTime = formatTime(shift.endTime) || shiftTypeMap[shift.shiftType]?.defaultEnd;

        if (dateStr && sTime && eTime) {
            const start = dayjs(`${dateStr}T${sTime}`);
            let end = dayjs(`${dateStr}T${eTime}`);
            if (end.isBefore(start)) end = end.add(1, "day");

            return now.isAfter(start) && now.add(5, 'minute').isBefore(end);
        }
        return false;
    }, [endedLocalIds, shiftTypeMap, formatTime, formatDate]);

    // Memoized sorted and filtered shift list for display
    const displayShifts = useMemo(() => {
        if (recentShifts.length === 0) return [];

        // Find the active shift
        const activeShift = recentShifts.find(s => isShiftActive(s));

        // Get history (all non-active shifts)
        let historyList = recentShifts.filter(s => {
            if (activeShift && String(s.id) === String(activeShift.id)) return false;
            return true;
        });

        // Sort history by date/time (newest first)
        historyList.sort((a, b) => {
            const dateA = formatDate(a.date);
            const timeA = formatTime(a.startTime) || "00:00";
            const dateB = formatDate(b.date);
            const timeB = formatTime(b.startTime) || "00:00";
            return dayjs(`${dateB}T${timeB}`).valueOf() - dayjs(`${dateA}T${timeA}`).valueOf();
        });

        // Take top 3 history items
        const topHistory = historyList.slice(0, 3);

        // Combine: active first, then history
        return activeShift ? [activeShift, ...topHistory] : topHistory;
    }, [recentShifts, isShiftActive, formatDate, formatTime]);

    const handleShiftSelect = (shift) => {
        setSelectedShiftCode(shift.code);
        // Only set times if they are empty or if we want to enforce defaults
        // For now, let's set defaults if provided
        setStartTime(shift.defaultStart);
        setEndTime(shift.defaultEnd);
    };

    const handleOpenAdd = () => {
        setIsAddOpen(true);
        // Default to Middle if available and no selection
        if (!selectedShiftCode && !editShiftId) {
            // Find "Middle" or fallback to first
            const middle = shiftTypes.find(s => s.code.toLowerCase() === 'middle') || shiftTypes[0];
            if (middle) {
                setSelectedShiftCode(middle.code);
                setStartTime(middle.defaultStart);
                setEndTime(middle.defaultEnd);
            }
        }
    };

    const handleEditShift = (shift) => {
        setEditShiftId(shift.id);
        setSelectedDate(shift.date);
        const t = shiftTypeMap[shift.shiftType];
        if (t) setSelectedShiftCode(t.code);

        setStartTime(formatTime(shift.startTime));
        setEndTime(formatTime(shift.endTime));
        setOvertimeHours(shift.overtimeHours || "");
        setOvertimeRate(shift.overtimeHourlyRate || "");
        setIsOvertimeOpen(!!shift.overtimeHours);
        setIsAddOpen(true);
        setActiveMenuId(null);
    };

    const handleOpenTip = (shiftId, currentTip) => {
        setTipShiftId(shiftId);
        setTipAmount(currentTip ? String(currentTip) : "");
        setIsTipOpen(true);
    };

    async function handleAddTip() {
        if (!tipShiftId || !tipAmount) return;
        try {
            await api.post(`/shifts/${tipShiftId}/tip`, { tipAmount: Number(tipAmount) });
            setIsTipOpen(false);
            setTipShiftId(null);
            setTipAmount("");
            refreshSummary();
            refreshUser();
        } catch (error) {
            console.error("Error adding tip:", error);
        }
    }

    async function handleCreateShift() {
        // --- 1. Basic Validation ---
        if (!selectedShiftCode) {
            alert("אנא בחר סוג משמרת");
            return;
        }
        if (!selectedDate) {
            alert("אנא בחר תאריך");
            return;
        }
        // Check that start/end times are not empty
        if (!startTime || !endTime) {
            alert("אנא הזן שעות התחלה וסיום");
            return;
        }

        // --- 2. Overtime Validation (The new part) ---
        let finalOvertimeHours = 0;
        let finalOvertimeRate = null;

        if (isOvertimeOpen) {
            // Parse the input (it comes as a string)
            const parsedHours = parseFloat(overtimeHours);

            // Check if it's empty, Not-a-Number, or Negative/Zero
            if (!overtimeHours || isNaN(parsedHours) || parsedHours <= 0) {
                alert("שגיאה: יש להזין כמות שעות נוספות חיובית (לדוגמה: 1.5)");
                return;
            }

            finalOvertimeHours = parsedHours;

            // Handle Rate Validation
            if (overtimeRate) {
                const parsedRate = parseFloat(overtimeRate);
                if (isNaN(parsedRate) || parsedRate < 0) {
                    alert("שגיאה: תעריף שעות נוספות לא תקין");
                    return;
                }
                finalOvertimeRate = parsedRate;
            } else {
                // If user left rate empty, use settings (or let backend handle null)
                finalOvertimeRate = overtimeRateFromSettings || null;
            }
        }

        // --- 3. Send to Server ---
        try {
            const payload = {
                shiftCode: selectedShiftCode,
                date: selectedDate,
                startTime,
                endTime,
                // Use the validated numbers
                overtimeHours: finalOvertimeHours,
                overtimeHourlyRate: finalOvertimeRate,
            };

            if (editShiftId) {
                await api.put(`/shifts/${editShiftId}`, payload);
            } else {
                await api.post("/shifts", payload);
            }

            closeAddModal();
            refreshSummary();
            refreshUser();
        } catch (error) {
            console.error("Save error:", error);
            alert("שגיאה בשמירה, אנא נסה שנית");
        }
    }

    const closeAddModal = () => {
        setIsAddOpen(false);
        setEditShiftId(null);
        setSelectedShiftCode(null);
        setStartTime("");
        setEndTime("");
        setIsOvertimeOpen(false);
        setOvertimeHours("");
        setOvertimeRate("");
        setSelectedDate(new Date().toISOString().slice(0, 10));
    };

    async function handleDeleteShift() {
        if (!deleteShiftId) return;
        try {
            await api.delete(`/shifts/${deleteShiftId}`);
            refreshSummary();
            refreshUser();
            setDeleteShiftId(null);
        } catch (error) {
            console.error("Error deleting shift:", error);
        }
    }

    async function handleEndShift() {
        if (!endShiftId) return;

        // 1. Optimistic UI update (Update screen immediately)
        const nowStr = dayjs().format("HH:mm");
        setEndedLocalIds(prev => [...prev, endShiftId]);
        setRecentShifts(prev => prev.map(s =>
            s.id === endShiftId ? { ...s, endTime: nowStr, isEnded: true } : s
        ));
        setEndShiftId(null); // Close modal immediately

        // 2. Server call
        try {
            await api.post(`/shifts/${endShiftId}/end`);
            // 3. Refresh real data to ensure salary calc is correct
            refreshSummary();
            refreshUser();
        } catch (error) {
            console.error("Error ending shift:", error);
            alert("שגיאה בסיום המשמרת");
        }
    }

    async function handleSaveWeeklyShifts(shiftsData) {
        try {
            // Create all shifts in parallel
            const promises = shiftsData.map(shift =>
                api.post("/shifts", {
                    shiftCode: shift.shiftCode,
                    date: shift.date,
                    startTime: shift.startTime,
                    endTime: shift.endTime,
                    overtimeHours: 0,
                    overtimeHourlyRate: null
                })
            );

            await Promise.all(promises);
            refreshSummary();
            refreshUser();
        } catch (error) {
            console.error("Error saving weekly shifts:", error);
            alert("שגיאה בשמירת המשמרות");
        }
    }

    return (
        <Layout>
            <header className="mb-6 pt-2" dir="rtl">
                <h1 className="text-xl font-medium text-skin-text-primary mb-0.5">
                    {greeting}, {userName}
                </h1>
                <p className="text-xs text-skin-text-tertiary">
                    {new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}
                </p>
            </header>

            {/* Stats - Bento Grid */}
            <section className="mb-6" dir="rtl">
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 bg-skin-card-bg rounded-2xl p-5 text-skin-text-primary border border-skin-border-secondary shadow-sm">
                        <div className="text-xs text-skin-text-tertiary mb-1">משכורת צפויה</div>
                        <div className="text-3xl font-semibold mb-2">
                            ₪{(summary?.expectedMonthSalary ?? 0).toFixed(0)}
                        </div>
                        {summary?.totalTips > 0 && (
                            <div className="text-xs text-skin-text-tertiary">
                                לא כולל ₪{summary.totalTips.toFixed(0)} בטיפים
                            </div>
                        )}
                    </div>
                    <div className="bg-skin-card-bg rounded-2xl border border-skin-border-secondary p-4 shadow-sm">
                        <div className="text-xs text-skin-text-tertiary mb-1">שבועי</div>
                        <div className="text-2xl font-semibold text-skin-text-primary">
                            {(summary?.weekHours ?? 0).toFixed(1)}
                        </div>
                    </div>
                    <div className="bg-skin-card-bg rounded-2xl border border-skin-border-secondary p-4 shadow-sm">
                        <div className="text-xs text-skin-text-tertiary mb-1">חודשי</div>
                        <div className="text-2xl font-semibold text-skin-text-primary">
                            {(summary?.monthHours ?? 0).toFixed(1)}
                        </div>
                    </div>
                </div>
            </section>

            {/* Recent Shifts */}
            <section dir="rtl">
                <h2 className="text-sm font-medium text-skin-text-secondary mb-3">משמרות אחרונות</h2>
                <div className="space-y-2">
                    {isLoading ? (
                        <div className="text-center py-12 bg-skin-bg-secondary rounded-xl border border-dashed border-skin-border-primary">
                            <div className="inline-block w-8 h-8 border-3 border-skin-border-primary border-t-skin-text-primary rounded-full animate-spin mb-2"></div>
                            <p className="text-sm text-skin-text-tertiary">טוען משמרות...</p>
                        </div>
                    ) : displayShifts.length === 0 ? (
                        <div className="text-center py-12 bg-skin-bg-secondary rounded-xl border border-dashed border-skin-border-primary">
                            <p className="text-sm text-skin-text-tertiary">אין משמרות לאחרונה</p>
                        </div>
                    ) : (
                        displayShifts.map((item) => {
                            const ongoing = isShiftActive(item);
                            const config = shiftConfig[item.shiftType?.toLowerCase()] || shiftConfig.middle;
                            const Icon = config.icon || Clock;

                            return (
                                <div
                                    key={item.id}
                                    className={`bg-skin-card-bg rounded-xl border p-4 transition-all ${ongoing ? 'border-skin-accent-primary bg-skin-accent-primary-bg shadow-sm relative z-10' : 'border-skin-border-secondary'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Icon */}
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${config.bg} ${config.color} flex-shrink-0`}>
                                            <Icon className="w-5 h-5" />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className="text-sm font-medium text-skin-text-primary truncate">
                                                    {item.shiftType || item.name}
                                                </h3>
                                                {ongoing && (
                                                    <span className="flex items-center gap-1 bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                        פעיל
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-skin-text-tertiary truncate">
                                                {new Date(item.date).toLocaleDateString("he-IL", { day: 'numeric', month: 'short' })}
                                                <span className="mx-1.5">•</span>
                                                {item.hours.toFixed(1)} שעות
                                            </p>
                                        </div>

                                        {/* Actions & Salary */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <div className="text-right">
                                                <div className="text-base font-semibold text-skin-text-primary">
                                                    ₪{(item.salary || 0).toFixed(0)}
                                                </div>
                                                {item.tipAmount > 0 && (
                                                    <div className="text-[10px] text-skin-accent-primary font-medium">
                                                        +₪{item.tipAmount}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Menu */}
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveMenuId(activeMenuId === item.id ? null : item.id);
                                                    }}
                                                    className="p-2 -ml-2 rounded-lg text-skin-text-secondary hover:text-skin-text-primary hover:bg-skin-bg-secondary active:bg-skin-bg-primary transition-colors"
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>

                                                {activeMenuId === item.id && (
                                                    <div className="absolute left-0 top-9 w-36 bg-skin-card-bg rounded-xl shadow-xl border border-skin-border-secondary overflow-hidden z-20">
                                                        {ongoing && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveMenuId(null);
                                                                    setEndShiftId(item.id);
                                                                }}
                                                                className="w-full px-4 py-2.5 text-xs font-medium text-skin-accent-primary hover:bg-skin-accent-primary-bg text-right flex items-center justify-end gap-2"
                                                            >
                                                                סיים משמרת
                                                                <Clock className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveMenuId(null);
                                                                handleOpenTip(item.id, item.tipAmount);
                                                            }}
                                                            className="w-full px-4 py-2.5 text-xs font-medium text-skin-text-primary hover:bg-skin-bg-secondary text-right flex items-center justify-end gap-2"
                                                        >
                                                            {item.tipAmount > 0 ? 'ערוך טיפ' : 'הוסף טיפ'}
                                                            <Wallet className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditShift(item);
                                                            }}
                                                            className="w-full px-4 py-2.5 text-xs font-medium text-skin-text-primary hover:bg-skin-bg-secondary text-right flex items-center justify-end gap-2"
                                                        >
                                                            עריכה
                                                            <Pencil className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveMenuId(null);
                                                                setDeleteShiftId(item.id);
                                                            }}
                                                            className="w-full px-4 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 text-right flex items-center justify-end gap-2"
                                                        >
                                                            מחיקה
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </section>

            {/* FAB Buttons */}
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 flex gap-3 z-40">
                {/* Weekly Shift Button */}
                <button
                    onClick={() => setIsWeeklyShiftOpen(true)}
                    className="bg-skin-accent-secondary text-white px-4 py-3 rounded-full shadow-lg active:scale-95 transition-transform flex items-center gap-2"
                    title="הוספת משמרות לשבוע"
                >
                    <CalendarDays className="w-5 h-5" />
                    <span className="text-sm font-medium">שבוע</span>
                </button>

                {/* Single Shift Button */}
                <button
                    onClick={handleOpenAdd}
                    className="bg-skin-accent-primary text-white p-4 rounded-full shadow-lg active:scale-95 transition-transform"
                    title="הוספת משמרת בודדת"
                >
                    <Plus className="w-6 h-6" />
                </button>
            </div>

            {/* Weekly Shift Modal */}
            <WeeklyShiftModal
                isOpen={isWeeklyShiftOpen}
                onClose={() => setIsWeeklyShiftOpen(false)}
                shiftTypes={shiftTypes}
                onSave={handleSaveWeeklyShifts}
                isPremium={user?.isPremium ?? true}
            />

            {/* Add Shift Modal */}
            {isAddOpen && (
                <div className="fixed inset-0 bg-skin-modal-overlay backdrop-blur-sm flex items-end justify-center z-50">
                    <div className="bg-skin-card-bg rounded-t-2xl w-full max-w-md px-5 pt-5 pb-8 max-h-[90vh] overflow-y-auto" dir="rtl">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-medium text-skin-text-primary">
                                {editShiftId ? 'עריכת משמרת' : 'משמרת חדשה'}
                            </h2>
                            <button onClick={closeAddModal} className="p-2 -ml-2 rounded-lg text-skin-text-tertiary hover:text-skin-text-primary active:bg-skin-bg-secondary">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Date */}
                        <div className="mb-4">
                            <DatePicker
                                selected={selectedDate ? new Date(selectedDate) : null}
                                onChange={(date) => {
                                    if (date) {
                                        const offsetDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                                        setSelectedDate(offsetDate.toISOString().slice(0, 10));
                                    }
                                }}
                                dateFormat="dd-MM-yyyy"
                                wrapperClassName="w-full"
                                className="w-full bg-skin-bg-secondary border border-skin-border-primary rounded-xl py-3 text-center text-sm font-medium text-skin-text-primary focus:outline-none active:bg-skin-bg-primary"
                            />
                        </div>

                        <ShiftForm
                            shiftTypes={shiftTypes}
                            selectedShiftCode={selectedShiftCode}
                            setSelectedShiftCode={setSelectedShiftCode}
                            startTime={startTime}
                            setStartTime={setStartTime}
                            endTime={endTime}
                            setEndTime={setEndTime}
                            isOvertimeOpen={isOvertimeOpen}
                            setIsOvertimeOpen={setIsOvertimeOpen}
                            overtimeHours={overtimeHours}
                            setOvertimeHours={setOvertimeHours}
                            overtimeRate={overtimeRate}
                            setOvertimeRate={setOvertimeRate}
                            overtimeRateFromSettings={user?.settings?.overtimeHourlyRate} // Or however you get settings in Home
                        />

                        <button
                            onClick={handleCreateShift}
                            disabled={!selectedShiftCode || !startTime || !endTime}
                            className="w-full bg-skin-accent-primary text-white py-3.5 rounded-xl font-medium disabled:opacity-50 active:scale-95 transition-transform"
                        >
                            שמור
                        </button>
                    </div>
                </div>
            )}

            {/* Tip Modal */}
            {isTipOpen && (
                <div className="fixed inset-0 bg-skin-modal-overlay backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-skin-card-bg rounded-2xl w-full max-w-xs p-5" dir="rtl">
                        <h3 className="text-lg font-medium text-skin-text-primary mb-4 text-center">כמה טיפים?</h3>
                        <div className="relative mb-4">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-skin-text-tertiary font-medium">₪</span>
                            <input
                                type="number"
                                value={tipAmount}
                                onChange={(e) => setTipAmount(e.target.value)}
                                className="w-full bg-skin-bg-secondary border border-skin-border-primary rounded-xl py-4 px-4 text-center text-2xl font-semibold text-skin-text-primary focus:outline-none"
                                placeholder="0"
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsTipOpen(false)}
                                className="flex-1 py-3 rounded-xl font-medium text-skin-text-secondary active:bg-skin-bg-secondary"
                            >
                                ביטול
                            </button>
                            <button
                                onClick={handleAddTip}
                                disabled={!tipAmount || Number(tipAmount) <= 0}
                                className="flex-1 bg-skin-accent-primary text-white py-3 rounded-xl font-medium disabled:opacity-50 active:scale-95 transition-transform"
                            >
                                שמור
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteShiftId && (
                <div className="fixed inset-0 bg-skin-modal-overlay backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-skin-card-bg rounded-2xl w-full max-w-xs p-6" dir="rtl">
                        <div className="flex flex-col items-center justify-center text-center mb-6">
                            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-skin-text-primary mb-1">מחיקת משמרת</h3>
                            <p className="text-sm text-skin-text-secondary">
                                האם את/ה בטוח/ה שברצונך למחוק את המשמרת? לא ניתן לשחזר פעולה זו.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteShiftId(null)}
                                className="flex-1 py-2.5 rounded-xl font-medium text-skin-text-primary bg-skin-bg-secondary hover:bg-skin-bg-primary transition-colors"
                            >
                                ביטול
                            </button>
                            <button
                                onClick={handleDeleteShift}
                                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-medium hover:bg-red-700 active:scale-95 transition-all shadow-sm"
                            >
                                מחק
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* End Shift Modal */}
            {endShiftId && (
                <div className="fixed inset-0 bg-skin-modal-overlay backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-skin-card-bg rounded-2xl w-full max-w-xs p-6" dir="rtl">
                        <div className="flex flex-col items-center justify-center text-center mb-6">
                            <div className="w-12 h-12 bg-skin-accent-primary-bg rounded-full flex items-center justify-center mb-4">
                                <Clock className="w-6 h-6 text-skin-accent-primary" />
                            </div>
                            <h3 className="text-lg font-semibold text-skin-text-primary mb-1">סיום משמרת</h3>
                            <p className="text-sm text-skin-text-secondary leading-relaxed">
                                האם ברצונך לסיים את המשמרת כעת?
                                <br />
                                שעת הסיום תעודכן לשעה {dayjs().format("HH:mm")}.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setEndShiftId(null)}
                                className="flex-1 py-2.5 rounded-xl font-medium text-skin-text-primary bg-skin-bg-secondary hover:bg-skin-bg-primary transition-colors"
                            >
                                ביטול
                            </button>
                            <button
                                onClick={handleEndShift}
                                className="flex-1 bg-skin-accent-primary text-white py-2.5 rounded-xl font-medium hover:opacity-90 active:scale-95 transition-all shadow-sm"
                            >
                                סיים משמרת
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
