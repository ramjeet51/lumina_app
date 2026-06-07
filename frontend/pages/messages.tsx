import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import AnimatedBackground from "../components/AnimatedBackground";
import Navbar from "../components/Navbar";
import { apiRequest, getToken, removeToken } from "../lib/api";

const NOTE_COLORS = [
  { id: "gold",    bg: "rgba(244,197,66,0.08)",  border: "rgba(244,197,66,0.25)",  text: "#f4c542" },
  { id: "purple",  bg: "rgba(129,140,248,0.08)", border: "rgba(129,140,248,0.25)", text: "#818cf8" },
  { id: "green",   bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.25)",  text: "#34d399" },
  { id: "red",     bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.25)", text: "#f87171" },
  { id: "cyan",    bg: "rgba(6,182,212,0.08)",   border: "rgba(6,182,212,0.25)",   text: "#06b6d4" },
];

interface Note {
  id: number;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

const emptyForm = { title: "", content: "", color: "gold", pinned: false };

export default function MessagesPage() {
  const router = useRouter();
  const token = typeof window !== "undefined" ? getToken() : null;
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!token) { router.replace("/"); return; }
    fetchNotes();
  }, []);

  async function fetchNotes() {
    setLoading(true);
    try {
      const d = await apiRequest("/api/notes", {}, token!);
      setNotes(d.notes);
    } catch { removeToken(); router.replace("/"); }
    finally { setLoading(false); }
  }

  async function saveNote() {
    if (!form.title.trim() && !form.content.trim()) return;
    setSaving(true);
    try {
      if (editNote) {
        const d = await apiRequest(`/api/notes/${editNote.id}`, { method: "PATCH", body: JSON.stringify(form) }, token!);
        setNotes(n => n.map(x => x.id === editNote.id ? d.note : x));
      } else {
        const d = await apiRequest("/api/notes", { method: "POST", body: JSON.stringify(form) }, token!);
        setNotes(n => [d.note, ...n]);
      }
      closeModal();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  }

  async function deleteNote(id: number) {
    if (!confirm("Delete this note?")) return;
    await apiRequest(`/api/notes/${id}`, { method: "DELETE" }, token!);
    setNotes(n => n.filter(x => x.id !== id));
  }

  async function togglePin(note: Note) {
    const d = await apiRequest(`/api/notes/${note.id}`, { method: "PATCH", body: JSON.stringify({ pinned: !note.pinned }) }, token!);
    setNotes(n => n.map(x => x.id === note.id ? d.note : x));
  }

  function openEdit(note: Note) {
    setEditNote(note);
    setForm({ title: note.title, content: note.content, color: note.color, pinned: note.pinned });
    setShowModal(true);
  }

  function closeModal() { setShowModal(false); setEditNote(null); setForm(emptyForm); }

  const filtered = notes
    .filter(n => {
      if (filter === "pinned") return n.pinned;
      return true;
    })
    .filter(n =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
    );

  const pinned   = filtered.filter(n => n.pinned);
  const unpinned = filtered.filter(n => !n.pinned);

  function formatDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60)   return "just now";
    if (diff < 3600) return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  const colorObj = (id: string) => NOTE_COLORS.find(c => c.id === id) || NOTE_COLORS[0];

  return (
    <>
      <Head><title>Notes · Lumina</title></Head>
      <AnimatedBackground />
      <div className="relative z-10 min-h-screen">

        {/* Nav */}
        <Navbar title="Notes & Memos" backTo="/dashboard" />

        <div className="max-w-6xl mx-auto px-6 pt-24 pb-16">

          {/* Stats + Filter */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              {[
                { id: "all",    label: `All (${notes.length})` },
                { id: "pinned", label: `📌 Pinned (${notes.filter(n => n.pinned).length})` },
              ].map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={filter === f.id
                    ? { background: "rgba(244,197,66,0.15)", color: "#f4c542", border: "1px solid rgba(244,197,66,0.3)" }
                    : { background: "rgba(255,255,255,0.04)", color: "#7070a0", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="text-xs" style={{ color: "#7070a0" }}>
              {notes.length} note{notes.length !== 1 ? "s" : ""} total
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20" style={{ color: "#7070a0" }}>
              <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading notes...
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-24">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="font-display text-xl font-semibold text-white mb-2">No notes yet</h3>
              <p className="text-sm mb-6" style={{ color: "#7070a0" }}>Create your first note or memo</p>
              <button onClick={() => setShowModal(true)} className="gold-btn px-6 py-3 text-sm">+ Create Note</button>
            </div>
          ) : (
            <>
              {/* Pinned */}
              {pinned.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm font-medium" style={{ color: "#f4c542" }}>📌 Pinned</span>
                    <div className="flex-1 h-px" style={{ background: "rgba(244,197,66,0.15)" }} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pinned.map(note => <NoteCard key={note.id} note={note} onEdit={() => openEdit(note)} onDelete={() => deleteNote(note.id)} onPin={() => togglePin(note)} formatDate={formatDate} colorObj={colorObj} />)}
                  </div>
                </div>
              )}

              {/* All notes */}
              {unpinned.length > 0 && (
                <div>
                  {pinned.length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-sm font-medium" style={{ color: "#7070a0" }}>Others</span>
                      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {unpinned.map(note => <NoteCard key={note.id} note={note} onEdit={() => openEdit(note)} onDelete={() => deleteNote(note.id)} onPin={() => togglePin(note)} formatDate={formatDate} colorObj={colorObj} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="glass-card w-full max-w-lg p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg font-semibold text-white">{editNote ? "Edit Note" : "New Note"}</h2>
              <button onClick={closeModal} className="text-sm hover:text-white transition-colors" style={{ color: "#7070a0" }}>✕ Close</button>
            </div>
            <div className="space-y-4">
              <input className="gold-input w-full px-4 py-3 text-sm font-medium"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Note title..." />
              <textarea className="gold-input w-full px-4 py-3 text-sm resize-none" rows={6}
                value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Write your note here..." />

              {/* Color picker */}
              <div>
                <label className="block text-xs mb-2" style={{ color: "#9090b0" }}>Color</label>
                <div className="flex gap-2">
                  {NOTE_COLORS.map(c => (
                    <button key={c.id} onClick={() => setForm(f => ({ ...f, color: c.id }))}
                      className="w-8 h-8 rounded-lg transition-all"
                      style={{ background: c.bg, border: `2px solid ${form.color === c.id ? c.text : "transparent"}` }}>
                      <div className="w-3 h-3 rounded-full mx-auto" style={{ background: c.text }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Pin toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={form.pinned}
                    onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))} />
                  <div className="w-10 h-5 rounded-full transition-colors" style={{ background: form.pinned ? "#f4c542" : "rgba(255,255,255,0.1)" }}>
                    <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                      style={{ transform: form.pinned ? "translateX(22px)" : "translateX(2px)" }} />
                  </div>
                </div>
                <span className="text-sm" style={{ color: "#9090b0" }}>Pin this note</span>
              </label>

              <div className="flex gap-3 pt-1">
                <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl text-sm"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#7070a0" }}>Cancel</button>
                <button onClick={saveNote} disabled={saving || (!form.title.trim() && !form.content.trim())} className="gold-btn flex-1 py-2.5 text-sm">
                  {saving ? "Saving..." : editNote ? "Save Changes" : "Create Note"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NoteCard({ note, onEdit, onDelete, onPin, formatDate, colorObj }: {
  note: Note; onEdit: () => void; onDelete: () => void; onPin: () => void;
  formatDate: (s: string) => string; colorObj: (id: string) => typeof NOTE_COLORS[0];
}) {
  const c = colorObj(note.color);
  return (
    <div className="group rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.02]"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
      onClick={onEdit}>
      <div className="flex items-start justify-between mb-2 gap-2">
        <h3 className="text-sm font-semibold text-white leading-snug flex-1 line-clamp-1">
          {note.pinned && <span className="mr-1">📌</span>}{note.title || "Untitled"}
        </h3>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <button onClick={onPin} className="text-xs p-1 rounded transition-colors hover:bg-white/10"
            style={{ color: note.pinned ? "#f4c542" : "#7070a0" }}>📌</button>
          <button onClick={onDelete} className="text-xs p-1 rounded transition-colors hover:text-red-400"
            style={{ color: "#7070a0" }}>🗑️</button>
        </div>
      </div>
      {note.content && (
        <p className="text-xs leading-relaxed line-clamp-4 mb-3" style={{ color: "#9090b0" }}>{note.content}</p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: c.border + "40", color: c.text }}>
          {note.color}
        </span>
        <span className="text-xs" style={{ color: "#5050708" }}>{formatDate(note.updated_at || note.created_at)}</span>
      </div>
    </div>
  );
}
