import { useState, useEffect } from "react";
import { X, Calendar, Plus } from "lucide-react";
import dayjs from "dayjs";
import PremiumLock from "./PremiumLock";

export default function WeeklyShiftModal({ isOpen, onClose, shiftTypes, onSave, isPremium = true }) {
    const [weekShifts, setWeekShifts] = useState([]);

    // Initialize 7 days starting from today
    useEffect(() => {
        if (isOpen) {
            // Ensure Hebrew locale
            import('dayjs/locale/he').then(() => {
                dayjs.locale('he');
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
            });
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
        <div
            className="fixed inset-0 bg-skin-modal-overlay backdrop-blur-sm flex items-end justify-center z-50 transition-colors"
            onClick={onClose}
        >
            <div
                className={`bg-skin-card-bg rounded-t-2xl w-full max-w-md px-5 pt-5 pb-28 max-h-[90vh] relative border-t border-skin-border-secondary shadow-2xl ${isPremium ? 'overflow-y-auto' : 'overflow-hidden'
                    }`}
                dir="rtl"
                onClick={(e) => e.stopPropagation()}
            >
                {!isPremium && <PremiumLock message="הוספת משמרות שבועיות זמינה למשתמשי פרמיום בלבד" />}
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-medium text-skin-text-primary">הוספת משמרות לשבוע</h2>
                    <button onClick={onClose} className="p-2 -ml-2 rounded-lg text-skin-text-tertiary hover:text-skin-text-primary active:bg-skin-bg-secondary">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="mb-4 p-3 bg-skin-accent-primary-bg rounded-xl border border-skin-accent-primary/20">
                    <p className="text-xs text-skin-accent-primary">
                        <Calendar className="w-4 h-4 inline ml-1" />
                        בחר משמרות עבור 7 הימים הקרובים. ניתן לדלג על ימים ללא משמרת.
                    </p>
                </div>

                <div className="space-y-3 mb-6">
                    {weekShifts.map((day, index) => (
                        <div key={day.date} className="bg-skin-bg-secondary rounded-xl p-4 border border-skin-border-secondary">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <div className="text-sm font-medium text-skin-text-primary">{day.dayName}</div>
                                    <div className="text-xs text-skin-text-tertiary">{day.dayNumber}</div>
                                </div>
                                {day.shiftCode && (
                                    <button
                                        onClick={() => handleClearShift(index)}
                                        disabled={!isPremium}
                                        className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
                                        disabled={!isPremium}
                                        className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${day.shiftCode === shift.code
                                            ? 'bg-skin-accent-primary text-white shadow-sm'
                                            : 'bg-skin-card-bg text-skin-text-secondary border border-skin-border-primary hover:border-skin-accent-primary'
                                            } ${!isPremium ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {shift.nameHe || shift.name || shift.code}
                                    </button>
                                ))}
                            </div>

                            {day.shiftCode && (
                                <div className="mt-3 pt-3 border-t border-skin-border-primary">
                                    <div className="flex gap-2 items-center text-xs text-skin-text-secondary">
                                        <span>שעות:</span>
                                        <span className="font-medium text-skin-text-primary">{day.startTime}</span>
                                        <span>-</span>
                                        <span className="font-medium text-skin-text-primary">{day.endTime}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl font-medium text-skin-text-secondary bg-skin-bg-secondary hover:bg-skin-bg-tertiary transition-colors"
                    >
                        ביטול
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!isPremium}
                        className="flex-1 bg-skin-accent-primary text-white py-3 rounded-xl font-medium hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                    >
                        <Plus className="w-4 h-4 inline ml-1" />
                        הוסף משמרות
                    </button>
                </div>
            </div>
        </div>
    );
}
