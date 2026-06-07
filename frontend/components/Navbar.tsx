import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { apiRequest, getToken, removeToken } from "../lib/api";

interface Notification {
  id: string;
  type: "overdue" | "welcome" | "reminder" | "done";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface SearchResult {
  type: "task" | "note" | "project";
  id: number;
  title: string;
  sub: string;
  color: string;
}

export default function Navbar({ title = "Lumina", backTo = "" }: { title?: string; backTo?: string }) {
  const router = useRouter();
  const token = typeof window !== "undefined" ? getToken() : null;
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    loadNotifications();
    const saved = localStorage.getItem("theme");
    if (saved === "light") applyLight();
  }, []);

  useEffect(() => {
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 100);
  }, [showSearch]);

  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(() => doSearch(searchQ), 300);
    return () => clearTimeout(timer);
  }, [searchQ]);

  async function loadNotifications() {
    try {
      const d = await apiRequest("/api/notifications", {}, token!);
      setNotifs(d.notifications);
    } catch {}
  }

  async function doSearch(q: string) {
    setSearching(true);
    try {
      const d = await apiRequest(`/api/search?q=${encodeURIComponent(q)}`, {}, token!);
      setSearchResults(d.results);
    } catch {}
    finally { setSearching(false); }
  }

  async function markAllRead() {
    try {
      await apiRequest("/api/notifications/read", { method: "POST" }, token!);
      setNotifs(n => n.map(x => ({ ...x, read: true })));
    } catch {}
  }

    function applyLight() {
    document.body.style.background = "#eef0f8";
    document.body.style.color = "#1a1a2e";
    document.documentElement.setAttribute("data-theme", "light");
    const style = document.getElementById("theme-style") || document.createElement("style");
    style.id = "theme-style";
    style.innerHTML = `
      .animated-bg { display: none !important; }

      body { background: #eef0f8 !important; color: #1a1a2e !important; }

      .glass-card {
        background: rgba(255,255,255,0.95) !important;
        border: 1px solid rgba(100,100,180,0.15) !important;
        box-shadow: 0 4px 24px rgba(100,100,180,0.12) !important;
      }
      .stat-card {
        background: rgba(255,255,255,0.9) !important;
        border: 1px solid rgba(100,100,180,0.12) !important;
        box-shadow: 0 2px 12px rgba(100,100,180,0.08) !important;
      }
      .stat-card:hover {
        border-color: rgba(244,197,66,0.4) !important;
        box-shadow: 0 8px 24px rgba(100,100,180,0.15) !important;
      }

      nav {
        background: rgba(255,255,255,0.92) !important;
        border-bottom: 1px solid rgba(100,100,180,0.12) !important;
      }

      .gold-input {
        background: rgba(0,0,0,0.04) !important;
        border: 1px solid rgba(100,100,180,0.2) !important;
        color: #1a1a2e !important;
      }
      .gold-input:focus {
        border-color: #f4c542 !important;
        background: rgba(244,197,66,0.05) !important;
      }
      .gold-input::placeholder { color: #9090b0 !important; }

      select.gold-input option { background: #ffffff !important; color: #1a1a2e !important; }

      /* Search modal text fix for light mode */
      .text-white { color: #1a1a2e !important; }
      .text-gray-600 { color: #6060808 !important; }
      input::placeholder { color: #9090b0 !important; }
      input[class*="bg-transparent"] { color: #1a1a2e !important; }

      /* Search modal background */
      [style*="rgba(18,18,30"] {
        background: rgba(255,255,255,0.98) !important;
        border: 1px solid rgba(100,100,180,0.15) !important;
      }

      /* Search result items */
      [style*="rgba(255,255,255,0.04)"] {
        background: rgba(0,0,0,0.03) !important;
      }

      /* Notification dropdown */
      [style*="rgba(18,18,30,0.98)"] {
        background: rgba(255,255,255,0.98) !important;
        border: 1px solid rgba(100,100,180,0.15) !important;
      }

      /* All spans and divs with hardcoded white */
      span, div, p, button, a, li {
        color: inherit;
      }

      /* Keep gold color */
      [style*="color: rgb(244, 197, 66)"],
      [style*="color:#f4c542"] {
        color: #d4a000 !important;
      }

      .text-white { color: #1a1a2e !important; }
      h1,h2,h3 { color: #1a1a2e !important; }

      .font-display { color: #1a1a2e !important; }
    `;
    document.head.appendChild(style);
  }

  function applyDark() {
    document.body.style.background = "#0a0a0f";
    document.body.style.color = "#e8e8f0";
    document.documentElement.setAttribute("data-theme", "dark");
    const el = document.getElementById("theme-style");
    if (el) {
      el.innerHTML = `
        .animated-bg { display: block !important; }
        body { background: #0a0a0f !important; color: #e8e8f0 !important; }
        .text-white { color: #ffffff !important; }
        .glass-card { background: rgba(18,18,30,0.75) !important; }
        .stat-card { background: rgba(255,255,255,0.035) !important; }
        nav { background: rgba(7,7,16,0.92) !important; }
      `;
    }
  }

  function toggleTheme() {
    if (isDark) { applyLight(); localStorage.setItem("theme","light"); setIsDark(false); }
    else        { applyDark();  localStorage.setItem("theme","dark");  setIsDark(true);  }
  }

  function logout() { removeToken(); router.push("/"); }

  const unread = notifs.filter(n => !n.read).length;

  const notifIcons: Record<string, string> = { overdue: "⚠️", welcome: "👋", reminder: "🔔", done: "✅" };
  const notifColors: Record<string, string> = { overdue: "#f87171", welcome: "#34d399", reminder: "#f4c542", done: "#34d399" };

  const resultIcons: Record<string, string> = { task: "📋", note: "📝", project: "📁" };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50"
        style={{ background: "rgba(7,7,16,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">

          {/* Left */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {backTo && (
              <button onClick={() => router.push(backTo)} className="text-sm hover:text-white transition-colors" style={{ color: "#7070a0" }}>← Back</button>
            )}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #f4c542, #e8a020)" }}>
                <svg width="14" height="14" viewBox="0 0 28 28" fill="none">
                  <path d="M14 2L17.5 10.5L26 11.5L20 17.5L21.5 26L14 22L6.5 26L8 17.5L2 11.5L10.5 10.5L14 2Z" fill="#0a0a0f" />
                </svg>
              </div>
              <span className="font-display font-semibold text-white">{title}</span>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">

            {/* Search button */}
            <button onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all hover:bg-white/5"
              style={{ color: "#7070a0", border: "1px solid rgba(255,255,255,0.07)" }}>
              <span>🔍</span>
              <span className="hidden sm:inline text-xs">Search...</span>
              <span className="hidden sm:inline text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", fontSize: "10px" }}>⌘K</span>
            </button>

            {/* Theme toggle */}
            <button onClick={toggleTheme}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/5 text-lg"
              title={isDark ? "Switch to Light" : "Switch to Dark"}>
              {isDark ? "🌙" : "☀️"}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) markAllRead(); }}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/5 relative">
                <span className="text-lg">🔔</span>
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold"
                    style={{ background: "#f87171", color: "white", fontSize: "10px" }}>{unread}</span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 top-12 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden"
                  style={{ background: "rgba(18,18,30,0.98)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(20px)" }}>
                  <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <span className="text-sm font-semibold text-white">Notifications</span>
                    <button onClick={() => setShowNotifs(false)} className="text-xs" style={{ color: "#7070a0" }}>✕</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifs.length === 0 ? (
                      <div className="text-center py-8 text-sm" style={{ color: "#7070a0" }}>🎉 All caught up!</div>
                    ) : notifs.map(n => (
                      <div key={n.id} className="flex gap-3 p-3 border-b transition-colors hover:bg-white/3"
                        style={{ borderColor: "rgba(255,255,255,0.04)", background: n.read ? "transparent" : "rgba(244,197,66,0.03)" }}>
                        <span className="text-lg flex-shrink-0 mt-0.5">{notifIcons[n.type]}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium" style={{ color: notifColors[n.type] }}>{n.title}</div>
                          <div className="text-xs mt-0.5 leading-relaxed" style={{ color: "#7070a0" }}>{n.message}</div>
                          <div className="text-xs mt-1" style={{ color: "#404060" }}>{n.time}</div>
                        </div>
                        {!n.read && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: "#f4c542" }} />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Logout */}
            <button onClick={logout}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all hover:bg-red-500/10"
              style={{ color: "#f87171", border: "1px solid rgba(248,113,113,0.15)" }}>
              ↩ Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Global Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={() => { setShowSearch(false); setSearchQ(""); }}>
          <div className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: "rgba(18,18,30,0.98)", border: "1px solid rgba(255,255,255,0.1)" }}
            onClick={e => e.stopPropagation()}>

            {/* Search Input */}
            <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <span className="text-xl">🔍</span>
              <input ref={searchRef} value={searchQ} onChange={e => setSearchQ(e.target.value)}
                className="flex-1 bg-transparent text-white text-base outline-none placeholder-gray-600"
                placeholder="Search tasks, notes, projects..." />
              {searching && <div className="w-4 h-4 border border-yellow-400 border-t-transparent rounded-full animate-spin" />}
              <button onClick={() => { setShowSearch(false); setSearchQ(""); }}
                className="text-sm px-2 py-1 rounded" style={{ color: "#7070a0" }}>ESC</button>
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto">
              {searchQ && searchResults.length === 0 && !searching && (
                <div className="text-center py-10 text-sm" style={{ color: "#7070a0" }}>
                  No results for "{searchQ}"
                </div>
              )}
              {searchResults.map((r, i) => (
                <button key={i}
                  onClick={() => { router.push(r.type === "task" ? "/tasks" : r.type === "note" ? "/messages" : "/tasks"); setShowSearch(false); }}
                  className="w-full flex items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-white/5 border-b"
                  style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <span className="text-xl flex-shrink-0">{resultIcons[r.type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{r.title}</div>
                    <div className="text-xs mt-0.5 truncate" style={{ color: "#7070a0" }}>{r.sub}</div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: r.color + "20", color: r.color }}>{r.type}</span>
                </button>
              ))}
              {!searchQ && (
                <div className="p-4">
                  <div className="text-xs mb-3 font-medium" style={{ color: "#5050708" }}>QUICK NAV</div>
                  {[
                    { icon: "📊", label: "Dashboard",  path: "/dashboard" },
                    { icon: "📋", label: "Tasks",       path: "/tasks"     },
                    { icon: "📈", label: "Analytics",   path: "/analytics" },
                    { icon: "📝", label: "Notes",       path: "/messages"  },
                    { icon: "📅", label: "Calendar",    path: "/calendar"  },
                    { icon: "⚙️", label: "Settings",    path: "/settings"  },
                  ].map(item => (
                    <button key={item.path} onClick={() => { router.push(item.path); setShowSearch(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all hover:bg-white/5 text-left">
                      <span>{item.icon}</span>
                      <span className="text-white">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close notifs */}
      {showNotifs && <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />}
    </>
  );
}
