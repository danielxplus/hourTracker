import {useEffect, useMemo, useState} from "react";
import {Sun, Sunset, Moon, Clock, X, Plus, Wallet} from "lucide-react";
import Layout from "../components/Layout";
import StatCard from "../components/StatCard";
import {useAuth} from "../context/AuthContext";
import api from "../api/client";
import dayjs from "dayjs";

function getGreeting(hour) {
    if (hour >= 5 && hour < 12) return "בוקר טוב";
    if (hour >= 12 && hour < 17) return "צהריים טובים";
    if (hour >= 17 && hour < 22) return "ערב טוב";
    return "לילה טוב";
}

export default function HomePage() {
    const {user, refreshUser} = useAuth();
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

    const shiftTypeMap = useMemo(() => {
        const map = {};
        shiftTypes.forEach(t => {
            map[t.nameHe] = t;
            map[t.code] = t;
        });
        return map;
    }, [shiftTypes]);


    useEffect(() => {
        async function load() {
            try {
                refreshUser();

                // Load data with individual error handling
                const summaryPromise = api.get("/summary").catch(() => null);
                const historyPromise = api.get("/history").catch(() => null);
                const typesPromise = api.get("/shift-types").catch((err) => {
                    console.error("Error loading shift types:", err);
                    // Return default shift types if API fails
                    return {
                        data: [{
                            code: 'morning',
                            nameHe: 'בוקר',
                            defaultStart: '06:00',
                            defaultEnd: '14:00',
                            emoji: Sun
                        }, {
                            code: 'evening',
                            nameHe: 'ערב',
                            defaultStart: '14:00',
                            defaultEnd: '22:00',
                            emoji: Sunset
                        }, {code: 'night', nameHe: 'לילה', defaultStart: '22:00', defaultEnd: '06:00', emoji: Moon}]
                    };
                });
                const settingsPromise = api.get("/settings").catch(() => ({data: {overtimeHourlyRate: 0}}));

                const [summaryRes, historyRes, typesRes, settingsRes] = await Promise.all([summaryPromise, historyPromise, typesPromise, settingsPromise]);

                if (summaryRes) setSummary(summaryRes.data);
                if (historyRes && historyRes.data.items) {
                    // Get the 3 most recent shifts
                    const recent = historyRes.data.items.slice(0, 3);
                    setRecentShifts(recent);
                }
                console.log("Shift types loaded:", typesRes.data);
                setShiftTypes(typesRes.data || []);
                setOvertimeRateFromSettings(settingsRes.data.overtimeHourlyRate || 0);
            } catch (e) {
                console.error("Error loading data:", e);
                // Set default shift types as fallback
                setShiftTypes([{
                    code: 'morning',
                    nameHe: 'משמרת בוקר',
                    defaultStart: '06:30',
                    defaultEnd: '15:30'
                }, {code: 'evening', nameHe: 'משמרת ערב', defaultStart: '14:30', defaultEnd: '23:15'}, {
                    code: 'night',
                    nameHe: 'משמרת לילה',
                    defaultStart: '22:30',
                    defaultEnd: '07:15'
                }, {code: 'middle', nameHe: 'משמרת מידל', defaultStart: '11:30', defaultEnd: '20:30'}]);
            }
        }

        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const shiftConfig = {
        morning: {
            icon: Sun, gradient: 'from-amber-300 to-orange-500', hoverGradient: 'from-amber-400 to-orange-600'
        }, evening: {
            icon: Sunset, gradient: 'from-orange-500 to-blue-700', hoverGradient: 'from-orange-600 to-blue-800'
        }, night: {
            icon: Moon, gradient: 'from-blue-700 to-violet-800', hoverGradient: 'from-blue-800 to-violet-900'
        }, middle: {
            icon: Clock, gradient: 'from-teal-400 to-emerald-500',
        }
    };

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        return getGreeting(hour);
    }, []);

    const userName = user?.displayName || "אורח";

    async function refreshSummary() {
        try {
            const [summaryRes, historyRes] = await Promise.all([api.get("/summary"), api.get("/history")]);
            setSummary(summaryRes.data);
            if (historyRes.data.items) {
                const recent = historyRes.data.items.slice(0, 3);
                setRecentShifts(recent);
            }
        } catch {
            // ignore
        }
    }

    const calculateHours = (start, end) => {
        if (!start || !end) return 0;
        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);
        let hours = endH - startH;
        let minutes = endM - startM;
        if (minutes < 0) {
            hours -= 1;
            minutes += 60;
        }
        if (hours < 0) hours += 24;
        return hours + minutes / 60;
    };

    const totalHours = calculateHours(startTime, endTime);

    const handleShiftSelect = (shift) => {
        setSelectedShiftCode(shift.code);
        setStartTime(shift.defaultStart);
        setEndTime(shift.defaultEnd);
    };

    async function handleCreateShift() {
        if (!selectedShiftCode || !selectedDate) return;
        try {
            await api.post("/shifts", {
                shiftCode: selectedShiftCode,
                date: selectedDate,
                startTime,
                endTime,
                overtimeHours: overtimeHours ? Number(overtimeHours) : 0,
                overtimeHourlyRate: overtimeRate
                    ? Number(overtimeRate)
                    : (overtimeHours ? overtimeRateFromSettings : null),
            });
            setIsAddOpen(false);
            setSelectedShiftCode(null);
            setStartTime("");
            setEndTime("");
            setIsOvertimeOpen(false);
            setOvertimeHours("");
            setOvertimeRate("");
            await refreshSummary();
            await refreshUser();
        } catch {
            // likely not logged in yet
        }
    }

    const handleOpenTip = (shiftId) => {
        setTipShiftId(shiftId);
        setTipAmount("");
        setIsTipOpen(true);
    };

    async function handleAddTip() {
        if (!tipShiftId || !tipAmount) return;
        try {
            await api.post(`/shifts/${tipShiftId}/tip`, {
                tipAmount: Number(tipAmount)
            });
            setIsTipOpen(false);
            setTipShiftId(null);
            setTipAmount("");
            await refreshSummary();
            await refreshUser();
        } catch (error) {
            console.error("Error adding tip:", error);
        }
    }

    function formatDateForDisplay(dateStr) {
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    }

    return (<Layout>
        <header className="mb-6">
            <div className="flex flex-col gap-1 text-right">
                <h1 className="text-xl font-semibold text-slate-900">
                    {greeting}, {userName}
                </h1>
                <p className="text-xs text-slate-500">
                    {new Date().toLocaleDateString("he-IL", {
                        weekday: "long", month: "long", day: "numeric", year: "numeric",
                    })}
                </p>
            </div>
        </header>

        <section className="space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-3">
                <StatCard
                    title="שעות השבוע"
                    value={(summary?.weekHours ?? 0).toFixed(1)}
                    tone="primary"
                />
                <StatCard
                    title="שעות החודש"
                    value={(summary?.monthHours ?? 0).toFixed(1)}
                    tone="green"
                />
            </div>
            <StatCard
                title="משכורת צפויה החודש"
                value={`₪${(summary?.expectedMonthSalary ?? 0).toFixed(0)}`}
                subtitle={`₪${(summary?.totalTips ?? 0).toFixed(0)} בטיפים`}
                tone="dark"
                align="center"
            />
        </section>

        <section className="mt-6">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">
                משמרות אחרונות
            </h2>
            <div className="space-y-3">
                            {recentShifts.map((item) => {

                const now = dayjs();
                let ongoing = false;

                const type = shiftTypeMap[item.shiftType];

                if (type?.defaultStart && type?.defaultEnd) {
                    const start = dayjs(`${item.date}T${type.defaultStart}`);
                    let end = dayjs(`${item.date}T${type.defaultEnd}`);

                    // Night shift → next day
                    if (end.isBefore(start)) {
                        end = end.add(1, "day");
                    }

                    ongoing = now.isAfter(start) && now.isBefore(end);
                }

                return (
                        <article
                            key={item.id}
                            className={`rounded-2xl bg-white border px-4 py-4 shadow-sm transition-all duration-300 ${
                                ongoing 
                                    ? 'border-emerald-400 shadow-md ring-1 ring-emerald-50' 
                                    : 'border-slate-200'
                            }`}
                        >
                            {/* Top Row: Shift Type and Salary */}
                            <div className="flex items-center justify-between mb-1">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                {item.shiftType || item.name}
                                {ongoing && (
                                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                        פעיל
                                    </span>
                                )}
                            </h3>
                                <span className="text-2xl font-bold text-emerald-600">
                                    ₪{item.salary.toFixed(0)}
                                </span>
                            </div>

                            {/* Middle Row: Date and Total Hours */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-1 text-sm text-slate-500">
                                    <span>{new Date(item.date).toLocaleDateString("he-IL", { weekday: "long" })}</span>
                                    <span>•</span>
                                    <span>{new Date(item.date).toLocaleDateString("he-IL", { day: "numeric", month: "short" })}</span>
                                </div>
                                <span className="text-sm font-medium text-slate-500">
                                    {item.hours.toFixed(1)} שעות
                                </span>
                            </div>

                            {/* Badges and Button... (rest of your code) */}
                            <button
                                onClick={() => handleOpenTip(item.id)}
                                className="w-full rounded-xl bg-[#10b981] hover:bg-[#059669] text-white py-3 px-4 text-base font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                            >
                                <Wallet className="w-5 h-5" />
                                הוסף טיפ
                            </button>
                        </article>
                    ); // End of return
                })}
                {recentShifts.length === 0 && (<p className="text-xs text-slate-400 text-center">
                    עדיין אין משמרות שמורות. {!user ? 'התחבר כדי להתחיל לעקוב.' : ''}
                </p>)}
            </div>
        </section>

        {/* Floating Action Button */}
        <button
            onClick={() => setIsAddOpen(true)}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-purple-600 text-white px-8 py-4 rounded-2xl shadow-xl shadow-violet-500/30 flex items-center gap-3 font-semibold z-40 hover:from-violet-700 hover:to-purple-700 transition-all"
        >
            <Plus className="w-5 h-5"/>
            הוסף משמרת
        </button>

        {/* Add Shift Modal */}
        {isAddOpen && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center z-50">
                <div className="bg-white rounded-t-3xl max-w-md w-full px-6 pt-6 pb-8 max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-slate-900">
                            הוספת משמרת חדשה
                        </h2>
                        <button
                            onClick={() => setIsAddOpen(false)}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="w-5 h-5"/>
                        </button>
                    </div>

                    {/* Date Input */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-600 mb-2 text-right">
                            תאריך
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-left focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                        />
                        <p className="text-xs text-slate-400 mt-2 text-right">
                            {formatDateForDisplay(selectedDate)}
                        </p>
                    </div>

                    {/* Shift Type Selector */}
                    <div className="mb-6">
                        <p className="text-sm font-medium text-slate-600 mb-3 text-right">
                            בחר סוג משמרת
                        </p>

                        {shiftTypes.length > 0 ? (<div className="grid grid-cols-2 gap-4">
                            {shiftTypes.map((shift) => {
                                const config = shiftConfig[shift.code?.toLowerCase()] || {
                                    icon: Clock, gradient: 'from-slate-400 to-slate-500',
                                };

                                const Icon = config.icon;
                                const isSelected = selectedShiftCode === shift.code;

                                return (<button
                                    key={shift.code}
                                    type="button"
                                    onClick={() => handleShiftSelect(shift)}
                                    className={`relative flex flex-col items-center justify-center rounded-2xl p-5 border-2 transition-all duration-300 ${isSelected ? `bg-gradient-to-br ${config.gradient} text-white border-transparent shadow-lg scale-[1.02]` : 'bg-white text-slate-700 border-slate-100 hover:border-slate-200 shadow-sm'}`}
                                >
                                    <div
                                        className={`mb-3 p-2.5 rounded-full ${isSelected ? 'bg-white/20' : 'bg-slate-50'}`}>
                                        <Icon
                                            className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-slate-400'}`}/>
                                    </div>
                                    <div className="font-bold text-sm whitespace-nowrap">
                                        {shift.nameHe}
                                    </div>
                                </button>);
                            })}
                        </div>) : (<div className="text-center py-8">
                            <p className="text-slate-400 text-sm">טוען סוגי משמרות...</p>
                        </div>)}
                    </div>

                    {/* Time Inputs */}
                    <p className="text-sm font-medium text-slate-600 mb-3 text-right">משמרת מותאמת אישית</p>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="text-sm font-medium text-slate-600 block mb-2 text-right">שעת
                                התחלה</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full text-center text-lg h-12 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-600 block mb-2 text-right">שעת
                                סיום</label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full text-center text-lg h-12 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Overtime Section */}
                    {!isOvertimeOpen && (<button
                        type="button"
                        onClick={() => setIsOvertimeOpen(true)}
                        className="w-full mb-6 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 text-slate-600 py-3 text-sm font-medium hover:border-violet-400 hover:bg-violet-50/50 hover:text-violet-700 transition-all"
                    >
                        + הוסף שעות נוספות
                    </button>)}

                    {isOvertimeOpen && (<div
                        className="mb-6 p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-medium text-amber-900 text-right">שעות נוספות</p>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOvertimeOpen(false);
                                    setOvertimeHours('');
                                    setOvertimeRate('');
                                }}
                                className="text-xs text-amber-600 hover:text-amber-800 font-medium"
                            >
                                הסר
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col">
                          <span className="text-xs font-medium text-amber-800 mb-2 text-right">
                            שעות נוספות
                          </span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.25"
                                    value={overtimeHours}
                                    onChange={(e) => setOvertimeHours(e.target.value)}
                                    className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-left focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none"
                                    placeholder="0"
                                />
                            </div>
                            <div className="flex flex-col">
                          <span className="text-xs font-medium text-amber-800 mb-2 text-right">
                            שכר לשעה (₪)
                          </span>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={overtimeRate || overtimeRateFromSettings}
                                    onChange={(e) => setOvertimeRate(e.target.value)}
                                    className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-left focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none"
                                    placeholder={overtimeRateFromSettings || '0'}
                                />
                            </div>
                        </div>
                    </div>)}

                    {/* Submit Button */}
                    <button
                        type="button"
                        onClick={handleCreateShift}
                        className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white py-4 text-base font-semibold shadow-lg shadow-violet-500/30 disabled:opacity-50 disabled:cursor-not-allowed hover:from-violet-700 hover:to-purple-700 transition-all"
                        disabled={!selectedShiftCode || !startTime || !endTime}
                    >
                        שמור משמרת
                    </button>
                </div>
            </div>)}

        {/* Add Tip Modal */}
        {isTipOpen && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl max-w-sm w-full px-6 py-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-slate-900">
                            הוסף טיפ
                        </h2>
                        <button
                            onClick={() => setIsTipOpen(false)}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="w-5 h-5"/>
                        </button>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-600 mb-2 text-right">
                            סכום הטיפ (₪)
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={tipAmount}
                            onChange={(e) => setTipAmount(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg text-center focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                            placeholder="0"
                            autoFocus
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleAddTip}
                        className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-4 text-base font-semibold shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed hover:from-emerald-600 hover:to-emerald-700 transition-all"
                        disabled={!tipAmount || Number(tipAmount) <= 0}
                    >
                        שמור טיפ
                    </button>
                </div>
            </div>)}
    </Layout>);
}