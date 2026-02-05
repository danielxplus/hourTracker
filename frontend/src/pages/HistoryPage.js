import { useEffect, useState, useMemo } from "react";
import dayjs from "dayjs";
import { Clock, MoreVertical, Wallet, Pencil, Trash2, X, List, Calendar } from "lucide-react";
import Layout from "../components/Layout";
import ShiftForm from "../components/ShiftForm";
import CalendarView from "../components/CalendarView";
import { shiftConfig, getShiftTypeMap } from "../utils/shiftUtils";
import api from "../api/client";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function HistoryPage() {
    // Default to 60 or a safe number so we never send 0 if settings fail to load
    const [overtimeRateFromSettings, setOvertimeRateFromSettings] = useState(60);
    const [isPremium, setIsPremium] = useState(true);
    const [viewMode, setViewMode] = useState("list"); // "list" or "calendar"

    // --- Data States ---
    const [items, setItems] = useState([]);
    const [shiftTypes, setShiftTypes] = useState([]);
    const [filter, setFilter] = useState("all");

    // --- UI States ---
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isTipOpen, setIsTipOpen] = useState(false);

    // --- Form States ---
    const [editShiftId, setEditShiftId] = useState(null);
    const [selectedShiftCode, setSelectedShiftCode] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [isOvertimeOpen, setIsOvertimeOpen] = useState(false);
    const [overtimeHours, setOvertimeHours] = useState("");
    const [overtimeRate, setOvertimeRate] = useState("");

    // --- Tip States ---
    const [tipAmount, setTipAmount] = useState("");
    const [tipShiftId, setTipShiftId] = useState(null);

    // --- Helpers ---
    const formatTime = useMemo(() => (val) => {
        if (Array.isArray(val)) {
            return `${String(val[0]).padStart(2, '0')}:${String(val[1]).padStart(2, '0')}`;
        }
        if (typeof val === 'string') return val.slice(0, 5);
        return "";
    }, []);

    const formatDate = useMemo(() => (d) => {
        if (Array.isArray(d)) {
            return `${d[0]}-${String(d[1]).padStart(2, '0')}-${String(d[2]).padStart(2, '0')}`;
        }
        return d;
    }, []);

    const shiftTypeMap = useMemo(() => getShiftTypeMap(shiftTypes), [shiftTypes]);

    // --- Load Data ---
    async function loadHistory() {
        try {
            const res = await api.get("/history");
            setItems(res.data.items ?? []);
        } catch { /* ignore */ }
    }

    useEffect(() => {
        loadHistory();
        api.get("/shift-types").then(res => setShiftTypes(res.data)).catch(() => { });
        api.get("/settings").then(res => {
            if (res.data.overtimeHourlyRate) {
                setOvertimeRateFromSettings(res.data.overtimeHourlyRate);
            }
            setIsPremium(res.data.isPremium ?? true);
        }).catch(() => { });

        const handleClickOutside = () => setActiveMenuId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    // --- Handlers ---
    const handleEditShift = (shift) => {
        setEditShiftId(shift.id);
        setSelectedDate(shift.date);

        // Match the shift code
        const t = shiftTypeMap[shift.shiftType] || shiftTypeMap[shift.shiftCode];
        if (t) setSelectedShiftCode(t.code);

        setStartTime(shift.startTime?.slice(0, 5) || "");
        setEndTime(shift.endTime?.slice(0, 5) || "");

        // Handle Overtime
        setOvertimeHours(shift.overtimeHours || "");
        setOvertimeRate(shift.overtimeHourlyRate || "");
        setIsOvertimeOpen(!!shift.overtimeHours && shift.overtimeHours > 0);

        setIsEditOpen(true);
        setActiveMenuId(null);
    };

    const handleSaveShift = async () => {
        // 2. CRITICAL FIX: Validate Times!
        // Sending empty strings "" for time often causes Backend 500 errors
        if (!selectedShiftCode || !selectedDate || !startTime || !endTime) {
            alert("נא למלא את כל פרטי המשמרת (תאריך, סוג, ושעות)");
            return;
        }

        const finalHours = overtimeHours ? Number(overtimeHours) : 0;

        // 3. Robust Rate Logic (Prevent sending 0 if hours exist)
        let finalRate = 0;
        if (finalHours > 0) {
            finalRate = overtimeRate ? Number(overtimeRate) : (Number(overtimeRateFromSettings) || 60);
        }

        try {
            const payload = {
                shiftCode: selectedShiftCode,
                date: selectedDate,
                startTime,
                endTime,
                overtimeHours: finalHours,
                overtimeHourlyRate: finalRate
            };

            await api.put(`/shifts/${editShiftId}`, payload);

            closeModals();
            loadHistory();
        } catch (error) {
            console.error("Failed to save shift:", error);
            alert("שגיאה בשמירה: " + (error.response?.data?.message || "נא לנסות שוב"));
        }
    };

    const handleDeleteShift = async (id) => {
        setActiveMenuId(null);
        if (window.confirm("האם למחוק את המשמרת?")) {
            try {
                await api.delete(`/shifts/${id}`);
                loadHistory();
            } catch { alert("שגיאה במחיקה"); }
        }
    };

    const handleOpenTip = (shiftId, currentTip) => {
        setTipShiftId(shiftId);
        setTipAmount(currentTip ? String(currentTip) : "");
        setIsTipOpen(true);
        setActiveMenuId(null);
    };

    const handleSaveTip = async () => {
        if (!tipShiftId) return;
        try {
            await api.post(`/shifts/${tipShiftId}/tip`, { tipAmount: Number(tipAmount) });
            closeModals();
            loadHistory();
        } catch { console.error("Error saving tip"); }
    };

    const closeModals = () => {
        setIsEditOpen(false);
        setIsTipOpen(false);
        setEditShiftId(null);
        setTipShiftId(null);
    };

    // --- Filtering ---
    const filteredItems = useMemo(() => {
        if (filter === "all") return items;

        const now = dayjs();
        let cutoff = null;

        if (filter === "week") {
            // Week starts Sunday at 06:29 am
            cutoff = now.startOf('day').day(0).hour(6).minute(29).second(0).millisecond(0);
            if (now.isBefore(cutoff)) {
                cutoff = cutoff.subtract(1, 'week');
            }
        } else if (filter === "month") {
            // Month starts 1st at 06:29 am
            cutoff = now.startOf('month').hour(6).minute(29).second(0).millisecond(0);
            if (now.isBefore(cutoff)) {
                cutoff = cutoff.subtract(1, 'month');
            }
        } else if (filter === "year") {
            // Jan 1st at 06:29 am
            cutoff = now.startOf('year').hour(6).minute(29).second(0).millisecond(0);
            if (now.isBefore(cutoff)) {
                cutoff = cutoff.subtract(1, 'year');
            }
        }

        console.log("Filter:", filter, "Cutoff:", cutoff ? cutoff.format() : "None");

        return items.filter((item) => {
            const dateStr = formatDate(item.date);
            const timeStr = formatTime(item.startTime) || "00:00";
            const itemDateTime = dayjs(`${dateStr}T${timeStr}`);

            return itemDateTime.isAfter(cutoff) || itemDateTime.isSame(cutoff);
        });
    }, [items, filter, formatDate, formatTime]);

    return (
        <Layout>
            <header className="mb-6 pt-2" dir="rtl">
                <h1 className="text-xl font-medium text-skin-text-primary mb-0.5">היסטוריה</h1>

                {/* View Toggle */}
                <div className="flex gap-1 bg-skin-bg-secondary p-1 rounded-lg w-fit mt-2">
                    <button
                        onClick={() => setViewMode("list")}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === "list"
                            ? "bg-skin-card-bg shadow-sm text-skin-text-primary"
                            : "text-skin-text-secondary hover:text-skin-text-primary"
                            }`}
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode("calendar")}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === "calendar"
                            ? "bg-skin-card-bg shadow-sm text-skin-text-primary"
                            : "text-skin-text-secondary hover:text-skin-text-primary"
                            }`}
                    >
                        <Calendar className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {viewMode === "calendar" ? (
                /* Calendar View */
                <CalendarView
                    shifts={items}
                    isPremium={isPremium}
                    onDayClick={(dayShifts) => {
                        // Could open a modal showing shifts for that day
                        console.log("Day shifts:", dayShifts);
                    }}
                />
            ) : (
                /* List View */
                <>
                    {/* Filter Tabs */}
                    <section className="mb-4 flex gap-2 rounded-xl bg-skin-bg-secondary p-1 text-xs border border-skin-border-secondary shadow-sm mx-1" dir="rtl">
                        {['all', 'week', 'month', 'year'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`flex-1 rounded-xl px-3 py-2.5 font-semibold transition-all duration-200 ${filter === f
                                    ? "bg-skin-card-bg shadow-md text-skin-accent-primary scale-[1.02] ring-1 ring-skin-border-secondary/30"
                                    : "text-skin-text-tertiary hover:text-skin-text-secondary hover:bg-skin-bg-primary/50"
                                    }`}
                            >
                                {{ all: 'הכל', week: 'שבוע', month: 'חודש', year: 'שנה' }[f]}
                            </button>
                        ))}
                    </section>

                    {/* History List */}
                    <section className="space-y-2 pb-24" dir="rtl">
                        {filteredItems.map((item) => {
                            // Safety check: item.shiftType might be null if data is old
                            const typeKey = (item.shiftType || item.shiftCode || "middle").toLowerCase();
                            const config = shiftConfig[typeKey] || shiftConfig.middle;
                            const Icon = config.icon || Clock;

                            return (
                                <div key={item.id} className="bg-skin-card-bg rounded-xl border border-skin-border-secondary p-4 relative">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${config.bg} ${config.color} flex-shrink-0`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className="text-sm font-medium text-skin-text-primary truncate">
                                                    {item.shiftType || "משמרת"}
                                                </h3>
                                                {item.overtimeHours > 0 && (
                                                    <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-semibold">
                                                        +{item.overtimeHours}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-skin-text-secondary truncate">
                                                {new Date(item.date).toLocaleDateString("he-IL", { day: 'numeric', month: 'short' })}
                                                <span className="mx-1.5">•</span>
                                                {item.hours?.toFixed(1) || 0} שעות
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <div className="text-right">
                                                <div className="text-base font-semibold text-skin-text-primary">
                                                    ₪{(item.salary || 0).toFixed(0)}
                                                </div>
                                                {item.tipAmount > 0 && (
                                                    <div className="text-[10px] text-emerald-600 font-medium">
                                                        +₪{item.tipAmount}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveMenuId(activeMenuId === item.id ? null : item.id);
                                                    }}
                                                    className="p-2 -ml-2 rounded-lg text-skin-text-secondary hover:text-skin-text-primary hover:bg-skin-bg-secondary"
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                                {activeMenuId === item.id && (
                                                    <div className="absolute left-0 top-9 w-36 bg-skin-card-bg rounded-xl shadow-xl border border-skin-border-secondary overflow-hidden z-20">
                                                        <button onClick={(e) => { e.stopPropagation(); handleOpenTip(item.id, item.tipAmount); }} className="w-full px-4 py-2.5 text-xs font-medium text-skin-text-primary hover:bg-skin-bg-secondary text-right flex items-center justify-end gap-2">
                                                            {item.tipAmount > 0 ? 'ערוך טיפ' : 'הוסף טיפ'} <Wallet className="w-3 h-3" />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleEditShift(item); }} className="w-full px-4 py-2.5 text-xs font-medium text-skin-text-primary hover:bg-skin-bg-secondary text-right flex items-center justify-end gap-2">
                                                            עריכה <Pencil className="w-3 h-3" />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteShift(item.id); }} className="w-full px-4 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 text-right flex items-center justify-end gap-2">
                                                            מחיקה <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </section>
                </>
            )}

            {/* Edit Shift Modal */}
            {isEditOpen && (
                <div className="fixed inset-0 bg-skin-modal-overlay backdrop-blur-sm flex items-end justify-center z-50">
                    <div className="bg-skin-card-bg rounded-t-2xl w-full max-w-md px-5 pt-5 pb-8 max-h-[90vh] overflow-y-auto" dir="rtl">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-medium text-skin-text-primary">עריכת משמרת</h2>
                            <button onClick={closeModals} className="p-2 -ml-2 rounded-lg text-skin-text-secondary hover:text-skin-text-primary active:bg-skin-bg-secondary">
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
                                dateFormat="dd/MM/yyyy"
                                wrapperClassName="w-full"
                                className="w-full bg-skin-bg-secondary border border-skin-border-primary rounded-xl py-3 text-center text-sm font-medium text-skin-text-primary focus:outline-none"
                            />
                        </div>

                        {/* 4. Use ShiftForm (Replaces duplicate code) */}
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
                            overtimeRateFromSettings={overtimeRateFromSettings}
                        />

                        <button onClick={handleSaveShift} className="w-full bg-skin-accent-primary text-white py-3.5 rounded-xl font-medium active:scale-95 transition-transform">
                            שמור שינויים
                        </button>
                    </div>
                </div>
            )}

            {/* Tip Modal */}
            {isTipOpen && (
                <div className="fixed inset-0 bg-skin-modal-overlay backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-skin-card-bg rounded-2xl w-full max-w-xs p-5" dir="rtl">
                        <h3 className="text-lg font-medium text-skin-text-primary mb-4 text-center">עריכת טיפ</h3>
                        <div className="relative mb-4">
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
                            <button onClick={closeModals} className="flex-1 py-3 rounded-xl font-medium text-skin-text-secondary bg-skin-bg-secondary">ביטול</button>
                            <button onClick={handleSaveTip} className="flex-1 bg-skin-accent-primary text-white py-3 rounded-xl font-medium">שמור</button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}