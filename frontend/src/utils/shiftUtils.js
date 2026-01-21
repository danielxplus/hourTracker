import { Sun, Sunset, Moon, Clock } from "lucide-react";

// 1. The Static Configuration
export const shiftConfig = {
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
    '7am_until_4': {
        icon: Clock,
        color: 'text-cyan-600',
        bg: 'bg-cyan-50',
        border: 'border-cyan-200',
        gradient: 'from-cyan-400 to-sky-500',
        activeGradient: 'from-cyan-500 to-sky-600'
    },
    '4pm_until_12': {
        icon: Clock,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        gradient: 'from-purple-400 to-violet-500',
        activeGradient: 'from-purple-500 to-violet-600'
    }
};

// 2. The Logic Helper
export const getShiftTypeMap = (shiftTypes) => {
    const map = {};
    if (Array.isArray(shiftTypes)) {
        shiftTypes.forEach(t => {
            map[t.nameHe] = t;
            map[t.code] = t;
        });
    }
    return map;
};