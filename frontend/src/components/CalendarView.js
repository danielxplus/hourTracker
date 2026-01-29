import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import dayjs from "dayjs";
import { shiftConfig } from "../utils/shiftUtils";
import PremiumLock from "./PremiumLock";

export default function CalendarView({ shifts, onDayClick, isPremium = true }) {
    const [currentMonth, setCurrentMonth] = useState(dayjs());
    const [viewMode, setViewMode] = useState('month'); // 'month' or 'year'

    const getShiftsForDay = (day) => {
        if (!day) return [];
        const dateStr = currentMonth.date(day).format('YYYY-MM-DD');
        return shifts.filter(s => s.date === dateStr);
    };

    const getShiftsForMonth = (year, month) => {
        const monthStr = dayjs().year(year).month(month - 1).format('YYYY-MM');
        return shifts.filter(s => s.date.startsWith(monthStr));
    };

    const getTotalHours = (dayShifts) => {
        return dayShifts.reduce((acc, shift) => acc + (shift.hours || 0), 0);
    };

    const getTotalSalary = (dayShifts) => {
        return dayShifts.reduce((acc, shift) => acc + (shift.salary || 0), 0);
    };

    const getMonthSalary = (year, month) => {
        const monthShifts = getShiftsForMonth(year, month);
        return monthShifts.reduce((acc, shift) => acc + (shift.salary || 0), 0);
    };

    const daysInMonth = currentMonth.daysInMonth();
    const firstDayOfMonth = currentMonth.startOf('month').day();
    const calendarDays = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push(i);
    }

    const goToPreviousMonth = () => {
        setCurrentMonth(prev => prev.subtract(1, 'month'));
    };

    const goToNextMonth = () => {
        setCurrentMonth(prev => prev.add(1, 'month'));
    };

    const goToToday = () => {
        setCurrentMonth(dayjs());
        setViewMode('month');
    };

    const isToday = (day) => {
        if (!day) return false;
        return currentMonth.date(day).isSame(dayjs(), 'day');
    };

    const dayNames = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

    // Yearly view rendering
    if (viewMode === 'year') {
        const currentYear = currentMonth.year();
        const months = Array.from({ length: 12 }, (_, i) => i + 1);

        return (
            <div className="bg-skin-card-bg rounded-2xl border border-skin-border-secondary p-4 relative" dir="rtl">
                {!isPremium && <PremiumLock message="תצוגה שנתית זמינה למשתמשי פרמיום בלבד" />}

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => setCurrentMonth(prev => prev.subtract(1, 'year'))}
                        className="p-2 rounded-lg hover:bg-skin-bg-secondary transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 text-skin-text-secondary" />
                    </button>

                    <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-skin-text-primary">
                            {currentYear}
                        </h3>
                        <button
                            onClick={() => setViewMode('month')}
                            className="text-xs px-3 py-1.5 rounded-md bg-skin-accent-primary-bg text-skin-accent-primary font-medium hover:bg-skin-accent-primary-bg/80 transition-colors flex items-center gap-1"
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            חודשי
                        </button>
                    </div>

                    <button
                        onClick={() => setCurrentMonth(prev => prev.add(1, 'year'))}
                        className="p-2 rounded-lg hover:bg-skin-bg-secondary transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-skin-text-secondary" />
                    </button>
                </div>

                {/* Yearly Grid */}
                <div className="grid grid-cols-3 gap-3">
                    {months.map(month => {
                        const monthSalary = getMonthSalary(currentYear, month);
                        const monthShifts = getShiftsForMonth(currentYear, month);
                        const hasShifts = monthShifts.length > 0;
                        const monthName = dayjs().month(month - 1).format('MMM');

                        return (
                            <button
                                key={month}
                                onClick={() => {
                                    setCurrentMonth(dayjs().year(currentYear).month(month - 1));
                                    setViewMode('month');
                                }}
                                className={`p-4 rounded-xl border transition-all ${hasShifts
                                    ? 'border-skin-accent-secondary bg-skin-accent-secondary-bg hover:bg-skin-accent-secondary-bg/80'
                                    : 'border-skin-border-primary hover:bg-skin-bg-secondary'
                                    }`}
                            >
                                <div className="text-sm font-medium text-skin-text-primary mb-2">
                                    {monthName}
                                </div>
                                {hasShifts ? (
                                    <>
                                        <div className="text-lg font-semibold text-skin-text-primary">
                                            ₪{monthSalary.toFixed(0)}
                                        </div>
                                        <div className="text-xs text-skin-text-tertiary mt-1">
                                            {monthShifts.length} משמרות
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-xs text-skin-text-tertiary">אין משמרות</div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Monthly view rendering
    return (
        <div className="bg-skin-card-bg rounded-2xl border border-skin-border-secondary p-4 relative" dir="rtl">
            {!isPremium && <PremiumLock message="תצוגת לוח שנה זמינה למשתמשי פרמיום בלבד" />}
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={goToPreviousMonth}
                    className="p-2 rounded-lg hover:bg-skin-bg-secondary transition-colors"
                >
                    <ChevronRight className="w-5 h-5 text-skin-text-secondary" />
                </button>

                <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-skin-text-primary">
                        {currentMonth.format('MMMM YYYY')}
                    </h3>
                    <button
                        onClick={goToToday}
                        className="text-xs px-2 py-1 rounded-md bg-skin-accent-primary-bg text-skin-accent-primary font-medium hover:bg-skin-accent-primary-bg/80 transition-colors"
                    >
                        היום
                    </button>
                    {isPremium && (
                        <button
                            onClick={() => setViewMode('year')}
                            className="text-xs px-3 py-1.5 rounded-md bg-skin-accent-secondary-bg text-skin-accent-secondary font-medium hover:bg-skin-accent-secondary-bg/80 transition-colors flex items-center gap-1"
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            שנתי
                        </button>
                    )}
                </div>

                <button
                    onClick={goToNextMonth}
                    className="p-2 rounded-lg hover:bg-skin-bg-secondary transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-skin-text-secondary" />
                </button>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((name, i) => (
                    <div key={i} className="text-center text-xs font-medium text-skin-text-tertiary py-2">
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
                    const totalSalary = getTotalSalary(dayShifts);
                    const hasShifts = dayShifts.length > 0;
                    const today = isToday(day);

                    return (
                        <button
                            key={day}
                            onClick={() => hasShifts && onDayClick && onDayClick(dayShifts)}
                            className={`aspect-square p-1 rounded-lg border transition-all ${today
                                ? 'border-skin-accent-primary bg-skin-accent-primary-bg'
                                : hasShifts
                                    ? 'border-skin-accent-secondary bg-skin-accent-secondary-bg hover:bg-skin-accent-secondary-bg/80 cursor-pointer'
                                    : 'border-skin-border-primary hover:bg-skin-bg-secondary'
                                }`}
                        >
                            <div className="flex flex-col items-center justify-center h-full">
                                <span className={`text-sm font-medium ${today ? 'text-skin-accent-primary' : hasShifts ? 'text-skin-accent-secondary' : 'text-skin-text-primary'
                                    }`}>
                                    {day}
                                </span>
                                {hasShifts && (
                                    <div className="mt-0.5">

                                        <div className="text-[9px] text-skin-accent-secondary font-semibold">
                                            ₪{totalSalary.toFixed(0)}
                                        </div>
                                        <span className="text-[9px] text-skin-text-tertiary font-medium">
                                            {totalHours.toFixed(1)}ש
                                        </span>
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-skin-border-secondary flex items-center justify-center gap-4 text-xs text-skin-text-tertiary">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-skin-accent-primary-bg border border-skin-accent-primary" />
                    <span>היום</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-skin-accent-secondary-bg border border-skin-accent-secondary" />
                    <span>יש משמרות</span>
                </div>
            </div>
        </div>
    );
}
