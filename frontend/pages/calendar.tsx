import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import AnimatedBackground from "../components/AnimatedBackground";
import Navbar from "../components/Navbar";
import { apiRequest, getToken, removeToken } from "../lib/api";

interface Task {
  id: number;
  title: string;
  status: string;
  priority: string;
  due_date: string;
  label?: string;
}

const PRIORITY_COLORS: Record<string, string> = { low: "#34d399", medium: "#f4c542", high: "#f87171" };
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function CalendarPage() {
  const router = useRouter();
  const token = typeof window !== "undefined" ? getToken() : null;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [today] = useState(new Date());
  const [current, setCurrent] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(null);

  useEffect(() => {
    if (!token) { router.replace("/"); return; }
    apiRequest("/api/tasks", {}, token)
      .then(d => setTasks(d.tasks))
      .catch(() => { removeToken(); router.replace("/"); })
      .finally(() => setLoading(false));
  }, []);

  const year  = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();

  const tasksByDate = tasks.reduce((acc, t) => {
    if (!t.due_date) return acc;
    const key = t.due_date.split("T")[0];
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {} as Record<string, Task[]>);

  function dateKey(y: number, m: number, d: number) {
    return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  }

  function isToday(d: number) {
    return d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  }

  function isSelected(d: number) {
    return selected && d === selected.getDate() && month === selected.getMonth() && year === selected.getFullYear();
  }

  const selectedKey = selected ? dateKey(selected.getFullYear(), selected.getMonth(), selected.getDate()) : null;
  const selectedTasks = selectedKey ? (tasksByDate[selectedKey] || []) : [];

  const totalWithDue = tasks.filter(t => t.due_date).length;
  const overdueCount = tasks.filter(t => t.due_date && new Date(t.due_date) < today && t.status !== "done").length;
  const thisMonthCount = tasks.filter(t => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    return d.getMonth() === month && d.getFullYear() === year;
  }).length;

  // Build calendar grid
  const cells: { day: number; type: "prev"|"curr"|"next" }[] = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: daysInPrev - firstDay + i + 1, type: "prev" });
  for (let i = 1; i <= daysInMonth; i++) cells.push({ day: i, type: "curr" });
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) cells.push({ day: i, type: "next" });

  return (
    <>
      <Head><title>Calendar · Lumina</title></Head>
      <AnimatedBackground />
      <div className="relative z-10 min-h-screen">

        {/* Nav */}
        <Navbar title="Calendar" backTo="/dashboard" />

        <div className="max-w-6xl mx-auto px-6 pt-24 pb-16">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "Tasks This Month", value: thisMonthCount, color: "#818cf8", icon: "📅" },
              { label: "With Due Dates",   value: totalWithDue,   color: "#f4c542", icon: "🗓️" },
              { label: "Overdue",          value: overdueCount,   color: "#f87171", icon: "⚠️" },
            ].map((s,i) => (
              <div key={i} className="stat-card p-4 flex items-center gap-4">
                <span className="text-2xl">{s.icon}</span>
                <div>
                  <div className="text-2xl font-display font-bold text-white">{s.value}</div>
                  <div className="text-xs mt-0.5" style={{ color: s.color }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Calendar */}
            <div className="lg:col-span-2 glass-card p-6">
              {/* Month Nav */}
              <div className="flex items-center justify-between mb-6">
                <button onClick={() => setCurrent(new Date(year, month-1, 1))}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/10"
                  style={{ color: "#7070a0" }}>‹</button>
                <h2 className="font-display text-xl font-semibold text-white">
                  {MONTHS[month]} {year}
                </h2>
                <button onClick={() => setCurrent(new Date(year, month+1, 1))}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/10"
                  style={{ color: "#7070a0" }}>›</button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-xs font-medium py-2" style={{ color: "#5050708" }}>{d}</div>
                ))}
              </div>

              {/* Calendar cells */}
              <div className="grid grid-cols-7 gap-1">
                {cells.map((cell, i) => {
                  const key = cell.type === "curr" ? dateKey(year, month, cell.day)
                    : cell.type === "prev" ? dateKey(year, month-1, cell.day)
                    : dateKey(year, month+1, cell.day);
                  const cellTasks = tasksByDate[key] || [];
                  const isCurr = cell.type === "curr";
                  const isTod = isCurr && isToday(cell.day);
                  const isSel = isCurr && isSelected(cell.day);

                  return (
                    <div key={i}
                      onClick={() => isCurr && setSelected(new Date(year, month, cell.day))}
                      className="relative min-h-16 p-1.5 rounded-xl transition-all"
                      style={{
                        cursor: isCurr ? "pointer" : "default",
                        background: isSel ? "rgba(244,197,66,0.12)" : isTod ? "rgba(129,140,248,0.1)" : "transparent",
                        border: isSel ? "1px solid rgba(244,197,66,0.4)" : isTod ? "1px solid rgba(129,140,248,0.3)" : "1px solid transparent",
                        opacity: !isCurr ? 0.25 : 1,
                      }}>
                      <div className="text-xs font-medium mb-1 text-center"
                        style={{ color: isTod ? "#818cf8" : isSel ? "#f4c542" : "#9090b0" }}>
                        {cell.day}
                      </div>
                      <div className="space-y-0.5">
                        {cellTasks.slice(0, 2).map(t => (
                          <div key={t.id} className="text-center rounded px-1 truncate" style={{ fontSize: "9px", background: PRIORITY_COLORS[t.priority] + "25", color: PRIORITY_COLORS[t.priority] }}>
                            {t.title}
                          </div>
                        ))}
                        {cellTasks.length > 2 && (
                          <div className="text-center text-xs" style={{ color: "#7070a0", fontSize: "9px" }}>+{cellTasks.length - 2}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Side Panel */}
            <div className="lg:col-span-1 space-y-4">
              {/* Selected Day */}
              <div className="glass-card p-5">
                <h3 className="font-display text-base font-semibold text-white mb-4">
                  {selected ? selected.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "Select a day"}
                </h3>
                {!selected ? (
                  <p className="text-sm" style={{ color: "#7070a0" }}>Click any date to see tasks</p>
                ) : selectedTasks.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="text-3xl mb-2">✨</div>
                    <p className="text-sm" style={{ color: "#7070a0" }}>No tasks due this day</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedTasks.map(t => (
                      <div key={t.id} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm text-white font-medium">{t.title}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${t.status === "done" ? "line-through opacity-50" : ""}`}
                            style={{ background: PRIORITY_COLORS[t.priority] + "20", color: PRIORITY_COLORS[t.priority] }}>
                            {t.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: t.status === "done" ? "rgba(52,211,153,0.15)" : t.status === "inprogress" ? "rgba(244,197,66,0.15)" : "rgba(129,140,248,0.15)",
                                     color: t.status === "done" ? "#34d399" : t.status === "inprogress" ? "#f4c542" : "#818cf8" }}>
                            {t.status === "inprogress" ? "In Progress" : t.status}
                          </span>
                          {t.label && <span className="text-xs" style={{ color: "#7070a0" }}>{t.label}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming */}
              <div className="glass-card p-5">
                <h3 className="font-display text-base font-semibold text-white mb-4">📅 Upcoming</h3>
                {tasks.filter(t => t.due_date && new Date(t.due_date) >= today && t.status !== "done")
                  .sort((a,b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                  .slice(0, 5)
                  .map(t => (
                    <div key={t.id} className="flex items-center gap-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PRIORITY_COLORS[t.priority] }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">{t.title}</div>
                        <div className="text-xs" style={{ color: "#7070a0" }}>
                          {new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
