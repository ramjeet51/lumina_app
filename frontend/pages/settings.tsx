import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import AnimatedBackground from "../components/AnimatedBackground";
import Navbar from "../components/Navbar";
import { apiRequest, getToken, getUser, setUser, removeToken } from "../lib/api";

const AVATAR_STYLES = [
  { id: "avataaars", label: "Cartoon" },
  { id: "bottts", label: "Robot" },
  { id: "fun-emoji", label: "Emoji" },
  { id: "lorelei", label: "Minimal" },
  { id: "micah", label: "Illustrative" },
  { id: "pixel-art", label: "Pixel" },
];

export default function SettingsPage() {
  const router = useRouter();
  const token = typeof window !== "undefined" ? getToken() : null;
  const [user, setUserState] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  // Profile form
  const [fullName, setFullName] = useState("");
  const [avatarStyle, setAvatarStyle] = useState("avataaars");
  const [avatarSeed, setAvatarSeed] = useState("");

  // Password form
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    if (!token) { router.replace("/"); return; }
    apiRequest("/api/me", {}, token)
      .then(d => {
        setUserState(d.user);
        setFullName(d.user.full_name);
        setAvatarSeed(d.user.avatar_seed || d.user.email.split("@")[0]);
        const style = d.user.avatar_style || "avataaars";
        setAvatarStyle(style);
      })
      .catch(() => { removeToken(); router.replace("/"); });
  }, []);

  function showMsg(text: string, type = "success") {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  }

  async function saveProfile() {
    if (!fullName.trim()) return;
    setSaving(true);
    try {
      const d = await apiRequest("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ full_name: fullName, avatar_seed: avatarSeed, avatar_style: avatarStyle }),
      }, token!);
      setUserState(d.user);
      setUser(d.user);
      showMsg("Profile updated successfully!");
    } catch (e: any) { showMsg(e.message, "error"); }
    finally { setSaving(false); }
  }

  async function changePassword() {
    if (newPass !== confirmPass) { showMsg("Passwords do not match", "error"); return; }
    if (newPass.length < 6) { showMsg("Password must be at least 6 characters", "error"); return; }
    setSaving(true);
    try {
      await apiRequest("/api/password", {
        method: "PATCH",
        body: JSON.stringify({ old_password: oldPass, new_password: newPass }),
      }, token!);
      setOldPass(""); setNewPass(""); setConfirmPass("");
      showMsg("Password changed successfully!");
    } catch (e: any) { showMsg(e.message, "error"); }
    finally { setSaving(false); }
  }

  async function deleteAccount() {
    if (deleteConfirm !== user?.email) { showMsg("Email doesn't match", "error"); return; }
    try {
      await apiRequest("/api/account", { method: "DELETE" }, token!);
      removeToken();
      router.replace("/");
    } catch (e: any) { showMsg(e.message, "error"); }
  }

  const avatarUrl = `https://api.dicebear.com/8.x/${avatarStyle}/svg?seed=${avatarSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  const tabs = [
    { id: "profile",  label: "👤 Profile",  },
    { id: "password", label: "🔐 Password", },
    { id: "avatar",   label: "🎨 Avatar",   },
    { id: "danger",   label: "⚠️ Danger",   },
  ];

  return (
    <>
      <Head><title>Settings · Lumina</title></Head>
      <AnimatedBackground />
      <div className="relative z-10 min-h-screen">

        {/* Nav */}
        <Navbar title="Settings" backTo="/dashboard" />

        <div className="max-w-4xl mx-auto px-6 pt-24 pb-16">

          {/* Toast */}
          {msg.text && (
            <div className="fixed top-20 right-6 z-50 px-4 py-3 rounded-xl text-sm animate-slide-down"
              style={msg.type === "error"
                ? { background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }
                : { background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399" }}>
              {msg.type === "error" ? "⚠️ " : "✅ "}{msg.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

            {/* Sidebar */}
            <div className="md:col-span-1">
              <div className="glass-card p-4">
                {/* Avatar Preview */}
                <div className="text-center mb-4 p-4">
                  <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden mb-3"
                    style={{ border: "2px solid rgba(244,197,66,0.4)", background: "rgba(244,197,66,0.1)" }}>
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || "U")}&background=f4c542&color=0a0a0f&size=128&bold=true`; }} />
                  </div>
                  <div className="text-sm font-medium text-white">{user?.full_name}</div>
                  <div className="text-xs mt-0.5" style={{ color: "#7070a0" }}>{user?.email}</div>
                </div>

                {/* Tabs */}
                <div className="space-y-1">
                  {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all"
                      style={activeTab === t.id
                        ? { background: "rgba(244,197,66,0.12)", color: "#f4c542", border: "1px solid rgba(244,197,66,0.2)" }
                        : { color: "#7070a0" }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="md:col-span-3">

              {/* Profile Tab */}
              {activeTab === "profile" && (
                <div className="glass-card p-6 animate-fade-in">
                  <h2 className="font-display text-xl font-semibold text-white mb-6">Edit Profile</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs mb-1.5" style={{ color: "#9090b0" }}>Full Name</label>
                      <input className="gold-input w-full px-4 py-3 text-sm" value={fullName}
                        onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1.5" style={{ color: "#9090b0" }}>Email Address</label>
                      <input className="gold-input w-full px-4 py-3 text-sm opacity-50 cursor-not-allowed"
                        value={user?.email || ""} disabled />
                      <p className="text-xs mt-1" style={{ color: "#5050708" }}>Email cannot be changed</p>
                    </div>
                    <div>
                      <label className="block text-xs mb-1.5" style={{ color: "#9090b0" }}>Avatar Seed (nickname for avatar)</label>
                      <input className="gold-input w-full px-4 py-3 text-sm" value={avatarSeed}
                        onChange={e => setAvatarSeed(e.target.value)} placeholder="e.g. ramjeet" />
                    </div>
                    <button onClick={saveProfile} disabled={saving} className="gold-btn px-6 py-3 text-sm">
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              )}

              {/* Password Tab */}
              {activeTab === "password" && (
                <div className="glass-card p-6 animate-fade-in">
                  <h2 className="font-display text-xl font-semibold text-white mb-6">Change Password</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs mb-1.5" style={{ color: "#9090b0" }}>Current Password</label>
                      <input type="password" className="gold-input w-full px-4 py-3 text-sm"
                        value={oldPass} onChange={e => setOldPass(e.target.value)} placeholder="Enter current password" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1.5" style={{ color: "#9090b0" }}>New Password</label>
                      <input type="password" className="gold-input w-full px-4 py-3 text-sm"
                        value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Min. 6 characters" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1.5" style={{ color: "#9090b0" }}>Confirm New Password</label>
                      <input type="password" className="gold-input w-full px-4 py-3 text-sm"
                        value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Repeat new password" />
                    </div>
                    {newPass && confirmPass && newPass !== confirmPass && (
                      <p className="text-xs" style={{ color: "#f87171" }}>⚠️ Passwords do not match</p>
                    )}
                    <button onClick={changePassword} disabled={saving || !oldPass || !newPass || !confirmPass} className="gold-btn px-6 py-3 text-sm">
                      {saving ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </div>
              )}

              {/* Avatar Tab */}
              {activeTab === "avatar" && (
                <div className="glass-card p-6 animate-fade-in">
                  <h2 className="font-display text-xl font-semibold text-white mb-6">Choose Avatar Style</h2>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {AVATAR_STYLES.map(style => {
                      const url = `https://api.dicebear.com/8.x/${style.id}/svg?seed=${avatarSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
                      return (
                        <button key={style.id} onClick={() => setAvatarStyle(style.id)}
                          className="p-3 rounded-xl transition-all flex flex-col items-center gap-2"
                          style={avatarStyle === style.id
                            ? { background: "rgba(244,197,66,0.12)", border: "2px solid rgba(244,197,66,0.5)" }
                            : { background: "rgba(255,255,255,0.03)", border: "2px solid rgba(255,255,255,0.06)" }}>
                          <div className="w-16 h-16 rounded-xl overflow-hidden" style={{ background: "rgba(244,197,66,0.1)" }}>
                            <img src={url} alt={style.label} className="w-full h-full object-cover" />
                          </div>
                          <span className="text-xs font-medium" style={{ color: avatarStyle === style.id ? "#f4c542" : "#7070a0" }}>
                            {style.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={saveProfile} disabled={saving} className="gold-btn px-6 py-3 text-sm">
                    {saving ? "Saving..." : "Save Avatar"}
                  </button>
                </div>
              )}

              {/* Danger Zone Tab */}
              {activeTab === "danger" && (
                <div className="glass-card p-6 animate-fade-in" style={{ border: "1px solid rgba(239,68,68,0.2)" }}>
                  <h2 className="font-display text-xl font-semibold mb-2" style={{ color: "#f87171" }}>⚠️ Danger Zone</h2>
                  <p className="text-sm mb-6" style={{ color: "#7070a0" }}>These actions are permanent and cannot be undone.</p>

                  <div className="p-4 rounded-xl mb-4" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    <h3 className="text-sm font-semibold text-white mb-1">Delete Account</h3>
                    <p className="text-xs mb-4" style={{ color: "#7070a0" }}>
                      This will permanently delete your account, all tasks, projects, and data.
                    </p>
                    <label className="block text-xs mb-1.5" style={{ color: "#9090b0" }}>
                      Type your email <span style={{ color: "#f87171" }}>{user?.email}</span> to confirm
                    </label>
                    <input className="gold-input w-full px-4 py-3 text-sm mb-3"
                      value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                      placeholder="Enter your email to confirm" />
                    <button onClick={deleteAccount}
                      disabled={deleteConfirm !== user?.email}
                      className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
                      style={{ background: "rgba(239,68,68,0.2)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
                      🗑️ Delete My Account
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
