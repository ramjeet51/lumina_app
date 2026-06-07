import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import AnimatedBackground from "../components/AnimatedBackground";
import Navbar from "../components/Navbar";
import { apiRequest, getToken, removeToken } from "../lib/api";

const PRIORITIES = ["low", "medium", "high"];
const LABELS = ["Feature", "Bug", "Design", "Research", "Marketing", "Other"];
const COLUMNS = [
  { key: "todo",       label: "📋 To Do",      color: "#818cf8" },
  { key: "inprogress", label: "⚡ In Progress", color: "#f4c542" },
  { key: "done",       label: "✅ Done",        color: "#34d399" },
];
const PRIORITY_COLORS = { low: "#34d399", medium: "#f4c542", high: "#f87171" };
const emptyForm = { title: "", description: "", priority: "medium", label: "", due_date: "", project_id: "" };

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [projectForm, setProjectForm] = useState({ name: "", color: "#f4c542" });
  const [activeProject, setActiveProject] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const token = typeof window !== "undefined" ? getToken() : null;

  useEffect(() => {
    if (!token) { router.replace("/"); return; }
    fetchAll();
  }, [activeProject]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [td, pd] = await Promise.all([
        apiRequest(`/api/tasks${activeProject ? "?project_id=" + activeProject : ""}`, {}, token),
        apiRequest("/api/projects", {}, token),
      ]);
      setTasks(td.tasks);
      setProjects(pd.projects);
    } catch { removeToken(); router.replace("/"); }
    finally { setLoading(false); }
  }

  async function saveTask() {
    setSaving(true);
    try {
      const body = {
        ...form,
        project_id: form.project_id ? Number(form.project_id) : null,
        due_date: form.due_date || null,
        description: form.description || null,
        label: form.label || null,
      };
      if (editTask) {
        const d = await apiRequest("/api/tasks/" + editTask.id, { method: "PATCH", body: JSON.stringify(body) }, token);
        setTasks(t => t.map(x => x.id === editTask.id ? d.task : x));
      } else {
        const d = await apiRequest("/api/tasks", { method: "POST", body: JSON.stringify({ ...body, status: "todo" }) }, token);
        setTasks(t => [d.task, ...t]);
      }
      closeModal();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  async function moveTask(id, status) {
    await apiRequest("/api/tasks/" + id, { method: "PATCH", body: JSON.stringify({ status }) }, token);
    setTasks(t => t.map(x => x.id === id ? { ...x, status } : x));
  }

  async function deleteTask(id) {
    if (!confirm("Delete this task?")) return;
    await apiRequest("/api/tasks/" + id, { method: "DELETE" }, token);
    setTasks(t => t.filter(x => x.id !== id));
  }

  async function createProject() {
    if (!projectForm.name.trim()) return;
    const d = await apiRequest("/api/projects", { method: "POST", body: JSON.stringify(projectForm) }, token);
    setProjects(p => [d.project, ...p]);
    setProjectForm({ name: "", color: "#f4c542" });
    setShowProjectModal(false);
  }

  async function deleteProject(id) {
    if (!confirm("Delete project?")) return;
    await apiRequest("/api/projects/" + id, { method: "DELETE" }, token);
    setProjects(p => p.filter(x => x.id !== id));
    if (activeProject === id) setActiveProject(null);
  }

  function openEdit(task) {
    setEditTask(task);
    setForm({
      title: task.title, description: task.description || "",
      priority: task.priority, label: task.label || "",
      due_date: task.due_date ? task.due_date.split("T")[0] : "",
      project_id: task.project_id ? String(task.project_id) : "",
    });
    setShowModal(true);
  }

  function closeModal() { setShowModal(false); setEditTask(null); setForm(emptyForm); }

  const filtered = tasks.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    (t.label || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Head><title>Tasks · Lumina</title></Head>
      <AnimatedBackground />
      <div className="relative z-10 min-h-screen">

        {/* Nav */}
        <Navbar title="Task Manager" backTo="/dashboard" />
        {/* Action Buttons */}
        <div className="fixed top-16 left-0 right-0 z-40 flex items-center justify-end gap-3 px-6 py-3"
          style={{ background: "rgba(7,7,16,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..." className="gold-input px-3 py-1.5 text-sm w-48" />
          <button onClick={() => setShowProjectModal(true)}
            className="px-4 py-2 text-sm rounded-xl transition-all"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#9090b0" }}>
            + Project
          </button>
          <button onClick={() => setShowModal(true)} className="gold-btn px-4 py-2 text-sm">
            + New Task
          </button>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-36 pb-12">

          {/* Projects Bar */}
          {projects.length > 0 && (
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <button onClick={() => setActiveProject(null)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={!activeProject ? { background: "rgba(244,197,66,0.15)", color: "#f4c542", border: "1px solid rgba(244,197,66,0.3)" } : { background: "rgba(255,255,255,0.04)", color: "#7070a0", border: "1px solid rgba(255,255,255,0.08)" }}>
                All Tasks ({tasks.length})
              </button>
              {projects.map(p => (
                <div key={p.id} className="flex items-center gap-1">
                  <button onClick={() => setActiveProject(p.id === activeProject ? null : p.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                    style={activeProject === p.id ? { background: p.color + "22", color: p.color, border: "1px solid " + p.color + "55" } : { background: "rgba(255,255,255,0.04)", color: "#7070a0", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    {p.name} ({p.task_count})
                  </button>
                  <button onClick={() => deleteProject(p.id)} className="text-xs transition-colors hover:text-red-400" style={{ color: "#404060" }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {COLUMNS.map(c => (
              <div key={c.key} className="stat-card p-4 flex items-center gap-4">
                <div className="text-3xl font-display font-bold text-white">{filtered.filter(t => t.status === c.key).length}</div>
                <div>
                  <div className="text-sm font-medium" style={{ color: c.color }}>{c.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: "#7070a0" }}>tasks</div>
                </div>
              </div>
            ))}
          </div>

          {/* Kanban */}
          {loading ? (
            <div className="text-center py-20" style={{ color: "#7070a0" }}>
              <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading tasks...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {COLUMNS.map(col => (
                <div key={col.key}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.color, boxShadow: "0 0 8px " + col.color }} />
                      <span className="text-sm font-semibold text-white">{col.label}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: col.color + "18", color: col.color }}>
                      {filtered.filter(t => t.status === col.key).length}
                    </span>
                  </div>
                  <div className="space-y-3 min-h-32">
                    {filtered.filter(t => t.status === col.key).map(task => (
                      <TaskCard key={task.id} task={task} projects={projects} onEdit={() => openEdit(task)} onDelete={() => deleteTask(task.id)} onMove={moveTask} currentCol={col.key} />
                    ))}
                    {filtered.filter(t => t.status === col.key).length === 0 && (
                      <div className="border-2 border-dashed rounded-xl p-6 text-center" style={{ borderColor: "rgba(255,255,255,0.06)", color: "#404060" }}>
                        <div className="text-2xl mb-1">✦</div>
                        <div className="text-xs">No tasks here</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal title={editTask ? "Edit Task" : "New Task"} onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "#9090b0" }}>Title *</label>
              <input className="gold-input w-full px-3 py-2.5 text-sm" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title..." />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "#9090b0" }}>Description</label>
              <textarea className="gold-input w-full px-3 py-2.5 text-sm resize-none" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional details..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#9090b0" }}>Priority</label>
                <select className="gold-input w-full px-3 py-2.5 text-sm" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#9090b0" }}>Label</label>
                <select className="gold-input w-full px-3 py-2.5 text-sm" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}>
                  <option value="">None</option>
                  {LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#9090b0" }}>Due Date</label>
                <input type="date" className="gold-input w-full px-3 py-2.5 text-sm" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#9090b0" }}>Project</label>
                <select className="gold-input w-full px-3 py-2.5 text-sm" value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}>
                  <option value="">None</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#7070a0" }}>Cancel</button>
              <button onClick={saveTask} disabled={saving || !form.title.trim()} className="gold-btn flex-1 py-2.5 text-sm">{saving ? "Saving..." : editTask ? "Save Changes" : "Create Task"}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Project Modal */}
      {showProjectModal && (
        <Modal title="New Project" onClose={() => setShowProjectModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "#9090b0" }}>Project Name *</label>
              <input className="gold-input w-full px-3 py-2.5 text-sm" value={projectForm.name} onChange={e => setProjectForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Website Redesign" />
            </div>
            <div>
              <label className="block text-xs mb-1.5" style={{ color: "#9090b0" }}>Color</label>
              <div className="flex gap-2 flex-wrap">
                {["#f4c542","#818cf8","#34d399","#f87171","#06b6d4","#f97316"].map(c => (
                  <button key={c} onClick={() => setProjectForm(f => ({ ...f, color: c }))} className="w-8 h-8 rounded-lg transition-all" style={{ background: c, outline: projectForm.color === c ? "2px solid white" : "none", outlineOffset: "2px" }} />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowProjectModal(false)} className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#7070a0" }}>Cancel</button>
              <button onClick={createProject} className="gold-btn flex-1 py-2.5 text-sm">Create Project</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function TaskCard({ task, projects, onEdit, onDelete, onMove, currentCol }) {
  const project = projects.find(p => p.id === task.project_id);
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";
  const prev = currentCol === "inprogress" ? "todo" : currentCol === "done" ? "inprogress" : null;
  const next = currentCol === "todo" ? "inprogress" : currentCol === "inprogress" ? "done" : null;
  return (
    <div className="stat-card p-4 group cursor-pointer" onClick={onEdit}>
      <div className="flex items-start justify-between mb-2 gap-2">
        <h3 className="text-sm font-medium text-white leading-snug flex-1">{task.title}</h3>
        <button onClick={e => { e.stopPropagation(); onDelete(); }} className="opacity-0 group-hover:opacity-100 text-xs transition-all hover:text-red-400 flex-shrink-0" style={{ color: "#404060" }}>✕</button>
      </div>
      {task.description && <p className="text-xs mb-3 line-clamp-2" style={{ color: "#7070a0" }}>{task.description}</p>}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: PRIORITY_COLORS[task.priority] + "18", color: PRIORITY_COLORS[task.priority] }}>{task.priority}</span>
        {task.label && <span className="px-2 py-0.5 rounded-md text-xs" style={{ background: "rgba(129,140,248,0.12)", color: "#818cf8" }}>{task.label}</span>}
        {project && <span className="px-2 py-0.5 rounded-md text-xs" style={{ background: project.color + "15", color: project.color }}>{project.name}</span>}
      </div>
      <div className="flex items-center justify-between">
        {task.due_date ? (
          <span className="text-xs" style={{ color: isOverdue ? "#f87171" : "#7070a0" }}>
            {isOverdue ? "⚠ " : "📅 "}{new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        ) : <span />}
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          {prev && <button onClick={() => onMove(task.id, prev)} className="text-xs px-2 py-0.5 rounded transition-all hover:bg-white/10" style={{ color: "#7070a0" }}>←</button>}
          {next && <button onClick={() => onMove(task.id, next)} className="text-xs px-2 py-0.5 rounded transition-all hover:bg-white/10" style={{ color: "#f4c542" }}>→</button>}
        </div>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <div className="glass-card w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-sm transition-colors hover:text-white" style={{ color: "#7070a0" }}>✕ Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}
