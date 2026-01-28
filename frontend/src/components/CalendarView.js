import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import dayjs from "dayjs";
import { shiftConfig } from "../utils/shiftUtils";

export default function CalendarView({ shifts, onDayClick }) {
    const [currentMonth, setCurrentMonth] = useState(dayjs());

    // Get all days in the current month
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const startDay = startOfMonth.day(); // 0 = Sunday
    const daysInMonth = currentMonth.daysInMonth();

    // Create calendar grid (6 weeks max)
    const calendarDays = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startDay; i++) {
        calendarDays.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push(day);
    }

    // Get shifts for a specific day
    const getShiftsForDay = (day) => {
        if (!day) return [];
        const dateStr = currentMonth.date(day).format('YYYY-MM-DD');
        return shifts.filter(shift => {
            const shiftDate = dayjs(shift.date).format('YYYY-MM-DD');
            return shiftDate === dateStr;
        });
    };

    // Calculate total hours for a day
    const getTotalHours = (dayShifts) => {
        return dayShifts.reduce((sum, shift) => sum + (shift.hours || 0), 0);
    };

    // Navigate months
    const goToPreviousMonth = () => {
        setCurrentMonth(prev => prev.subtract(1, 'month'));
    };

    const goToNextMonth = () => {
        setCurrentMonth(prev => prev.add(1, 'month'));
    };

    const goToToday = () => {
        setCurrentMonth(dayjs());
    };

    const isToday = (day) => {
        if (!day) return false;
        return currentMonth.date(day).isSame(dayjs(), 'day');
    };

    const dayNames = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

    return (
        <div className="bg-white rounded-2xl border border-zinc-200/60 p-4" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={goToPreviousMonth}
                    className="p-2 rounded-lg hover:bg-zinc-100 transition-colors"
                >
                    <ChevronRight className="w-5 h-5 text-zinc-600" />
                </button>

                <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-zinc-900">
                        {currentMonth.format('MMMM YYYY')}
                    </h3>
                    <button
                        onClick={goToToday}
                        className="text-xs px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium hover:bg-emerald-100 transition-colors"
                    >
                        היום
                    </button>
                </div>

                <button
                    onClick={goToNextMonth}
                    className="p-2 rounded-lg hover:bg-zinc-100 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-zinc-600" />
                </button>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((name, i) => (
                    <div key={i} className="text-center text-xs font-medium text-zinc-500 py-2">
                        {name}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                    if (!day) {
                        return <div key={`empty-${index}`} className="aspect-square" />;
                    }

                    const dayShifts = getShiftsForDay(day);
                    const totalHours = getTotalHours(dayShifts);
                    const hasShifts = dayShifts.length > 0;
                    const today = isToday(day);

                    return (
                        <button
                            key={day}
                            onClick={() => hasShifts && onDayClick && onDayClick(dayShifts)}
                            className={`aspect-square p-1 rounded-lg border transition-all ${today
                                    ? 'border-emerald-500 bg-emerald-50'
                                    : hasShifts
                                        ? 'border-purple-200 bg-purple-50 hover:bg-purple-100 cursor-pointer'
                                        : 'border-zinc-100 hover:bg-zinc-50'
                                }`}
                        >
                            <div className="flex flex-col items-center justify-center h-full">
                                <span className={`text-sm font-medium ${today ? 'text-emerald-700' : hasShifts ? 'text-purple-900' : 'text-zinc-700'
                                    }`}>
                                    {day}
                                </span>
                                {hasShifts && (
                                    <div className="mt-0.5">
                                        <div className="flex items-center gap-0.5">
                                            {dayShifts.slice(0, 3).map((shift, i) => {
                                                const config = shiftConfig[shift.shiftType?.toLowerCase()] || shiftConfig.middle;
                                                return (
                                                    <div
                                                        key={i}
                                                        className={`w-1.5 h-1.5 rounded-full ${config.bg}`}
                                                    />
                                                );
                                            })}
                                        </div>
                                        <span className="text-[10px] text-zinc-600 font-medium">
                                            {totalHours.toFixed(1)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-center gap-4 text-xs text-zinc-500">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-emerald-50 border border-emerald-500" />
                    <span>היום</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-purple-50 border border-purple-200" />
                    <span>יש משמרות</span>
                </div>
            </div>
        </div>
    );
}
