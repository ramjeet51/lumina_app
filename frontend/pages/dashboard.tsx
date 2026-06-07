import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import AnimatedBackground from "../components/AnimatedBackground";
import Navbar from "../components/Navbar";
import { apiRequest, getToken, getUser, removeToken } from "../lib/api";

const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
];

const LOFI_STREAMS = [
  { label: "Lofi Hip Hop 🎵",     url: "https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&mute=0" },
  { label: "Jazz Vibes ☕",        url: "https://www.youtube.com/embed/HuFYqnbVbzY?autoplay=1&mute=0" },
  { label: "Deep Focus 🧠",        url: "https://www.youtube.com/embed/5qap5aO4i9A?autoplay=1&mute=0" },
  { label: "Classical 🎻",         url: "https://www.youtube.com/embed/mGQLXRTl3Z0?autoplay=1&mute=0" },
  { label: "Nature Sounds 🌿",     url: "https://www.youtube.com/embed/eKFTSSKCzWA?autoplay=1&mute=0" },
  { label: "Coding Music 💻",      url: "https://www.youtube.com/embed/lTRiuFIWV54?autoplay=1&mute=0" },
  { label: "Chillhop Radio 🌙",    url: "https://www.youtube.com/embed/7NOSDKb0HlU?autoplay=1&mute=0" },
  { label: "Piano Focus 🎹",       url: "https://www.youtube.com/embed/4oStw0r33so?autoplay=1&mute=0" },
];

const COVER_PHOTOS = [
  "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1446776858070-70c3d5ed6758?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1200&auto=format&fit=crop",
];

interface User {
  id: number;
  full_name: string;
  email: string;
  avatar_seed: string;
  member_since?: string;
  last_login?: string;
  login_count?: number;
}

