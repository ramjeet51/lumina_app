import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import AnimatedBackground from "../components/AnimatedBackground";
import { apiRequest, setToken, setUser, getToken } from "../lib/api";

type Mode = "login" | "register";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = getToken();
    if (token) router.replace("/dashboard");
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const endpoint = mode === "login" ? "/api/login" : "/api/register";
      const body =
        mode === "login"
          ? { email: form.email, password: form.password }
          : form;
      const data = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setToken(data.token);
      setUser(data.user);
      setSuccess(data.message);
      setTimeout(() => router.push("/dashboard"), 800);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setSuccess("");
    setForm({ full_name: "", email: "", password: "" });
  };

  if (!mounted) return null;

  return (
    <>
      <Head>
        <title>{mode === "login" ? "Sign In" : "Create Account"} · Lumina</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <AnimatedBackground />

      {/* Hero Image Strip */}
      <div className="fixed top-0 right-0 w-1/2 h-full z-0 hidden lg:block">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070710] via-transparent to-transparent" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-slide-up">

          {/* Logo */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
              style={{ background: "linear-gradient(135deg, #f4c542, #e8a020)" }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M14 2L17.5 10.5L26 11.5L20 17.5L21.5 26L14 22L6.5 26L8 17.5L2 11.5L10.5 10.5L14 2Z"
                  fill="#0a0a0f" stroke="#0a0a0f" strokeWidth="1" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="font-display text-3xl font-bold text-white tracking-tight">Lumina</h1>
            <p className="text-sm mt-1" style={{ color: "#7070a0" }}>
              Your gateway to the universe
            </p>
          </div>

          {/* Card */}
          <div className="glass-card p-8">

            {/* Toggle Tabs */}
            <div className="flex rounded-xl p-1 mb-8"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {(["login", "register"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className="flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-300"
                  style={
                    mode === m
                      ? {
                          background: "linear-gradient(135deg, #f4c542, #e8a020)",
                          color: "#0a0a0f",
                          boxShadow: "0 4px 12px rgba(244,197,66,0.3)",
                        }
                      : { color: "#7070a0" }
                  }
                >
                  {m === "login" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </div>

            {/* Title */}
            <div className="mb-6">
              <h2 className="font-display text-2xl font-semibold text-white">
                {mode === "login" ? "Welcome back" : "Join Lumina"}
              </h2>
              <p className="text-sm mt-1" style={{ color: "#7070a0" }}>
                {mode === "login"
                  ? "Enter your credentials to continue"
                  : "Create your free account today"}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="animate-slide-down">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#9090b0" }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    required
                    className="gold-input w-full px-4 py-3 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#9090b0" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                  className="gold-input w-full px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#9090b0" }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder={mode === "register" ? "Min. 6 characters" : "Your password"}
                    required
                    className="gold-input w-full px-4 py-3 pr-12 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm transition-colors"
                    style={{ color: "#7070a0" }}
                  >
                    {showPass ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-sm animate-slide-down"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                  <span>⚠️</span> {error}
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-sm animate-slide-down"
                  style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#4ade80" }}>
                  <span>✅</span> {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="gold-btn w-full py-3.5 text-sm font-semibold mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {mode === "login" ? "Signing in..." : "Creating account..."}
                  </span>
                ) : mode === "login" ? (
                  "Sign In →"
                ) : (
                  "Create Account →"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
              <span className="text-xs" style={{ color: "#4040608" }}>or</span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>

            <p className="text-center text-xs" style={{ color: "#7070a0" }}>
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => switchMode(mode === "login" ? "register" : "login")}
                className="font-medium transition-colors hover:underline"
                style={{ color: "#f4c542" }}
              >
                {mode === "login" ? "Sign up free" : "Sign in"}
              </button>
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-xs mt-6" style={{ color: "#404060" }}>
            Protected by enterprise-grade encryption
          </p>
        </div>
      </div>
    </>
  );
}
