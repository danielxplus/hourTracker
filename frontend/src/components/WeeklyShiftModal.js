import { useState, useEffect } from "react";
import { X, Calendar, Plus } from "lucide-react";
import dayjs from "dayjs";
import PremiumLock from "./PremiumLock";

export default function WeeklyShiftModal({ isOpen, onClose, shiftTypes, onSave, isPremium = true }) {
    const [weekShifts, setWeekShifts] = useState([]);

    // Initialize 7 days starting from today
    useEffect(() => {
        if (isOpen) {
            const shifts = [];
            for (let i = 0; i < 7; i++) {
                const date = dayjs().add(i, 'day');
                shifts.push({
                    date: date.format('YYYY-MM-DD'),
                    dayName: date.format('dddd'),
                    dayNumber: date.format('DD/MM'),
                    shiftCode: null,
                    startTime: "",
                    endTime: ""
                });
            }
            setWeekShifts(shifts);
        }
    }, [isOpen]);

    const handleShiftChange = (index, shiftCode) => {
        const shift = shiftTypes.find(s => s.code === shiftCode);
        if (!shift) return;

        setWeekShifts(prev => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                shiftCode: shift.code,
                startTime: shift.defaultStart || "",
                endTime: shift.defaultEnd || ""
            };
            return updated;
        });
    };

    const handleClearShift = (index) => {
        setWeekShifts(prev => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                shiftCode: null,
                startTime: "",
                endTime: ""
            };
            return updated;
        });
    };

    const handleSave = () => {
        // Filter out days without shifts
        const shiftsToSave = weekShifts.filter(s => s.shiftCode);
        if (shiftsToSave.length === 0) {
            alert("נא לבחור לפחות משמרת אחת");
            return;
        }
        onSave(shiftsToSave);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end justify-center z-50">
            <div className="bg-white rounded-t-2xl w-full max-w-md px-5 pt-5 pb-8 max-h-[90vh] overflow-y-auto relative" dir="rtl">
                {!isPremium && <PremiumLock message="הוספת משמרות שבועיות זמינה למשתמשי פרמיום בלבד" />}
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-medium text-zinc-900">הוספת משמרות לשבוע</h2>
                    <button onClick={onClose} className="p-2 -ml-2 rounded-lg text-zinc-400 hover:text-zinc-600 active:bg-zinc-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="mb-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <p className="text-xs text-emerald-800">
                        <Calendar className="w-4 h-4 inline ml-1" />
                        בחר משמרות עבור 7 הימים הקרובים. ניתן לדלג על ימים ללא משמרת.
                    </p>
                </div>

                <div className="space-y-3 mb-6">
                    {weekShifts.map((day, index) => (
                        <div key={day.date} className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <div className="text-sm font-medium text-zinc-900">{day.dayName}</div>
                                    <div className="text-xs text-zinc-500">{day.dayNumber}</div>
                                </div>
                                {day.shiftCode && (
                                    <button
                                        onClick={() => handleClearShift(index)}
                                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                                    >
                                        נקה
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {shiftTypes.map(shift => (
                                    <button
                                        key={shift.code}
                                        onClick={() => handleShiftChange(index, shift.code)}
                                        className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${day.shiftCode === shift.code
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'bg-white text-zinc-700 border border-zinc-200 hover:border-emerald-300'
                                            }`}
                                    >
                                        {shift.name}
                                    </button>
                                ))}
                            </div>

                            {day.shiftCode && (
                                <div className="mt-3 pt-3 border-t border-zinc-200">
                                    <div className="flex gap-2 items-center text-xs text-zinc-600">
                                        <span>שעות:</span>
                                        <span className="font-medium">{day.startTime}</span>
                                        <span>-</span>
                                        <span className="font-medium">{day.endTime}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors"
                    >
                        ביטול
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 active:scale-95 transition-all shadow-sm"
                    >
                        <Plus className="w-4 h-4 inline ml-1" />
                        הוסף משמרות
                    </button>
                </div>
            </div>
        </div>
    );
}
