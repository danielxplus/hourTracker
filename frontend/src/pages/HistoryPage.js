import { useEffect, useState } from "react";
import { Sun, Sunset, Moon, Clock } from "lucide-react";
import Layout from "../components/Layout";
import api from "../api/client";

export default function HistoryPage() {
    const [items, setItems] = useState([]);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        async function load() {
            try {
                const res = await api.get("/history");
                setItems(res.data.items ?? []);
            } catch {
                // ignore
            }
        }

        load();
    }, []);

    const filteredItems = items.filter((item) => {
        const itemDate = new Date(item.date);
        const now = new Date();

        if (filter === "all") return true;
        if (filter === "week") {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return itemDate >= weekAgo;
        }
        if (filter === "month") {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return itemDate >= monthAgo;
        }
        if (filter === "year") {
            const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            return itemDate >= yearAgo;
        }
        return true;
    });

    const shiftConfig = {
        morning: { icon: Sun, color: 'text-amber-600', bg: 'bg-amber-50' },
        evening: { icon: Sunset, color: 'text-orange-600', bg: 'bg-orange-50' },
        night: { icon: Moon, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        middle: { icon: Clock, color: 'text-teal-600', bg: 'bg-teal-50' }
    };

    return (
        <Layout>
            <header className="mb-6 pt-2" dir="rtl">
                <h1 className="text-xl font-medium text-zinc-900">היסטוריה</h1>
            </header>

            {/* Filter Tabs */}
            <section className="mb-4 flex gap-2 rounded-xl bg-zinc-100 p-1 text-xs" dir="rtl">
                <button
                    onClick={() => setFilter("all")}
                    className={`flex-1 rounded-lg px-3 py-2 font-medium transition-all ${
                        filter === "all" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500"
                    }`}
                >
                    הכל
                </button>
                <button
                    onClick={() => setFilter("week")}
                    className={`flex-1 rounded-lg px-3 py-2 font-medium transition-all ${
                        filter === "week" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500"
                    }`}
                >
                    שבוע
                </button>
                <button
                    onClick={() => setFilter("month")}
                    className={`flex-1 rounded-lg px-3 py-2 font-medium transition-all ${
                        filter === "month" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500"
                    }`}
                >
                    חודש
                </button>
                <button
                    onClick={() => setFilter("year")}
                    className={`flex-1 rounded-lg px-3 py-2 font-medium transition-all ${
                        filter === "year" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500"
                    }`}
                >
                    שנה
                </button>
            </section>

            {/* History List */}
            <section className="space-y-2" dir="rtl">
                {filteredItems.map((item) => {
                    const config = shiftConfig[item.shiftType?.toLowerCase()] || shiftConfig.middle;
                    const Icon = config.icon || Clock;

                    return (
                        <div
                            key={item.id}
                            className="bg-white rounded-xl border border-zinc-200/60 p-4 transition-all hover:border-zinc-300"
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
                                                +{item.overtimeHours.toFixed(1)}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-zinc-500 truncate">
                                        {new Date(item.date).toLocaleDateString("he-IL", { day: 'numeric', month: 'short' })}
                                        <span className="mx-1.5">•</span>
                                        {item.hours.toFixed(1)} שעות
                                    </p>
                                </div>

                                {/* Salary */}
                                <div className="text-right flex-shrink-0">
                                    <div className="text-base font-semibold text-zinc-900">
                                        ₪{item.salary.toFixed(0)}
                                    </div>
                                    {item.tipAmount > 0 && (
                                        <div className="text-[10px] text-emerald-600 font-medium">
                                            +₪{item.tipAmount}
                                        </div>
                                    )}
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
        </Layout>
    );
}