import { useEffect, useState, useMemo } from "react";
import { Sun, Sunset, Moon, Clock, MoreVertical, Wallet, Pencil, Trash2, X } from "lucide-react";
import Layout from "../components/Layout";
import api from "../api/client";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function HistoryPage() {
    // --- Data States ---
    const [items, setItems] = useState([]);
    const [shiftTypes, setShiftTypes] = useState([]);
    const [filter, setFilter] = useState("all");

    // --- UI States (Menu & Modals) ---
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isTipOpen, setIsTipOpen] = useState(false);

    // --- Form States (For Editing) ---
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
    const shiftTypeMap = useMemo(() => {
        const map = {};
        shiftTypes.forEach(t => { map[t.nameHe] = t; map[t.code] = t; });
        return map;
    }, [shiftTypes]);

    const shiftConfig = {
        morning: { icon: Sun, color: 'text-amber-600', bg: 'bg-amber-50' },
        evening: { icon: Sunset, color: 'text-orange-600', bg: 'bg-orange-50' },
        night: { icon: Moon, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        middle: { icon: Clock, color: 'text-teal-600', bg: 'bg-teal-50' }
    };

    // --- Load Data ---
    async function loadHistory() {
        try {
            const res = await api.get("/history");
            setItems(res.data.items ?? []);
        } catch { /* ignore */ }
    }

    useEffect(() => {
        loadHistory();
        api.get("/shift-types").then(res => setShiftTypes(res.data)).catch(() => {});

        // Close menu on click outside
        const handleClickOutside = () => setActiveMenuId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    // --- Handlers ---
    const handleShiftSelect = (shift) => {
        setSelectedShiftCode(shift.code);
        setStartTime(shift.defaultStart);
        setEndTime(shift.defaultEnd);
    };

    const handleEditShift = (shift) => {
        setEditShiftId(shift.id);
        setSelectedDate(shift.date);
        const t = shiftTypeMap[shift.shiftType];
        if (t) setSelectedShiftCode(t.code);
        setStartTime(shift.startTime?.slice(0, 5) || "");
        setEndTime(shift.endTime?.slice(0, 5) || "");
        setOvertimeHours(shift.overtimeHours || "");
        setOvertimeRate(shift.overtimeHourlyRate || "");
        setIsOvertimeOpen(!!shift.overtimeHours);
        setIsEditOpen(true);
        setActiveMenuId(null);
    };

    const handleSaveShift = async () => {
        if (!selectedShiftCode || !selectedDate) return;
        try {
            const payload = {
                shiftCode: selectedShiftCode,
                date: selectedDate,
                startTime,
                endTime,
                overtimeHours: overtimeHours ? Number(overtimeHours) : 0,
                overtimeHourlyRate: overtimeRate ? Number(overtimeRate) : null,
            };
            await api.put(`/shifts/${editShiftId}`, payload);
            closeModals();
            loadHistory();
        } catch { alert("שגיאה בשמירה"); }
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
    const filteredItems = items.filter((item) => {
        const itemDate = new Date(item.date);
        const now = new Date();
        if (filter === "all") return true;
        if (filter === "week") return itemDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (filter === "month") return itemDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (filter === "year") return itemDate >= new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        return true;
    });

    return (
        <Layout>
            <header className="mb-6 pt-2" dir="rtl">
                <h1 className="text-xl font-medium text-zinc-900">היסטוריה</h1>
            </header>

            {/* Filter Tabs */}
            <section className="mb-4 flex gap-2 rounded-xl bg-zinc-100 p-1 text-xs" dir="rtl">
                {['all', 'week', 'month', 'year'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`flex-1 rounded-lg px-3 py-2 font-medium transition-all ${
                            filter === f ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500"
                        }`}
                    >
                        {{ all: 'הכל', week: 'שבוע', month: 'חודש', year: 'שנה' }[f]}
                    </button>
                ))}
            </section>

            {/* History List */}
            <section className="space-y-2 pb-24" dir="rtl">
                {filteredItems.map((item) => {
                    const config = shiftConfig[item.shiftType?.toLowerCase()] || shiftConfig.middle;
                    const Icon = config.icon || Clock;

                    return (
                        <div
                            key={item.id}
                            className="bg-white rounded-xl border border-zinc-200/60 p-4 transition-all hover:border-zinc-300 relative"
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
                                        {item.overtimeHours > 0 && (
                                            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-semibold">
                                                +{item.overtimeHours}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-zinc-500 truncate">
                                        {new Date(item.date).toLocaleDateString("he-IL", { day: 'numeric', month: 'short' })}
                                        <span className="mx-1.5">•</span>
                                        {item.hours.toFixed(1)} שעות
                                    </p>
                                </div>

                                {/* Salary & Menu */}
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <div className="text-right">
                                        <div className="text-base font-semibold text-zinc-900">
                                            ₪{item.salary.toFixed(0)}
                                        </div>
                                        {item.tipAmount > 0 && (
                                            <div className="text-[10px] text-emerald-600 font-medium">
                                                +₪{item.tipAmount}
                                            </div>
                                        )}
                                    </div>

                                    {/* Menu Button */}
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

                                        {/* Dropdown */}
                                        {activeMenuId === item.id && (
                                            <div className="absolute left-0 top-9 w-36 bg-white rounded-xl shadow-xl border border-zinc-200/60 overflow-hidden z-20">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleOpenTip(item.id, item.tipAmount); }}
                                                    className="w-full px-4 py-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 text-right flex items-center justify-end gap-2"
                                                >
                                                    {item.tipAmount > 0 ? 'ערוך טיפ' : 'הוסף טיפ'}
                                                    <Wallet className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEditShift(item); }}
                                                    className="w-full px-4 py-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 text-right flex items-center justify-end gap-2"
                                                >
                                                    עריכה
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteShift(item.id); }}
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
                })}
                {filteredItems.length === 0 && (
                    <div className="text-center py-12 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                        <p className="text-sm text-zinc-400">אין נתונים להצגה</p>
                    </div>
                )}
            </section>

            {/* Edit Shift Modal (Copied from HomePage) */}
            {isEditOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end justify-center z-50">
                    <div className="bg-white rounded-t-2xl w-full max-w-md px-5 pt-5 pb-8 max-h-[90vh] overflow-y-auto" dir="rtl">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-medium text-zinc-900">עריכת משמרת</h2>
                            <button onClick={closeModals} className="p-2 -ml-2 rounded-lg text-zinc-400 hover:text-zinc-600 active:bg-zinc-100">
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
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 text-center text-sm font-medium text-zinc-700 focus:outline-none"
                            />
                        </div>

                        {/* Shift Types */}
                        <div className="grid grid-cols-2 gap-3 mb-5">
                            {shiftTypes.map((shift) => {
                                const config = shiftConfig[shift.code?.toLowerCase()] || shiftConfig.middle;
                                const Icon = config.icon;
                                const isSelected = selectedShiftCode === shift.code;
                                return (
                                    <button
                                        key={shift.code}
                                        onClick={() => handleShiftSelect(shift)}
                                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all active:scale-95 ${
                                            isSelected
                                                ? 'bg-zinc-800 border-zinc-800 text-white shadow-md'
                                                : 'border-zinc-200 bg-white text-zinc-600'
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

                        {/* Times */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1">
                                <label className="text-xs text-zinc-500 mb-1.5 block text-center">התחלה</label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 text-center text-base font-medium text-zinc-900 focus:outline-none"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-zinc-500 mb-1.5 block text-center">סיום</label>
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 text-center text-base font-medium text-zinc-900 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Overtime */}
                        {!isOvertimeOpen ? (
                            <button
                                onClick={() => setIsOvertimeOpen(true)}
                                className="w-full mb-4 py-2.5 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-zinc-600 text-xs font-medium"
                            >
                                + שעות נוספות
                            </button>
                        ) : (
                            <div className="mb-4 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-zinc-900">שעות נוספות</span>
                                    <button onClick={() => { setIsOvertimeOpen(false); setOvertimeHours(''); }} className="text-xs text-zinc-700">הסר</button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-zinc-500 mb-1 block text-center">שעות</label>
                                        <input type="number" value={overtimeHours} onChange={(e) => setOvertimeHours(e.target.value)} className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-sm text-center" placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-zinc-500 mb-1 block text-center">תעריף (₪)</label>
                                        <input type="number" value={overtimeRate} onChange={(e) => setOvertimeRate(e.target.value)} className="w-full bg-white border border-zinc-200 rounded-lg py-2 px-3 text-sm text-center" placeholder="100%" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <button onClick={handleSaveShift} className="w-full bg-zinc-900 text-white py-3.5 rounded-xl font-medium active:scale-95 transition-transform">
                            שמור שינויים
                        </button>
                    </div>
                </div>
            )}

            {/* Tip Modal */}
            {isTipOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-xs p-5" dir="rtl">
                        <h3 className="text-lg font-medium text-zinc-900 mb-4 text-center">עריכת טיפ</h3>
                        <div className="relative mb-4">
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
                            <button onClick={closeModals} className="flex-1 py-3 rounded-xl font-medium text-zinc-600 bg-zinc-50">ביטול</button>
                            <button onClick={handleSaveTip} className="flex-1 bg-zinc-900 text-white py-3 rounded-xl font-medium">שמור</button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}