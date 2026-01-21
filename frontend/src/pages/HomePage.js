import { useEffect, useMemo, useState } from "react";
import { Sun, Sunset, Moon, Clock, X, Plus, Wallet, Pencil, Trash2, MoreVertical, AlertTriangle } from "lucide-react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
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

    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const shiftTypeMap = useMemo(() => {
        const map = {};
        shiftTypes.forEach(t => {
            map[t.nameHe] = t;
            map[t.code] = t;
        });
        return map;
    }, [shiftTypes]);

    const shiftConfig = {
        morning: {
            icon: Sun,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            gradient: 'from-amber-400 to-orange-500',
            activeGradient: 'from-amber-500 to-orange-600'
        },
        evening: {
            icon: Sunset,
            color: 'text-orange-600',
            bg: 'bg-orange-50',
            border: 'border-orange-200',
            gradient: 'from-orange-400 to-pink-500',
            activeGradient: 'from-orange-500 to-pink-600'
        },
        night: {
            icon: Moon,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
            border: 'border-indigo-200',
            gradient: 'from-indigo-500 to-blue-800',
            activeGradient: 'from-indigo-500 to-purple-600'
        },
        middle: {
            icon: Clock,
            color: 'text-teal-600',
            bg: 'bg-teal-50',
            border: 'border-teal-200',
            gradient: 'from-teal-400 to-emerald-500',
            activeGradient: 'from-teal-500 to-emerald-600'
        },
        '4pm_until_12': {
            icon: Clock,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            border: 'border-purple-200',
            gradient: 'from-purple-400 to-violet-500',
            activeGradient: 'from-purple-500 to-violet-600'
        },
        '7am_until_4': {
            icon: Clock,
            color: 'text-cyan-600',
            bg: 'bg-cyan-50',
            border: 'border-cyan-200',
            gradient: 'from-cyan-400 to-sky-500',
            activeGradient: 'from-cyan-500 to-sky-600'
        }
    };

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
                // Fetch more (e.g. 10) to catch the active one if it's buried
                shiftsPool = historyRes.data.items.slice(0, 10);
            }

            // SORT: Force ongoing shifts to the top
            const now = dayjs();

            const sorted = [...shiftsPool].sort((a, b) => {
                // Helper to check if a shift is ongoing
                const isOngoing = (shift) => {
                    // Check if manually ended locally
                    if (endedLocalIds.includes(shift.id)) return false;

                    // Backend flag check (if backend sends 'isEnded' or similar)
                    if (shift.isEnded) return false;

                    // Date/Time calculation check
                    const dateStr = shift.date;
                    const sTime = shift.startTime?.slice(0, 5);
                    const eTime = shift.endTime?.slice(0, 5);

                    if (dateStr && sTime && eTime) {
                        const start = dayjs(`${dateStr}T${sTime}`);
                        let end = dayjs(`${dateStr}T${eTime}`);
                        if (end.isBefore(start)) end = end.add(1, "day");

                        // It is ongoing if NOW is between start and end (with buffer)
                        return now.isAfter(start) && now.add(5, 'minute').isBefore(end);
                    }
                    return false;
                };

                const aActive = isOngoing(a);
                const bActive = isOngoing(b);

                // If A is active and B is not, A comes first (-1)
                if (aActive && !bActive) return -1;
                // If B is active and A is not, B comes first (1)
                if (!aActive && bActive) return 1;

                // Otherwise, keep original order (usually date desc)
                return 0;
            });

            // 3. Slice to final display count (e.g., 3 or 5) AFTER sorting
            setRecentShifts(sorted.slice(0, 5));

            if (settingsRes.data.overtimeHourlyRate) {
                setOvertimeRateFromSettings(settingsRes.data.overtimeHourlyRate);
            }
        } catch {
            // ignore
        }
    }

    useEffect(() => {
        refreshUser();
        refreshSummary();
        api.get("/shift-types").then(res => setShiftTypes(res.data));
    }, []);

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

        // Fix time display: handle array [H, M] or string "HH:mm:ss"
        const formatTime = (val) => {
            if (Array.isArray(val)) {
                return `${String(val[0]).padStart(2, '0')}:${String(val[1]).padStart(2, '0')}`;
            }
            if (typeof val === 'string') {
                return val.slice(0, 5);
            }
            return "";
        };

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

    return (
        <Layout>
            <header className="mb-6 pt-2" dir="rtl">
                <h1 className="text-xl font-medium text-zinc-900 mb-0.5">
                    {greeting}, {userName}
                </h1>
                <p className="text-xs text-zinc-500">
                    {new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}
                </p>
            </header>

            {/* Stats - Bento Grid */}
            <section className="mb-6" dir="rtl">
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 bg-zinc-900 rounded-2xl p-5 text-white">
                        <div className="text-xs text-zinc-400 mb-1">משכורת צפויה</div>
                        <div className="text-3xl font-semibold mb-2">
                            ₪{(summary?.expectedMonthSalary ?? 0).toFixed(0)}
                        </div>
                        {summary?.totalTips > 0 && (
                            <div className="text-xs text-zinc-400">
                                לא כולל ₪{summary.totalTips.toFixed(0)} בטיפים
                            </div>
                        )}
                    </div>
                    <div className="bg-white rounded-2xl border border-zinc-200/60 p-4">
                        <div className="text-xs text-zinc-500 mb-1">שבועי</div>
                        <div className="text-2xl font-semibold text-zinc-900">
                            {(summary?.weekHours ?? 0).toFixed(1)}
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-zinc-200/60 p-4">
                        <div className="text-xs text-zinc-500 mb-1">חודשי</div>
                        <div className="text-2xl font-semibold text-zinc-900">
                            {(summary?.monthHours ?? 0).toFixed(1)}
                        </div>
                    </div>
                </div>
            </section>

            {/* Recent Shifts */}
            <section dir="rtl">
                <h2 className="text-sm font-medium text-zinc-700 mb-3">משמרות אחרונות</h2>
                <div className="space-y-2">
                    {(() => {
                        // 1. Helper: Check if a shift is currently happening
                        const isActive = (shift) => {
                            // If manually ended in this session, it's not active
                            if (shift.isEnded || endedLocalIds.includes(shift.id)) return false;

                            const now = dayjs();
                            // Helpers to parse arrays or strings from Java
                            const formatTime = (t) => Array.isArray(t) ? `${String(t[0]).padStart(2, '0')}:${String(t[1]).padStart(2, '0')}` : (t?.slice(0, 5) || "");
                            const formatDate = (d) => Array.isArray(d) ? `${d[0]}-${String(d[1]).padStart(2, '0')}-${String(d[2]).padStart(2, '0')}` : d;

                            const dateStr = formatDate(shift.date);
                            const sTime = formatTime(shift.startTime) || shiftTypeMap[shift.shiftType]?.defaultStart;
                            const eTime = formatTime(shift.endTime) || shiftTypeMap[shift.shiftType]?.defaultEnd;

                            if (dateStr && sTime && eTime) {
                                const start = dayjs(`${dateStr}T${sTime}`);
                                let end = dayjs(`${dateStr}T${eTime}`);
                                if (end.isBefore(start)) end = end.add(1, "day");

                                // Active if now is between start and end (with 5 min buffer)
                                return now.isAfter(start) && now.add(5, 'minute').isBefore(end);
                            }
                            return false;
                        };

                        // 2. Helper: Get numeric value for sorting
                        const getTime = (shift) => {
                            const dateStr = Array.isArray(shift.date) ? `${shift.date[0]}-${String(shift.date[1]).padStart(2, '0')}-${String(shift.date[2]).padStart(2, '0')}` : shift.date;
                            const timeStr = Array.isArray(shift.startTime) ? `${String(shift.startTime[0]).padStart(2, '0')}:${String(shift.startTime[1]).padStart(2, '0')}` : (shift.startTime?.slice(0, 5) || "00:00");
                            return dayjs(`${dateStr}T${timeStr}`).valueOf();
                        };

                        // 3. STRICT SEPARATION LOGIC
                        // Find the single active shift
                        const activeShift = recentShifts.find(s => isActive(s));

                        // Create history list by filtering out the active shift ID specifically
                        // We use String() comparison to be safe against number/string mismatches
                        let historyList = recentShifts.filter(s => {
                            if (activeShift && String(s.id) === String(activeShift.id)) return false;
                            return true;
                        });

                        // Sort history by time (newest first) and take top 3
                        historyList.sort((a, b) => getTime(b) - getTime(a));
                        const topHistory = historyList.slice(0, 3);

                        // Combine: If active exists, put it first. Then append the top 3 history items.
                        const displayList = activeShift ? [activeShift, ...topHistory] : topHistory;

                        // 4. Render
                        if (displayList.length === 0) {
                            return (
                                <div className="text-center py-12 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                                    <p className="text-sm text-zinc-400">אין משמרות לאחרונה</p>
                                </div>
                            );
                        }

                        return displayList.map((item) => {
                            // Recalculate ongoing status for styling
                            const ongoing = activeShift && String(item.id) === String(activeShift.id);

                            const config = shiftConfig[item.shiftType?.toLowerCase()] || shiftConfig.middle;
                            const Icon = config.icon || Clock;

                            return (
                                <div
                                    key={item.id}
                                    className={`bg-white rounded-xl border p-4 transition-all ${
                                        ongoing ? 'border-emerald-300 bg-emerald-50/30 shadow-sm relative z-10' : 'border-zinc-200/60'
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
                                                <h3 className="text-sm font-medium text-zinc-900 truncate">
                                                    {item.shiftType || item.name}
                                                </h3>
                                                {ongoing && (
                                                    <span className="flex items-center gap-1 bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    פעיל
                                </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-zinc-500 truncate">
                                                {new Date(item.date).toLocaleDateString("he-IL", { day: 'numeric', month: 'short' })}
                                                <span className="mx-1.5">•</span>
                                                {item.hours.toFixed(1)} שעות
                                            </p>
                                        </div>

                                        {/* Actions & Salary */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <div className="text-right">
                                                <div className="text-base font-semibold text-zinc-900">
                                                    ₪{(item.salary || 0).toFixed(0)}
                                                </div>
                                                {item.tipAmount > 0 && (
                                                    <div className="text-[10px] text-emerald-600 font-medium">
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
                                                    className="p-2 -ml-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>

                                                {activeMenuId === item.id && (
                                                    <div className="absolute left-0 top-9 w-36 bg-white rounded-xl shadow-xl border border-zinc-200/60 overflow-hidden z-20">
                                                        {ongoing && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveMenuId(null);
                                                                    setEndShiftId(item.id);
                                                                }}
                                                                className="w-full px-4 py-2.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 text-right flex items-center justify-end gap-2"
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
                                                            className="w-full px-4 py-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 text-right flex items-center justify-end gap-2"
                                                        >
                                                            {item.tipAmount > 0 ? 'ערוך טיפ' : 'הוסף טיפ'}
                                                            <Wallet className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditShift(item);
                                                            }}
                                                            className="w-full px-4 py-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 text-right flex items-center justify-end gap-2"
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
                        });
                    })()}

                    {recentShifts.length === 0 && (
                        <div className="text-center py-12 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                            <p className="text-sm text-zinc-400">אין משמרות</p>
                        </div>
                    )}
                </div>
            </section>

            {/* FAB */}
            <button
                onClick={handleOpenAdd}
                className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-zinc-900 text-white p-4 rounded-full shadow-lg active:scale-95 transition-transform z-40"
            >
                <Plus className="w-6 h-6" />
            </button>

            {/* Add Shift Modal */}
            {isAddOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end justify-center z-50">
                    <div className="bg-white rounded-t-2xl w-full max-w-md px-5 pt-5 pb-8 max-h-[90vh] overflow-y-auto" dir="rtl">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-medium text-zinc-900">
                                {editShiftId ? 'עריכת משמרת' : 'משמרת חדשה'}
                            </h2>
                            <button onClick={closeAddModal} className="p-2 -ml-2 rounded-lg text-zinc-400 hover:text-zinc-600 active:bg-zinc-100">
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
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 text-center text-sm font-medium text-zinc-700 focus:outline-none active:bg-zinc-100"
                            />
                        </div>

                        {/* Shift Types */}
                        <div className="mb-5">
                            {/* Main 4 shifts in 2x2 grid */}
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                {shiftTypes.filter(shift =>
                                    ['MORNING', 'EVENING', 'NIGHT', 'MIDDLE'].includes(shift.code)
                                ).map((shift) => {
                                    const config = shiftConfig[shift.code?.toLowerCase()] || shiftConfig.middle;
                                    const Icon = config.icon;
                                    const isSelected = selectedShiftCode === shift.code;

                                    return (
                                        <button
                                            key={shift.code}
                                            onClick={() => handleShiftSelect(shift)}
                                            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all active:scale-95 ${isSelected
                                                ? `bg-gradient-to-br ${config.gradient} border-transparent text-white shadow-lg`
                                                : 'border-zinc-200 bg-white text-zinc-600 active:bg-zinc-50'
                                                }`}
                                        >
                                            <div className={`p-2 rounded-full ${isSelected ? 'bg-white/20' : config.bg}`}>
                                                <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : config.color}`} />
                                            </div>
                                            <span className="text-sm font-semibold">{shift.nameHe}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* New 2 shifts as smaller buttons */}
                            <div className="flex gap-2 justify-center">
                                {shiftTypes.filter(shift =>
                                    ['7AM_UNTIL_4', '4PM_UNTIL_12'].includes(shift.code)
                                ).map((shift) => {
                                    const config = shiftConfig[shift.code?.toLowerCase()] || shiftConfig.middle;
                                    const Icon = config.icon;
                                    const isSelected = selectedShiftCode === shift.code;

                                    return (
                                        <button
                                            key={shift.code}
                                            onClick={() => handleShiftSelect(shift)}
                                            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border-2 transition-all active:scale-95 ${isSelected
                                                ? `bg-gradient-to-br ${config.gradient} border-transparent text-white shadow-lg`
                                                : 'border-zinc-200 bg-white text-zinc-600 active:bg-zinc-50'
                                                }`}
                                        >
                                            <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : config.color}`} />
                                            <span className="text-xs font-semibold">{shift.nameHe}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Times */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1">
                                <label className="text-xs text-zinc-500 mb-1.5 block text-center">התחלה</label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 text-center text-base font-medium text-zinc-900 focus:outline-none active:bg-zinc-100"
                                    dir="ltr"
                                    step="60"
                                />
                            </div>
                            <div className="text-zinc-300 pt-5">-</div>
                            <div className="flex-1">
                                <label className="text-xs text-zinc-500 mb-1.5 block text-center">סיום</label>
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 text-center text-base font-medium text-zinc-900 focus:outline-none active:bg-zinc-100"
                                    dir="ltr"
                                    step="60"
                                />
                            </div>
                        </div>

                        {/* Overtime */}
                        {!isOvertimeOpen ? (
                            <button
                                onClick={() => setIsOvertimeOpen(true)}
                                className="w-full mb-4 py-2.5 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-zinc-600 text-xs font-medium"
                            >
                                שעות נוספות +
                            </button>
                        ) : (
                            <div className="mb-4 p-3 rounded-xl bg-zinc-50 border border-dashed border-zinc-300">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-zinc-900">שעות נוספות</span>
                                    <button
                                        onClick={() => {
                                            setIsOvertimeOpen(false);
                                            setOvertimeHours('');
                                            setOvertimeRate('');
                                        }}
                                        className="text-xs text-zinc-700"
                                    >
                                        הסר
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-zinc-800 mb-1 block text-center">שעות</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.25"
                                            value={overtimeHours}
                                            onChange={(e) => setOvertimeHours(e.target.value)}
                                            onKeyDown={(e) => {
                                                // Prevent 'e', '-', '+'
                                                if (["e", "E", "-", "+"].includes(e.key)) {
                                                    e.preventDefault();
                                                }
                                            }}
                                            className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-sm text-center focus:outline-none"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-zinc-800 mb-1 block text-center">תעריף (₪)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={overtimeRate || overtimeRateFromSettings}
                                            onChange={(e) => setOvertimeRate(e.target.value)}
                                            className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-sm text-center focus:outline-none"
                                            placeholder={overtimeRateFromSettings || '0'}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleCreateShift}
                            disabled={!selectedShiftCode || !startTime || !endTime}
                            className="w-full bg-zinc-900 text-white py-3.5 rounded-xl font-medium disabled:opacity-50 active:scale-95 transition-transform"
                        >
                            שמור
                        </button>
                    </div>
                </div>
            )}

            {/* Tip Modal */}
            {isTipOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-xs p-5" dir="rtl">
                        <h3 className="text-lg font-medium text-zinc-900 mb-4 text-center">כמה טיפים?</h3>
                        <div className="relative mb-4">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">₪</span>
                            <input
                                type="number"
                                value={tipAmount}
                                onChange={(e) => setTipAmount(e.target.value)}
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-4 px-4 text-center text-2xl font-semibold text-zinc-900 focus:outline-none"
                                placeholder="0"
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsTipOpen(false)}
                                className="flex-1 py-3 rounded-xl font-medium text-zinc-600 active:bg-zinc-50"
                            >
                                ביטול
                            </button>
                            <button
                                onClick={handleAddTip}
                                disabled={!tipAmount || Number(tipAmount) <= 0}
                                className="flex-1 bg-zinc-900 text-white py-3 rounded-xl font-medium disabled:opacity-50 active:scale-95 transition-transform"
                            >
                                שמור
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteShiftId && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-xs p-6" dir="rtl">
                        <div className="flex flex-col items-center justify-center text-center mb-6">
                            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-zinc-900 mb-1">מחיקת משמרת</h3>
                            <p className="text-sm text-zinc-500">
                                האם את/ה בטוח/ה שברצונך למחוק את המשמרת? לא ניתן לשחזר פעולה זו.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteShiftId(null)}
                                className="flex-1 py-2.5 rounded-xl font-medium text-zinc-700 bg-zinc-50 hover:bg-zinc-100 transition-colors"
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
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-xs p-6" dir="rtl">
                        <div className="flex flex-col items-center justify-center text-center mb-6">
                            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                                <Clock className="w-6 h-6 text-emerald-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-zinc-900 mb-1">סיום משמרת</h3>
                            <p className="text-sm text-zinc-500 leading-relaxed">
                                האם ברצונך לסיים את המשמרת כעת?
                                <br />
                                שעת הסיום תעודכן לשעה {dayjs().format("HH:mm")}.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setEndShiftId(null)}
                                className="flex-1 py-2.5 rounded-xl font-medium text-zinc-700 bg-zinc-50 hover:bg-zinc-100 transition-colors"
                            >
                                ביטול
                            </button>
                            <button
                                onClick={handleEndShift}
                                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-medium hover:bg-emerald-700 active:scale-95 transition-all shadow-sm shadow-emerald-200"
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
