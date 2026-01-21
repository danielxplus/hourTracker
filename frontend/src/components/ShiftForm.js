import { shiftConfig } from "../utils/shiftUtils";

export default function ShiftForm({
                                      shiftTypes,
                                      selectedShiftCode,
                                      setSelectedShiftCode, // Pass the setter
                                      startTime,
                                      setStartTime,
                                      endTime,
                                      setEndTime,
                                      isOvertimeOpen,
                                      setIsOvertimeOpen,
                                      overtimeHours,
                                      setOvertimeHours,
                                      overtimeRate,
                                      setOvertimeRate,
                                      overtimeRateFromSettings
                                  }) {

    // Internal handler to update Code AND Times simultaneously
    const handleShiftClick = (shift) => {
        setSelectedShiftCode(shift.code);

        const apiStart = shift.defaultStart ? shift.defaultStart.slice(0, 5) : "";
        const apiEnd = shift.defaultEnd ? shift.defaultEnd.slice(0, 5) : "";

        // Fallback to config only if API is empty
        const config = shiftConfig[shift.code?.toLowerCase()] || shiftConfig.middle;

        // Set the state
        setStartTime(apiStart || config.defaultStart || "");
        setEndTime(apiEnd || config.defaultEnd || "");
    };

    return (
        <>
            {/* Shift Types */}
            <div className="mb-5">
                {/* Main 4 shifts */}
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
                                onClick={() => handleShiftClick(shift)}
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

                {/* Specific Time Shifts */}
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
                                onClick={() => handleShiftClick(shift)}
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
                                    if (["e", "E", "-", "+"].includes(e.key)) e.preventDefault();
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
        </>
    );
}