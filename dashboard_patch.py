import os, re

path = os.path.expanduser("~/lumina-full-project/frontend/pages/dashboard.tsx")
content = open(path).read()

# 1. Add new imports after existing imports
old_import = 'import { apiRequest, getToken, getUser, removeToken } from "../lib/api";'
new_import = '''import { apiRequest, getToken, getUser, removeToken } from "../lib/api";

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
  { label: "Lofi Hip Hop 🎵", url: "https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1" },
  { label: "Jazz Vibes ☕",   url: "https://www.youtube.com/embed/HuFYqnbVbzY?autoplay=1" },
  { label: "Deep Focus 🧠",   url: "https://www.youtube.com/embed/5qap5aO4i9A?autoplay=1" },
];

const COVER_PHOTOS = [
  "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1475274047050-1d0c0975c63e?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1446776858070-70c3d5ed6758?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1200&auto=format&fit=crop",
];'''

content = content.replace(old_import, new_import)

# 2. Add new state variables after existing ones
old_state = '  const [imgIdx, setImgIdx] = useState(0);'
new_state = '''  const [imgIdx, setImgIdx] = useState(0);
  const [quote] = useState(() => QUOTES[new Date().getDate() % QUOTES.length]);
  const [time, setTime] = useState(new Date());
  const [showMusic, setShowMusic] = useState(false);
  const [musicIdx, setMusicIdx] = useState(0);
  const [musicOn, setMusicOn] = useState(false);
  const [coverIdx, setCoverIdx] = useState(() => {
    if (typeof window !== "undefined") return parseInt(localStorage.getItem("coverIdx") || "0");
    return 0;
  });
  const [showCoverPicker, setShowCoverPicker] = useState(false);'''

content = content.replace(old_state, new_state)

# 3. Add clock timer in useEffect
old_effect = '    const interval = setInterval(() => setImgIdx((i) => (i + 1) % UNSPLASH_IMGS.length), 6000);'
new_effect = '''    const interval = setInterval(() => setImgIdx((i) => (i + 1) % UNSPLASH_IMGS.length), 6000);
    const clock = setInterval(() => setTime(new Date()), 1000);'''

content = content.replace(old_effect, new_effect)

# 4. Fix cleanup
old_cleanup = '    return () => clearInterval(interval);'
new_cleanup = '''    return () => { clearInterval(interval); clearInterval(clock); };'''
content = content.replace(old_cleanup, new_cleanup)

# 5. Add cover photo change function before return statement
old_return = '  if (loading && !user) {'
new_return = '''  function changeCover(idx: number) {
    setCoverIdx(idx);
    localStorage.setItem("coverIdx", String(idx));
    setShowCoverPicker(false);
  }

  if (loading && !user) {'''
content = content.replace(old_return, new_return)

# 6. Replace the static welcome hero card with dynamic cover photo version
old_hero = '''          {/* Welcome Hero */}
          <div className="glass-card p-8 mb-8 relative overflow-hidden animate-fade-in">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
              style={{ background: "radial-gradient(circle, #f4c542, transparent 70%)", transform: "translate(30%, -30%)" }} />'''

new_hero = '''          {/* Cover Photo */}
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
              style={{ background: "radial-gradient(circle, #f4c542, transparent 70%)", transform: "translate(30%, -30%)" }} />'''

content = content.replace(old_hero, new_hero)

# 7. Add timezone clock inside welcome hero — after member ID div
old_memberid = '''              <div className="hidden md:block text-right">
                <div className="text-xs mb-1" style={{ color: "#7070a0" }}>Member ID</div>
                <div className="font-mono text-sm font-medium"
                  style={{ color: "#f4c542" }}>#{String(user?.id).padStart(6, "0")}</div>
              </div>'''

new_memberid = '''              <div className="hidden md:block text-right">
                <div className="text-xs mb-1" style={{ color: "#7070a0" }}>Member ID</div>
                <div className="font-mono text-sm font-medium mb-2"
                  style={{ color: "#f4c542" }}>#{String(user?.id).padStart(6, "0")}</div>
                <div className="text-xs" style={{ color: "#7070a0" }}>🌍 {Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
                <div className="font-mono text-lg font-bold text-white mt-0.5">
                  {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </div>
              </div>'''

content = content.replace(old_memberid, new_memberid)

# 8. Add Daily Quote + Music Player after stats row, before two column layout
old_two_col = '          {/* Two Column Layout */}'
new_two_col = '''          {/* Daily Quote */}
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-base font-semibold text-white">🎵 Focus Music</h3>
                <button onClick={() => { setShowMusic(false); setMusicOn(false); }}
                  className="text-xs" style={{ color: "#7070a0" }}>✕ Close</button>
              </div>
              <div className="flex gap-2 mb-4 flex-wrap">
                {LOFI_STREAMS.map((s, i) => (
                  <button key={i} onClick={() => { setMusicIdx(i); setMusicOn(true); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={musicIdx === i && musicOn
                      ? { background: "rgba(129,140,248,0.2)", color: "#818cf8", border: "1px solid rgba(129,140,248,0.4)" }
                      : { background: "rgba(255,255,255,0.04)", color: "#7070a0", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {s.label}
                  </button>
                ))}
                {musicOn && (
                  <button onClick={() => setMusicOn(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
                    ⏹ Stop
                  </button>
                )}
              </div>
              {musicOn && (
                <div className="rounded-xl overflow-hidden" style={{ height: "80px" }}>
                  <iframe src={LOFI_STREAMS[musicIdx].url} width="100%" height="80"
                    allow="autoplay" style={{ border: "none" }} />
                </div>
              )}
              {!musicOn && (
                <div className="text-center py-4 text-sm" style={{ color: "#7070a0" }}>
                  Select a station above to start playing 🎶
                </div>
              )}
            </div>
          )}

          {/* Two Column Layout */}'''

content = content.replace(old_two_col, new_two_col)

open(path, "w").write(content)
print("✅ Dashboard patched successfully!")
