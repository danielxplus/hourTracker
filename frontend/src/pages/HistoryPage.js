import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/client";

export default function HistoryPage() {
  const [items, setItems] = useState([]);

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

  return (
    <Layout>
      <header className="mb-4">
        <h1 className="text-xl font-semibold text-slate-900 text-right">
          היסטוריה
        </h1>
      </header>

      <section className="mb-3 flex gap-2 rounded-full bg-slate-100 p-1 text-xs">
        <button className="flex-1 rounded-full bg-white shadow px-3 py-1 font-medium">
          הכל
        </button>
        <button className="flex-1 rounded-full px-3 py-1 text-slate-500">
          שבוע
        </button>
        <button className="flex-1 rounded-full px-3 py-1 text-slate-500">
          חודש
        </button>
        <button className="flex-1 rounded-full px-3 py-1 text-slate-500">
          שנה
        </button>
      </section>

      <section className="space-y-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl bg-white border border-slate-100 px-4 py-3 flex items-center justify-between"
          >
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-medium text-slate-800">
                {item.shiftType}
              </span>
              {item.overtimeHours > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 text-[10px]">
                  שעות נוספות • {item.overtimeHours.toFixed(1)}ש׳
                </span>
              )}
              <span className="text-[10px] text-slate-500">
                {new Date(item.date).toLocaleDateString("he-IL", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex flex-col items-start gap-1">
              <span className="text-xs text-emerald-600 font-medium">
                ₪{item.salary.toFixed(0)}
              </span>
              <span className="text-[10px] text-slate-500">
                שעות {item.hours.toFixed(1)}
              </span>
            </div>
          </article>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-slate-400 text-center mt-6">
            אין עדיין נתונים להצגה.
          </p>
        )}
      </section>
    </Layout>
  );
}


