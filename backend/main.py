from dotenv import load_dotenv
load_dotenv()


from typing import Optional
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
import mysql.connector
import bcrypt
import jwt

from dotenv import load_dotenv
load_dotenv()
import os
from datetime import datetime, timedelta
from contextlib import contextmanager
app = FastAPI(title="Auth API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Config
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "authapp"),
    "autocommit": True,
}
JWT_SECRET = os.getenv("JWT_SECRET", "your-super-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

security = HTTPBearer()

# ─── DB Setup ────────────────────────────────────────────────────────────────

def get_db_connection():
    conn = mysql.connector.connect(**DB_CONFIG)
    return conn

def init_db():
    """Create database and tables at runtime if they don't exist."""
    config_no_db = {k: v for k, v in DB_CONFIG.items() if k != "database"}
    config_no_db["autocommit"] = True
    conn = mysql.connector.connect(**config_no_db)
    cursor = conn.cursor()

    cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_CONFIG['database']}`")
    cursor.execute(f"USE `{DB_CONFIG['database']}`")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            full_name   VARCHAR(100)  NOT NULL,
            email       VARCHAR(255)  NOT NULL UNIQUE,
            password    VARCHAR(255)  NOT NULL,
            avatar_seed VARCHAR(50)   DEFAULT NULL,
            created_at  DATETIME      DEFAULT CURRENT_TIMESTAMP,
            last_login  DATETIME      DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS login_history (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            user_id    INT       NOT NULL,
            logged_in  DATETIME  DEFAULT CURRENT_TIMESTAMP,
            ip_address VARCHAR(45) DEFAULT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            user_id     INT          NOT NULL,
            name        VARCHAR(150) NOT NULL,
            description TEXT         DEFAULT NULL,
            color       VARCHAR(20)  DEFAULT '#f4c542',
            created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            user_id     INT          NOT NULL,
            project_id  INT          DEFAULT NULL,
            title       VARCHAR(255) NOT NULL,
            description TEXT         DEFAULT NULL,
            status      ENUM('todo','inprogress','done') DEFAULT 'todo',
            priority    ENUM('low','medium','high')      DEFAULT 'medium',
            label       VARCHAR(80)  DEFAULT NULL,
            due_date    DATE         DEFAULT NULL,
            created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
            updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)

    cursor.close()
    conn.close()
    print("✅ Database and tables ready.")

# ─── Models ──────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    full_name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

# ─── Helpers ─────────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_token(user_id: int, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

# ─── Routes ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
def startup():
    init_db()

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

@app.post("/api/register", status_code=201)
def register(body: RegisterRequest):
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    if len(body.full_name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Full name is too short.")

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM users WHERE email = %s", (body.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=409, detail="Email already registered.")

        hashed = hash_password(body.password)
        avatar_seed = body.email.split("@")[0]
        cursor.execute(
            "INSERT INTO users (full_name, email, password, avatar_seed) VALUES (%s, %s, %s, %s)",
            (body.full_name.strip(), body.email.lower(), hashed, avatar_seed),
        )
        user_id = cursor.lastrowid
        token = create_token(user_id, body.email.lower())
        return {
            "message": "Account created successfully!",
            "token": token,
            "user": {
                "id": user_id,
                "full_name": body.full_name.strip(),
                "email": body.email.lower(),
                "avatar_seed": avatar_seed,
            },
        }
    finally:
        cursor.close()
        conn.close()

@app.post("/api/login")
def login(body: LoginRequest):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, full_name, email, password, avatar_seed, created_at FROM users WHERE email = %s",
            (body.email.lower(),),
        )
        user = cursor.fetchone()
        if not user or not verify_password(body.password, user["password"]):
            raise HTTPException(status_code=401, detail="Invalid email or password.")

        cursor.execute("UPDATE users SET last_login = NOW() WHERE id = %s", (user["id"],))
        cursor.execute(
            "INSERT INTO login_history (user_id) VALUES (%s)", (user["id"],)
        )

        token = create_token(user["id"], user["email"])
        return {
            "message": "Login successful!",
            "token": token,
            "user": {
                "id": user["id"],
                "full_name": user["full_name"],
                "email": user["email"],
                "avatar_seed": user["avatar_seed"],
                "member_since": user["created_at"].isoformat() if user["created_at"] else None,
            },
        }
    finally:
        cursor.close()
        conn.close()

@app.get("/api/me")
def me(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = decode_token(credentials.credentials)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token.")

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, full_name, email, avatar_seed, created_at, last_login FROM users WHERE id = %s",
            (payload["user_id"],),
        )
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        cursor.execute(
            "SELECT COUNT(*) as login_count FROM login_history WHERE user_id = %s",
            (user["id"],),
        )
        stats = cursor.fetchone()

        return {
            "user": {
                "id": user["id"],
                "full_name": user["full_name"],
                "email": user["email"],
                "avatar_seed": user["avatar_seed"],
                "member_since": user["created_at"].isoformat() if user["created_at"] else None,
                "last_login": user["last_login"].isoformat() if user["last_login"] else None,
                "login_count": stats["login_count"],
            }
        }
    finally:
        cursor.close()
        conn.close()


# ─── Models ──────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#f4c542"

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "todo"
    priority: Optional[str] = "medium"
    label: Optional[str] = None
    due_date: Optional[str] = None
    project_id: Optional[int] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    label: Optional[str] = None
    due_date: Optional[str] = None

# ─── Project Routes ───────────────────────────────────────────────────────────

@app.get("/api/projects")
def list_projects(payload=Depends(security)):
    try:
        data = decode_token(payload.credentials)
    except:
        raise HTTPException(401, "Invalid token.")
    conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT p.*, COUNT(t.id) as task_count
            FROM projects p
            LEFT JOIN tasks t ON t.project_id = p.id
            WHERE p.user_id=%s
            GROUP BY p.id ORDER BY p.created_at DESC
        """, (data["user_id"],))
        return {"projects": cursor.fetchall()}
    finally: cursor.close(); conn.close()

@app.post("/api/projects", status_code=201)
def create_project(body: ProjectCreate, payload=Depends(security)):
    try:
        data = decode_token(payload.credentials)
    except:
        raise HTTPException(401, "Invalid token.")
    conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "INSERT INTO projects (user_id,name,description,color) VALUES (%s,%s,%s,%s)",
            (data["user_id"], body.name, body.description, body.color))
        pid = cursor.lastrowid
        cursor.execute("SELECT * FROM projects WHERE id=%s", (pid,))
        return {"message": "Project created!", "project": cursor.fetchone()}
    finally: cursor.close(); conn.close()

@app.delete("/api/projects/{pid}")
def delete_project(pid: int, payload=Depends(security)):
    try:
        data = decode_token(payload.credentials)
    except:
        raise HTTPException(401, "Invalid token.")
    conn = get_db_connection(); cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM projects WHERE id=%s AND user_id=%s", (pid, data["user_id"]))
        if cursor.rowcount == 0: raise HTTPException(404, "Project not found.")
        return {"message": "Project deleted."}
    finally: cursor.close(); conn.close()

# ─── Task Routes ──────────────────────────────────────────────────────────────

@app.get("/api/tasks")
def list_tasks(project_id: Optional[int] = None, payload=Depends(security)):
    try:
        data = decode_token(payload.credentials)
    except:
        raise HTTPException(401, "Invalid token.")
    conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
    try:
        if project_id:
            cursor.execute(
                "SELECT * FROM tasks WHERE user_id=%s AND project_id=%s ORDER BY created_at DESC",
                (data["user_id"], project_id))
        else:
            cursor.execute(
                "SELECT * FROM tasks WHERE user_id=%s ORDER BY created_at DESC",
                (data["user_id"],))
        tasks = cursor.fetchall()
        for t in tasks:
            for k, v in t.items():
                if hasattr(v, 'isoformat'): t[k] = str(v)
        return {"tasks": tasks}
    finally: cursor.close(); conn.close()

@app.post("/api/tasks", status_code=201)
def create_task(body: TaskCreate, payload=Depends(security)):
    try:
        data = decode_token(payload.credentials)
    except:
        raise HTTPException(401, "Invalid token.")
    conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            INSERT INTO tasks (user_id,project_id,title,description,status,priority,label,due_date)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
        """, (data["user_id"], body.project_id, body.title, body.description,
              body.status, body.priority, body.label, body.due_date or None))
        tid = cursor.lastrowid
        cursor.execute("SELECT * FROM tasks WHERE id=%s", (tid,))
        task = cursor.fetchone()
        for k, v in task.items():
            if hasattr(v, 'isoformat'): task[k] = str(v)
        return {"message": "Task created!", "task": task}
    finally: cursor.close(); conn.close()

@app.patch("/api/tasks/{tid}")
def update_task(tid: int, body: TaskUpdate, payload=Depends(security)):
    try:
        data = decode_token(payload.credentials)
    except:
        raise HTTPException(401, "Invalid token.")
    conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM tasks WHERE id=%s AND user_id=%s", (tid, data["user_id"]))
        if not cursor.fetchone(): raise HTTPException(404, "Task not found.")
        fields = {k: v for k, v in body.dict().items() if v is not None}
        if not fields: raise HTTPException(400, "Nothing to update.")
        sets = ", ".join(f"{k}=%s" for k in fields)
        cursor.execute(f"UPDATE tasks SET {sets} WHERE id=%s AND user_id=%s",
                       (*fields.values(), tid, data["user_id"]))
        cursor.execute("SELECT * FROM tasks WHERE id=%s", (tid,))
        task = cursor.fetchone()
        for k, v in task.items():
            if hasattr(v, 'isoformat'): task[k] = str(v)
        return {"message": "Task updated!", "task": task}
    finally: cursor.close(); conn.close()

@app.delete("/api/tasks/{tid}")
def delete_task(tid: int, payload=Depends(security)):
    try:
        data = decode_token(payload.credentials)
    except:
        raise HTTPException(401, "Invalid token.")
    conn = get_db_connection(); cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM tasks WHERE id=%s AND user_id=%s", (tid, data["user_id"]))
        if cursor.rowcount == 0: raise HTTPException(404, "Task not found.")
        return {"message": "Task deleted."}
    finally: cursor.close(); conn.close()

# ─── Analytics Route ──────────────────────────────────────────────────────────

@app.get("/api/analytics")
def analytics(payload=Depends(security)):
    try:
        data = decode_token(payload.credentials)
    except:
        raise HTTPException(401, "Invalid token.")
    conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
    uid = data["user_id"]
    try:
        # Task status counts
        cursor.execute("SELECT status, COUNT(*) as count FROM tasks WHERE user_id=%s GROUP BY status", (uid,))
        status_counts = {r["status"]: r["count"] for r in cursor.fetchall()}

        # Priority counts
        cursor.execute("SELECT priority, COUNT(*) as count FROM tasks WHERE user_id=%s GROUP BY priority", (uid,))
        priority_counts = {r["priority"]: r["count"] for r in cursor.fetchall()}

        # Label counts
        cursor.execute("SELECT label, COUNT(*) as count FROM tasks WHERE user_id=%s AND label IS NOT NULL GROUP BY label", (uid,))
        label_counts = {r["label"]: r["count"] for r in cursor.fetchall()}

        # Tasks created last 14 days
        cursor.execute("""
            SELECT DATE(created_at) as day, COUNT(*) as count
            FROM tasks WHERE user_id=%s
            AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
            GROUP BY DATE(created_at) ORDER BY day ASC
        """, (uid,))
        tasks_over_time = [{"day": str(r["day"]), "count": r["count"]} for r in cursor.fetchall()]

        # Total tasks
        cursor.execute("SELECT COUNT(*) as total FROM tasks WHERE user_id=%s", (uid,))
        total = cursor.fetchone()["total"]

        # Done tasks
        done = status_counts.get("done", 0)
        completion_rate = round((done / total * 100) if total > 0 else 0)

        # Tasks done this week
        cursor.execute("""
            SELECT COUNT(*) as count FROM tasks
            WHERE user_id=%s AND status='done'
            AND updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        """, (uid,))
        done_this_week = cursor.fetchone()["count"]

        # Login history last 7
        cursor.execute("""
            SELECT logged_in FROM login_history
            WHERE user_id=%s ORDER BY logged_in DESC LIMIT 7
        """, (uid,))
        login_history = [str(r["logged_in"]) for r in cursor.fetchall()]

        # Productivity score
        score = min(100, completion_rate + (done_this_week * 5))

        return {
            "status_counts": status_counts,
            "priority_counts": priority_counts,
            "label_counts": label_counts,
            "tasks_over_time": tasks_over_time,
            "total_tasks": total,
            "completion_rate": completion_rate,
            "done_this_week": done_this_week,
            "login_history": login_history,
            "productivity_score": score,
        }
    finally: cursor.close(); conn.close()

    # ─── Profile & Password Routes ────────────────────────────────────────────────

@app.patch("/api/profile")
def update_profile(body: dict, payload=Depends(security)):
    try: data = decode_token(payload.credentials)
    except: raise HTTPException(401, "Invalid token.")
    conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("UPDATE users SET full_name=%s, avatar_seed=%s WHERE id=%s",
            (body.get("full_name"), body.get("avatar_seed"), data["user_id"]))
        cursor.execute("SELECT id,full_name,email,avatar_seed,created_at FROM users WHERE id=%s", (data["user_id"],))
        user = cursor.fetchone()
        for k,v in user.items():
            if hasattr(v,'isoformat'): user[k] = str(v)
        return {"message": "Profile updated!", "user": user}
    finally: cursor.close(); conn.close()

@app.patch("/api/password")
def change_password(body: dict, payload=Depends(security)):
    try: data = decode_token(payload.credentials)
    except: raise HTTPException(401, "Invalid token.")
    conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT password FROM users WHERE id=%s", (data["user_id"],))
        user = cursor.fetchone()
        if not verify_password(body.get("old_password",""), user["password"]):
            raise HTTPException(400, "Current password is incorrect.")
        cursor.execute("UPDATE users SET password=%s WHERE id=%s",
            (hash_password(body.get("new_password","")), data["user_id"]))
        return {"message": "Password updated!"}
    finally: cursor.close(); conn.close()

@app.delete("/api/account")
def delete_account(payload=Depends(security)):
    try: data = decode_token(payload.credentials)
    except: raise HTTPException(401, "Invalid token.")
    conn = get_db_connection(); cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM users WHERE id=%s", (data["user_id"],))
        return {"message": "Account deleted."}
    finally: cursor.close(); conn.close()

# ─── Notes Routes ─────────────────────────────────────────────────────────────

@app.on_event("startup")
def create_notes_table():
    conn = get_db_connection(); cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notes (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            user_id    INT          NOT NULL,
            title      VARCHAR(255) DEFAULT '',
            content    TEXT         DEFAULT NULL,
            color      VARCHAR(20)  DEFAULT 'gold',
            pinned     TINYINT(1)   DEFAULT 0,
            created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)
    cursor.close(); conn.close()

@app.get("/api/notes")
def list_notes(payload=Depends(security)):
    try: data = decode_token(payload.credentials)
    except: raise HTTPException(401, "Invalid token.")
    conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM notes WHERE user_id=%s ORDER BY pinned DESC, updated_at DESC", (data["user_id"],))
        notes = cursor.fetchall()
        for n in notes:
            for k,v in n.items():
                if hasattr(v,'isoformat'): n[k] = str(v)
        return {"notes": notes}
    finally: cursor.close(); conn.close()

@app.post("/api/notes", status_code=201)
def create_note(body: dict, payload=Depends(security)):
    try: data = decode_token(payload.credentials)
    except: raise HTTPException(401, "Invalid token.")
    conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("INSERT INTO notes (user_id,title,content,color,pinned) VALUES (%s,%s,%s,%s,%s)",
            (data["user_id"], body.get("title",""), body.get("content"), body.get("color","gold"), body.get("pinned",0)))
        nid = cursor.lastrowid
        cursor.execute("SELECT * FROM notes WHERE id=%s", (nid,))
        note = cursor.fetchone()
        for k,v in note.items():
            if hasattr(v,'isoformat'): note[k] = str(v)
        return {"message": "Note created!", "note": note}
    finally: cursor.close(); conn.close()

@app.patch("/api/notes/{nid}")
def update_note(nid: int, body: dict, payload=Depends(security)):
    try: data = decode_token(payload.credentials)
    except: raise HTTPException(401, "Invalid token.")
    conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
    try:
        fields = {k:v for k,v in body.items() if k in ["title","content","color","pinned"]}
        if fields:
            sets = ", ".join(f"{k}=%s" for k in fields)
            cursor.execute(f"UPDATE notes SET {sets} WHERE id=%s AND user_id=%s", (*fields.values(), nid, data["user_id"]))
        cursor.execute("SELECT * FROM notes WHERE id=%s", (nid,))
        note = cursor.fetchone()
        for k,v in note.items():
            if hasattr(v,'isoformat'): note[k] = str(v)
        return {"message": "Note updated!", "note": note}
    finally: cursor.close(); conn.close()

@app.delete("/api/notes/{nid}")
def delete_note(nid: int, payload=Depends(security)):
    try: data = decode_token(payload.credentials)
    except: raise HTTPException(401, "Invalid token.")
    conn = get_db_connection(); cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM notes WHERE id=%s AND user_id=%s", (nid, data["user_id"]))
        return {"message": "Note deleted."}
    finally: cursor.close(); conn.close()

# ─── Search Route ─────────────────────────────────────────────────────────────

@app.get("/api/search")
def search(q: str = "", payload=Depends(security)):
    try: data = decode_token(payload.credentials)
    except: raise HTTPException(401, "Invalid token.")
    if not q.strip(): return {"results": []}
    conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
    uid = data["user_id"]; like = f"%{q}%"; results = []
    try:
        cursor.execute("SELECT id, title, status, priority FROM tasks WHERE user_id=%s AND title LIKE %s LIMIT 5", (uid, like))
        for r in cursor.fetchall():
            results.append({"type":"task","id":r["id"],"title":r["title"],"sub":f"{r['status']} · {r['priority']} priority","color":"#818cf8"})
        cursor.execute("SELECT id, title, content FROM notes WHERE user_id=%s AND (title LIKE %s OR content LIKE %s) LIMIT 5", (uid, like, like))
        for r in cursor.fetchall():
            results.append({"type":"note","id":r["id"],"title":r["title"] or "Untitled","sub":(r["content"] or "")[:60],"color":"#f4c542"})
        cursor.execute("SELECT id, name FROM projects WHERE user_id=%s AND name LIKE %s LIMIT 3", (uid, like))
        for r in cursor.fetchall():
            results.append({"type":"project","id":r["id"],"title":r["name"],"sub":"Project","color":"#34d399"})
        return {"results": results}
    finally: cursor.close(); conn.close()

# ─── Notifications Route ──────────────────────────────────────────────────────

@app.get("/api/notifications")
def get_notifications(payload=Depends(security)):
    try: data = decode_token(payload.credentials)
    except: raise HTTPException(401, "Invalid token.")
    conn = get_db_connection(); cursor = conn.cursor(dictionary=True)
    uid = data["user_id"]; notifs = []
    try:
        # Welcome notification
        cursor.execute("SELECT created_at FROM users WHERE id=%s", (uid,))
        user = cursor.fetchone()
        notifs.append({"id":"welcome","type":"welcome","title":"Welcome to Lumina!","message":"Your account is set up and ready to go.","time":str(user["created_at"])[:10],"read":False})

        # Overdue tasks
        cursor.execute("SELECT id, title, due_date FROM tasks WHERE user_id=%s AND status != 'done' AND due_date < CURDATE() LIMIT 5", (uid,))
        for t in cursor.fetchall():
            notifs.append({"id":f"overdue_{t['id']}","type":"overdue","title":"Task Overdue","message":f'"{t["title"]}" was due on {str(t["due_date"])[:10]}',"time":str(t["due_date"])[:10],"read":False})

        # Tasks due today
        cursor.execute("SELECT id, title FROM tasks WHERE user_id=%s AND status != 'done' AND due_date = CURDATE() LIMIT 3", (uid,))
        for t in cursor.fetchall():
            notifs.append({"id":f"today_{t['id']}","type":"reminder","title":"Due Today","message":f'"{t["title"]}" is due today!', "time":"Today","read":False})

        return {"notifications": notifs}
    finally: cursor.close(); conn.close()

@app.post("/api/notifications/read")
def mark_read(payload=Depends(security)):
    return {"message": "Marked as read."}