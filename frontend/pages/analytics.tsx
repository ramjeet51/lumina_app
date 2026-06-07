import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import AnimatedBackground from "../components/AnimatedBackground";
import Navbar from "../components/Navbar";
import { apiRequest, getToken, removeToken } from "../lib/api";

const STATUS_COLORS: Record<string,string> = { todo: "#818cf8", inprogress: "#f4c542", done: "#34d399" };
const PRIORITY_COLORS: Record<string,string> = { low: "#34d399", medium: "#f4c542", high: "#f87171" };
const LABEL_COLORS = ["#818cf8","#f4c542","#34d399","#f87171","#06b6d4","#f97316","#a78bfa"];

interface AnalyticsData {
  status_counts: Record<string, number>;
  priority_counts: Record<string, number>;
  label_counts: Record<string, number>;
  tasks_over_time: { day: string; count: number }[];
  total_tasks: number;
  completion_rate: number;
  done_this_week: number;
  login_history: string[];
  productivity_score: number;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== "undefined" ? getToken() : null;

  useEffect(() => {
    if (!token) { router.replace("/"); return; }
    apiRequest("/api/analytics", {}, token)
      .then((d: AnalyticsData) => setData(d))
      .catch(() => { removeToken(); router.replace("/"); })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return (
    <>
      <AnimatedBackground />
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: "#7070a0" }}>Loading analytics...</p>
        </div>
      </div>
    </>
  );

  const statusData = [
    { key: "todo",       label: "To Do",      color: STATUS_COLORS.todo },
    { key: "inprogress", label: "In Progress", color: STATUS_COLORS.inprogress },
    { key: "done",       label: "Done",        color: STATUS_COLORS.done },
  ];

  const priorityData = [
    { key: "low",    label: "Low",    color: PRIORITY_COLORS.low },
    { key: "medium", label: "Medium", color: PRIORITY_COLORS.medium },
    { key: "high",   label: "High",   color: PRIORITY_COLORS.high },
  ];

  const labelEntries: [string, number][] = Object.entries(data.label_counts || {}).map(([k, v]) => [k, Number(v)]);
  const maxLabel    = Math.max(...labelEntries.map(([, v]) => v), 1);
  const maxPriority = Math.max(...Object.values(data.priority_counts || {}).map(v => Number(v)), 1);
  const maxTimeline = Math.max(...(data.tasks_over_time || []).map(d => Number(d.count)), 1);

  const total = data.total_tasks || 0;
  const statusValues = statusData.map(s => data.status_counts[s.key] || 0);
  const donutTotal = statusValues.reduce((a, b) => a + b, 0) || 1;
  let cumulativePercent = 0;
  const donutSegments = statusData.map((s, i) => {
    const pct = (statusValues[i] / donutTotal) * 100;
    const seg = { ...s, pct, offset: cumulativePercent };
    cumulativePercent += pct;
    return seg;
  });

  const scoreColor = data.productivity_score >= 70 ? "#34d399" : data.productivity_score >= 40 ? "#f4c542" : "#f87171";
  const scoreDash  = (data.productivity_score / 100) * 283;