const UNSPLASH_IMGS = [
  "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800&auto=format&fit=crop",
];

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function formatTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit",
  });
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [quote] = useState(() => QUOTES[new Date().getDate() % QUOTES.length]);
  const [time, setTime] = useState(new Date());
  const [showMusic, setShowMusic] = useState(false);
  const [musicIdx, setMusicIdx] = useState(() => Math.floor(Math.random() * 8));
  const [musicOn, setMusicOn] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);
  const [coverIdx, setCoverIdx] = useState(() => {
    if (typeof window !== "undefined") return parseInt(localStorage.getItem("coverIdx") || "0");
    return 0;
  });
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [greeting, setGreeting] = useState("Good day");

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Good morning");
    else if (h < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    const token = getToken();
    if (!token) { router.replace("/"); return; }

    // Try cached user first
    const cached = getUser();
    if (cached) setUser(cached);

    // Fetch fresh data
    apiRequest("/api/me", {}, token)
      .then((d) => setUser(d.user))
      .catch(() => { removeToken(); router.replace("/"); })
      .finally(() => setLoading(false));

    // Cycle background images
    const interval = setInterval(() => setImgIdx((i) => (i + 1) % UNSPLASH_IMGS.length), 6000);
    const clock = setInterval(() => setTime(new Date()), 1000);
    return () => { clearInterval(interval); clearInterval(clock); };
  }, []);

  // Auto-play random station on first visit of the day
  useEffect(() => {
    const today = new Date().toDateString();
    const lastPlayed = localStorage.getItem("lastMusicDay");
    if (lastPlayed !== today) {
      const randomIdx = Math.floor(Math.random() * LOFI_STREAMS.length);
      setMusicIdx(randomIdx);
      setAutoStarted(true);
      localStorage.setItem("lastMusicDay", today);
    }
  }, []);

  const logout = () => {
    removeToken();
    router.push("/");
  };

  function changeCover(idx: number) {
    setCoverIdx(idx);
    localStorage.setItem("coverIdx", String(idx));
    setShowCoverPicker(false);
  }

  if (loading && !user) {
    return (
      <>
        <AnimatedBackground />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p style={{ color: "#7070a0" }}>Loading your dashboard…</p>
          </div>
        </div>
      </>
    );
  }

  const avatarUrl = `https://api.dicebear.com/8.x/avataaars/svg?seed=${user?.avatar_seed || "default"}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  return (
    <>
      <Head>
        <title>Dashboard · Lumina</title>
      </Head>

      <AnimatedBackground />

      {/* Ambient background image */}
      <div className="fixed inset-0 z-0 transition-all duration-2000">
        {UNSPLASH_IMGS.map((src, i) => (
          <div
            key={i}
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-2000"
            style={{
              backgroundImage: `url('${src}')`,
              opacity: i === imgIdx ? 0.06 : 0,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 min-h-screen">
        {/* ─── Top Nav ─── */}
        <Navbar title="Lumina Dashboard" />

        {/* ─── Main Content ─── */}
        <main className="max-w-6xl mx-auto px-6 pt-28 pb-16">

          {/* Cover Photo */}
          <div className="relative mb-6 rounded-2xl overflow-hidden group" style={{ height: "160px" }}>
            <div className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
              style={{ backgroundImage: `url('${COVER_PHOTOS[coverIdx]}')` }} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 0%, rgba(7,7,16,0.7) 100%)" }} />
            <button onClick={() => setShowCoverPicker(!showCoverPicker)}
              className="absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-all"
              style={{ background: "rgba(0,0,0,0.5)", color: "white", backdropFilter: "blur(8px)" }}>
              🖼️ Change Cover
            </button>
            {showCoverPicker && (
              <div className="absolute top-10 right-3 p-3 rounded-xl z-10 grid grid-cols-3 gap-2"
                style={{ background: "rgba(10,10,20,0.95)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(12px)" }}>
                {COVER_PHOTOS.map((url, i) => (
                  <button key={i} onClick={() => changeCover(i)}
                    className="w-20 h-12 rounded-lg overflow-hidden transition-all hover:scale-105"
                    style={{ backgroundImage: `url('${url}')`, backgroundSize: "cover", outline: coverIdx === i ? "2px solid #f4c542" : "none" }} />
                ))}
              </div>
            )}
          </div>

          {/* Welcome Hero */}
          <div className="glass-card p-8 mb-8 relative overflow-hidden animate-fade-in">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
              style={{ background: "radial-gradient(circle, #f4c542, transparent 70%)", transform: "translate(30%, -30%)" }} />

            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl overflow-hidden"
                  style={{ border: "2px solid rgba(244,197,66,0.4)", background: "rgba(244,197,66,0.1)" }}>
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || "U")}&background=f4c542&color=0a0a0f&size=128&bold=true`;
                    }}
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full"
                  style={{ border: "2px solid #070710" }} />
              </div>

              <div className="flex-1">
                <p className="text-sm mb-1" style={{ color: "#7070a0" }}>{greeting} 👋</p>
                <h1 className="font-display text-3xl font-bold text-white">
                  {user?.full_name}
                </h1>
                <p className="text-sm mt-1" style={{ color: "#9090b0" }}>{user?.email}</p>
              </div>

              <div className="hidden md:block text-right">
                <div className="text-xs mb-1" style={{ color: "#7070a0" }}>Member ID</div>
                <div className="font-mono text-sm font-medium mb-2"
                  style={{ color: "#f4c542" }}>#{String(user?.id).padStart(6, "0")}</div>
                <div className="text-xs" style={{ color: "#7070a0" }}>🌍 {Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
                <div className="font-mono text-lg font-bold text-white mt-0.5">
                  {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              {
                icon: "🗓️",
                label: "Member Since",
                value: formatDate(user?.member_since),
                sub: "Account created",
                color: "#818cf8",
              },
              {
                icon: "⚡",
                label: "Last Login",
                value: formatDate(user?.last_login),
                sub: formatTime(user?.last_login),
                color: "#f4c542",
              },
              {
                icon: "🔐",
                label: "Total Logins",
                value: user?.login_count ?? 0,
                sub: "Successful sessions",
                color: "#34d399",
              },
            ].map((s, i) => (
              <div key={i} className="stat-card p-6 animate-slide-up"
                style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{s.icon}</span>
                  <div className="w-2 h-2 rounded-full opacity-60"
                    style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
                </div>
                <div className="text-2xl font-display font-bold text-white mb-1">{s.value}</div>
                <div className="text-xs" style={{ color: "#7070a0" }}>
                  <span style={{ color: s.color }}>{s.label}</span> · {s.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Daily Quote */}
          <div className="mb-6 p-5 rounded-2xl relative overflow-hidden animate-fade-in"
            style={{ background: "rgba(244,197,66,0.06)", border: "1px solid rgba(244,197,66,0.15)" }}>
            <div className="flex items-start gap-4">
              <span className="text-3xl flex-shrink-0">💡</span>
              <div className="flex-1">
                <p className="text-sm italic leading-relaxed text-white mb-1">"{quote.text}"</p>
                <p className="text-xs font-medium" style={{ color: "#f4c542" }}>— {quote.author}</p>
              </div>
              <button onClick={() => setShowMusic(!showMusic)}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                style={musicOn
                  ? { background: "rgba(244,197,66,0.2)", color: "#f4c542", border: "1px solid rgba(244,197,66,0.4)" }
                  : { background: "rgba(255,255,255,0.05)", color: "#7070a0", border: "1px solid rgba(255,255,255,0.08)" }}>
                {musicOn ? "🎵 Playing" : "🎵 Focus Music"}
              </button>
            </div>
          </div>

          {/* Focus Music Player */}
          {showMusic && (
            <div className="mb-6 p-5 rounded-2xl animate-slide-down"
              style={{ background: "rgba(129,140,248,0.07)", border: "1px solid rgba(129,140,248,0.2)" }}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-display text-base font-semibold text-white">🎵 Focus Music</h3>
                <div className="flex items-center gap-2">
                  {musicOn && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                      style={{ background: "rgba(129,140,248,0.15)" }}>
                      <div className="flex gap-0.5 items-end h-4">
                        {[3,5,4,6,3,5].map((h,i) => (
                          <div key={i} className="w-1 rounded-full animate-pulse"
                            style={{ height: h*3+"px", background: "#818cf8", animationDelay: i*0.1+"s" }} />
                        ))}
                      </div>
                      <span className="text-xs" style={{ color: "#818cf8" }}>Live</span>
                    </div>
                  )}
                  <button onClick={() => { setShowMusic(false); setMusicOn(false); }}
                    className="text-xs px-2 py-1 rounded-lg transition-all hover:bg-white/5" style={{ color: "#7070a0" }}>✕</button>
                </div>
              </div>
              <p className="text-xs mb-4" style={{ color: "#7070a0" }}>
                🎲 Today&apos;s random pick: <span style={{ color: "#818cf8" }}>{LOFI_STREAMS[musicIdx].label}</span>
              </p>

              {/* Station Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {LOFI_STREAMS.map((s, i) => (
                  <button key={i} onClick={() => { setMusicIdx(i); setMusicOn(true); }}
                    className="px-2 py-2 rounded-xl text-xs font-medium transition-all text-center"
                    style={musicIdx === i && musicOn
                      ? { background: "rgba(129,140,248,0.2)", color: "#818cf8", border: "1px solid rgba(129,140,248,0.5)", boxShadow: "0 0 12px rgba(129,140,248,0.2)" }
                      : { background: "rgba(255,255,255,0.04)", color: "#7070a0", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Player Controls */}
              <div className="flex items-center gap-3">
                <button onClick={() => { setMusicIdx(i => (i - 1 + LOFI_STREAMS.length) % LOFI_STREAMS.length); setMusicOn(true); }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/10"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#7070a0" }}>⏮</button>

                <button onClick={() => setMusicOn(!musicOn)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={musicOn
                    ? { background: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)" }
                    : { background: "rgba(129,140,248,0.15)", color: "#818cf8", border: "1px solid rgba(129,140,248,0.3)" }}>
                  {musicOn ? "⏹ Stop Playing" : "▶ Play Station"}
                </button>

                <button onClick={() => { setMusicIdx(i => (i + 1) % LOFI_STREAMS.length); setMusicOn(true); }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/10"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#7070a0" }}>⏭</button>

                <button onClick={() => { setMusicIdx(Math.floor(Math.random() * LOFI_STREAMS.length)); setMusicOn(true); }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/10"
                  title="Random station"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#7070a0" }}>🎲</button>
              </div>

              {/* Hidden iframe player */}
              {musicOn && (
                <div style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", opacity: 0 }}>
                  <iframe key={musicIdx} src={LOFI_STREAMS[musicIdx].url} width="1" height="1"
                    allow="autoplay" style={{ border: "none" }} />
                </div>
              )}
            </div>
          )}

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Profile Card */}
            <div className="lg:col-span-1">
              <div className="stat-card p-6 h-full">
                <h3 className="font-display text-lg font-semibold text-white mb-5">Your Profile</h3>

                <div className="space-y-4">
                  {[
                    { label: "Full Name", value: user?.full_name, icon: "👤" },
                    { label: "Email", value: user?.email, icon: "✉️" },
                    { label: "Status", value: "Active ✓", icon: "🟢" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.025)" }}>
                      <span>{item.icon}</span>
                      <div className="min-w-0">
                        <div className="text-xs mb-0.5" style={{ color: "#7070a0" }}>{item.label}</div>
                        <div className="text-sm text-white font-medium truncate">{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 rounded-xl text-center"
                  style={{ background: "rgba(244,197,66,0.07)", border: "1px solid rgba(244,197,66,0.15)" }}>
                  <div className="text-xs mb-1" style={{ color: "#f4c542" }}>Account Health</div>
                  <div className="text-2xl font-display font-bold text-white">100%</div>
                  <div className="mt-2 h-1.5 rounded-full overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full animate-pulse"
                      style={{ width: "100%", background: "linear-gradient(90deg, #f4c542, #e8a020)" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="lg:col-span-2 space-y-4">
              <div className="stat-card p-6">
                <h3 className="font-display text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: "🚀", label: "Launch Project", color: "#818cf8", onClick: () => router.push("/tasks") },
                    { icon: "📊", label: "View Analytics", color: "#34d399", onClick: () => router.push("/analytics") },
                    { icon: "⚙️", label: "Settings", color: "#f4c542", onClick: () => router.push("/settings") },
                    { icon: "💬", label: "Messages", color: "#f87171", onClick: () => router.push("/messages") },
                    { icon: "📅", label: "Calendar", color: "#06b6d4", onClick: () => router.push("/calendar") },
                  ].map((a, i) => (
                    <button key={i}
                      onClick={a.onClick}
                      className="p-4 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-95"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
    }}
  >
    <span className="text-2xl block mb-2">{a.icon}</span>
    <span className="text-sm font-medium" style={{ color: a.color }}>{a.label}</span>
  </button>
))}
                </div>
              </div>

              {/* Space image card */}
              <div className="stat-card overflow-hidden relative" style={{ minHeight: "200px" }}>
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: "url('https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=800&auto=format&fit=crop')",
                    opacity: 0.4,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#12121a] via-[#12121a]/50 to-transparent" />
                <div className="relative p-6">
                  <div className="text-xs font-medium mb-2" style={{ color: "#f4c542" }}>✨ PRO FEATURE</div>
                  <h3 className="font-display text-xl font-bold text-white mb-2">Explore the Universe</h3>
                  <p className="text-sm mb-4" style={{ color: "#9090b0" }}>
                    Unlock advanced capabilities and take your experience to new heights.
                  </p>
                  <button className="gold-btn px-5 py-2 text-sm">Upgrade Now</button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <p className="text-center text-xs mt-10" style={{ color: "#404060" }}>
            You are securely logged in · Session expires in 24 hours
          </p>
        </main>
      </div>
    </>
  );
}
