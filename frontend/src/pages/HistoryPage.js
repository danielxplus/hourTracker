import {useEffect, useState} from "react";
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

    return (
        <Layout>
            <header className="mb-4">
                <h1 className="text-xl font-semibold text-slate-900 text-right">
                    היסטוריה
                </h1>
            </header>

            <section className="mb-3 flex gap-2 rounded-full bg-slate-100 p-1 text-xs">
                <button
                    onClick={() => setFilter("all")}
                    className={`flex-1 rounded-full px-3 py-1 font-medium ${
                        filter === "all" ? "bg-white shadow" : "text-slate-500"
                    }`}
                >
                    הכל
                </button>
                <button
                    onClick={() => setFilter("week")}
                    className={`flex-1 rounded-full px-3 py-1 ${
                        filter === "week" ? "bg-white shadow font-medium" : "text-slate-500"
                    }`}
                >
                    שבוע
                </button>
                <button
                    onClick={() => setFilter("month")}
                    className={`flex-1 rounded-full px-3 py-1 ${
                        filter === "month" ? "bg-white shadow font-medium" : "text-slate-500"
                    }`}
                >
                    חודש
                </button>
                <button
                    onClick={() => setFilter("year")}
                    className={`flex-1 rounded-full px-3 py-1 ${
                        filter === "year" ? "bg-white shadow font-medium" : "text-slate-500"
                    }`}
                >
                    שנה
                </button>
            </section>

            <section className="space-y-3">
                {filteredItems.map((item) => (
                    <article
                        key={item.id}
                        className="rounded-2xl bg-white border border-slate-200 px-4 py-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                        {/* Top Row: Shift Type and Salary */}
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-lg font-bold text-slate-900">
                                {item.shiftType || item.name}
                            </h3>
                            <span className="text-2xl font-bold text-emerald-600">
      ₪{item.salary.toFixed(0)}
    </span>
                        </div>

                        {/* Middle Row: Date and Total Hours */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-1 text-sm text-slate-500">
                                <span>{new Date(item.date).toLocaleDateString("he-IL", {weekday: "long"})}</span>
                                <span>•</span>
                                <span>{new Date(item.date).toLocaleDateString("he-IL", {
                                    day: "numeric",
                                    month: "short"
                                })}</span>
                            </div>
                            <span className="text-sm font-medium text-slate-500">
      {item.hours.toFixed(1)} שעות
    </span>
                        </div>

                        {/* Badges Container */}
                        {(item.overtimeHours > 0 || item.tipAmount > 0) && (
                            <div className="mb-3 flex flex-wrap gap-2 justify-start">
                                {/* Overtime Badge */}
                                {item.overtimeHours > 0 && (
                                    <span
                                        className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 px-3 py-1 text-[11px] font-medium">
        {item.overtimeHours.toFixed(1)} שעות נוספות
      </span>
                                )}

                                {/* Tip Badge */}
                                {item.tipAmount > 0 && (
                                    <span
                                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1 text-[11px] font-medium">
        ₪{item.tipAmount} טיפ
      </span>
                                )}
                            </div>
                        )}
                    </article>
                ))}
                {filteredItems.length === 0 && (
                    <p className="text-xs text-slate-400 text-center mt-6">
                        אין עדיין נתונים להצגה.
                    </p>
                )}
            </section>
        </Layout>
    );
}