  return (
    <>
      <Head><title>Analytics · Lumina</title></Head>
      <AnimatedBackground />

      <div className="relative z-10 min-h-screen">
        {/* Nav */}
        <Navbar title="Analytics" backTo="/dashboard" />

        <div className="max-w-6xl mx-auto px-6 pt-24 pb-16">

          {/* Top Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Tasks",     value: data.total_tasks,                   icon: "📋", color: "#818cf8" },
              { label: "Completed",       value: data.status_counts["done"] || 0,    icon: "✅", color: "#34d399" },
              { label: "Done This Week",  value: data.done_this_week,                icon: "⚡", color: "#f4c542" },
              { label: "Completion Rate", value: data.completion_rate + "%",         icon: "🎯", color: "#f97316" },
            ].map((s, i) => (
              <div key={i} className="stat-card p-5 animate-slide-up" style={{ animationDelay: i * 0.08 + "s" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{s.icon}</span>
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color, boxShadow: "0 0 6px " + s.color }} />
                </div>
                <div className="text-2xl font-display font-bold text-white">{s.value}</div>
                <div className="text-xs mt-1" style={{ color: s.color }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Donut + Score */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="stat-card p-6">
              <h3 className="font-display text-lg font-semibold text-white mb-6">Task Status</h3>
              <div className="flex items-center gap-8">
                <div className="relative flex-shrink-0">
                  <svg width="160" height="160" viewBox="0 0 160 160">
                    <circle cx="80" cy="80" r="60" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="20" />
                    {donutSegments.map((seg, i) => seg.pct > 0 && (
                      <circle key={i} cx="80" cy="80" r="60" fill="none"
                        stroke={seg.color} strokeWidth="20"
                        strokeDasharray={`${(seg.pct / 100) * 377} 377`}
                        strokeDashoffset={-((seg.offset / 100) * 377)}
                        transform="rotate(-90 80 80)"
                        style={{ transition: "stroke-dasharray 1s ease" }}
                      />
                    ))}
                    <text x="80" y="75" textAnchor="middle" fill="white" fontSize="22" fontWeight="bold">{total}</text>
                    <text x="80" y="93" textAnchor="middle" fill="#7070a0" fontSize="11">tasks</text>
                  </svg>
                </div>
                <div className="space-y-3 flex-1">
                  {donutSegments.map(seg => (
                    <div key={seg.key}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: seg.color }} />
                          <span className="text-sm" style={{ color: "#9090b0" }}>{seg.label}</span>
                        </div>
                        <span className="text-sm font-medium text-white">{data.status_counts[seg.key] || 0}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: seg.pct + "%", background: seg.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="stat-card p-6 flex flex-col items-center justify-center">
              <h3 className="font-display text-lg font-semibold text-white mb-6">Productivity Score</h3>
              <svg width="180" height="180" viewBox="0 0 180 180">
                <circle cx="90" cy="90" r="75" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" strokeLinecap="round" />
                <circle cx="90" cy="90" r="75" fill="none"
                  stroke={scoreColor} strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={`${scoreDash} 283`}
                  strokeDashoffset="0"
                  transform="rotate(-90 90 90)"
                  style={{ filter: `drop-shadow(0 0 8px ${scoreColor})`, transition: "stroke-dasharray 1.5s ease" }}
                />
                <text x="90" y="82" textAnchor="middle" fill="white" fontSize="32" fontWeight="bold">{data.productivity_score}</text>
                <text x="90" y="102" textAnchor="middle" fill="#7070a0" fontSize="13">out of 100</text>
              </svg>
              <div className="mt-4 text-center">
                <div className="text-sm font-medium" style={{ color: scoreColor }}>
                  {data.productivity_score >= 70 ? "🔥 Excellent!" : data.productivity_score >= 40 ? "💪 Good Progress" : "🌱 Keep Going!"}
                </div>
                <div className="text-xs mt-1" style={{ color: "#7070a0" }}>Based on completion rate + weekly tasks</div>
              </div>
            </div>
          </div>

          {/* Priority + Labels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="stat-card p-6">
              <h3 className="font-display text-lg font-semibold text-white mb-6">Priority Breakdown</h3>
              <div className="space-y-4">
                {priorityData.map(p => {
                  const val = data.priority_counts[p.key] || 0;
                  const pct = Math.round((val / maxPriority) * 100);
                  return (
                    <div key={p.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm" style={{ color: "#9090b0" }}>{p.label}</span>
                        <span className="text-sm font-bold text-white">{val}</span>
                      </div>
                      <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <div className="h-full rounded-full transition-all duration-1000"
                          style={{ width: pct + "%", background: `linear-gradient(90deg, ${p.color}99, ${p.color})` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="stat-card p-6">
              <h3 className="font-display text-lg font-semibold text-white mb-6">Label Breakdown</h3>
              {labelEntries.length === 0 ? (
                <div className="text-center py-8" style={{ color: "#404060" }}>
                  <div className="text-3xl mb-2">🏷️</div>
                  <div className="text-sm">No labels used yet</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {labelEntries.map(([label, count], i) => {
                    const pct = Math.round((count / maxLabel) * 100);
                    const color = LABEL_COLORS[i % LABEL_COLORS.length];
                    return (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="px-2 py-0.5 rounded text-xs" style={{ background: color + "20", color }}>{label}</span>
                          <span className="text-sm font-bold text-white">{count}</span>
                        </div>
                        <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                          <div className="h-full rounded-full transition-all duration-1000"
                            style={{ width: pct + "%", background: `linear-gradient(90deg, ${color}80, ${color})` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Tasks Over Time */}
          <div className="stat-card p-6 mb-6">
            <h3 className="font-display text-lg font-semibold text-white mb-6">Tasks Created — Last 14 Days</h3>
            {data.tasks_over_time.length === 0 ? (
              <div className="text-center py-8" style={{ color: "#404060" }}>
                <div className="text-3xl mb-2">📈</div>
                <div className="text-sm">No task data yet</div>
              </div>
            ) : (
              <div className="flex items-end gap-2 h-40">
                {data.tasks_over_time.map((item, i) => {
                  const pct = (Number(item.count) / maxTimeline) * 100;
                  const date = new Date(item.day);
                  const dateLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">{item.count}</div>
                      <div className="w-full rounded-t-lg transition-all duration-700"
                        style={{ height: Math.max(pct, 5) + "%", background: "linear-gradient(180deg, #f4c542, #e8a020)", boxShadow: "0 0 12px rgba(244,197,66,0.3)" }} />
                      <div className="text-center" style={{ color: "#707090", fontSize: "10px" }}>{dateLabel}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Login History */}
          <div className="stat-card p-6">
            <h3 className="font-display text-lg font-semibold text-white mb-5">Recent Login Activity</h3>
            {data.login_history.length === 0 ? (
              <div className="text-center py-6" style={{ color: "#404060" }}>No login history yet</div>
            ) : (
              <div className="space-y-3">
                {data.login_history.map((login, i) => {
                  const d = new Date(login);
                  return (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.025)" }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: i === 0 ? "rgba(244,197,66,0.15)" : "rgba(255,255,255,0.04)", border: i === 0 ? "1px solid rgba(244,197,66,0.3)" : "1px solid rgba(255,255,255,0.06)" }}>
                        <span className="text-sm">{i === 0 ? "🔑" : "🔒"}</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-white">{i === 0 ? "Current session" : "Login #" + (i + 1)}</div>
                        <div className="text-xs mt-0.5" style={{ color: "#7070a0" }}>
                          {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </div>
                      </div>
                      <div className="text-xs font-mono" style={{ color: i === 0 ? "#f4c542" : "#7070a0" }}>
                        {d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      {i === 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                          <span className="text-xs" style={{ color: "#34d399" }}>Active</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
