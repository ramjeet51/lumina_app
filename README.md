# 🌟 Lumina — Auth App

A full-stack Login / Register application with:

- **Backend**: Python FastAPI + bcrypt + JWT
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Database**: MySQL 8 (tables auto-created at startup)
- **Design**: Animated starfield background, glassmorphism, gold accents

---

## 📁 Project Structure

```
app/
├── backend/
│   ├── main.py            # FastAPI app — all routes
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── pages/
│   │   ├── index.tsx      # Login / Register page
│   │   └── dashboard.tsx  # Protected dashboard
│   ├── components/
│   │   └── AnimatedBackground.tsx
│   ├── lib/
│   │   └── api.ts         # API helper + token utils
│   ├── styles/
│   │   └── globals.css    # Animations + design system
│   ├── Dockerfile
│   └── .env.local.example
└── docker-compose.yml
```

---

## 🗄️ Database Tables (auto-created)

### `users`
| Column       | Type         | Notes                    |
|-------------|--------------|--------------------------|
| id          | INT PK AUTO  |                          |
| full_name   | VARCHAR(100) |                          |
| email       | VARCHAR(255) | UNIQUE                   |
| password    | VARCHAR(255) | bcrypt hashed            |
| avatar_seed | VARCHAR(50)  | Used for DiceBear avatar |
| created_at  | DATETIME     |                          |
| last_login  | DATETIME     |                          |

### `login_history`
| Column     | Type        | Notes              |
|------------|-------------|--------------------|
| id         | INT PK AUTO |                    |
| user_id    | INT FK      | → users.id CASCADE |
| logged_in  | DATETIME    |                    |
| ip_address | VARCHAR(45) |                    |

---

## 🚀 Quick Start — Docker (Recommended)

```bash
# 1. Clone / enter project
cd app

# 2. Start everything
docker-compose up --build

# 3. Open browser
#    Frontend:  http://localhost:3000
#    Backend:   http://localhost:8000
#    API Docs:  http://localhost:8000/docs
```

---

## 🛠️ Manual Setup

### Backend

```bash
cd backend

# Create virtual env
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your MySQL credentials

# Run
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Run
npm run dev
# Open http://localhost:3000
```

### MySQL

Make sure MySQL is running and create the database:

```sql
CREATE DATABASE authapp;
```

The tables (`users`, `login_history`) are **auto-created** when the backend starts.

---

## 🔌 API Endpoints

| Method | Path           | Auth     | Description          |
|--------|----------------|----------|----------------------|
| GET    | /health        | No       | Health check         |
| POST   | /api/register  | No       | Create account       |
| POST   | /api/login     | No       | Login, get JWT       |
| GET    | /api/me        | Bearer   | Get current user     |

### Register Body
```json
{ "full_name": "Jane Doe", "email": "jane@example.com", "password": "secret123" }
```

### Login Body
```json
{ "email": "jane@example.com", "password": "secret123" }
```

### Response (both)
```json
{
  "message": "Login successful!",
  "token": "<JWT>",
  "user": { "id": 1, "full_name": "Jane Doe", "email": "...", "avatar_seed": "jane" }
}
```

---

## 🎨 Design Highlights

- **Animated background**: Floating color orbs, twinkling star field, subtle grid overlay
- **Glassmorphism cards**: Frosted-glass effect with gold border glow on hover
- **DiceBear avatars**: Unique avatar auto-generated per user via `https://api.dicebear.com`
- **Unsplash imagery**: High-quality space/galaxy backgrounds via CDN
- **Gold accent system**: Consistent `#f4c542` gold used across buttons, inputs, stats
- **Smooth transitions**: Slide-up/down animations on form switches and page load

---

## 🔐 Security Notes

- Passwords hashed with **bcrypt** (cost factor 12)
- JWT tokens expire after **24 hours**
- Change `JWT_SECRET` in `.env` before deploying to production
- Add HTTPS / rate-limiting for production use

---

## 📦 Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Backend   | FastAPI 0.111, Uvicorn, PyJWT       |
| Auth      | bcrypt, JWT (HS256)                 |
| Database  | MySQL 8, mysql-connector-python     |
| Frontend  | Next.js 14, React 18, TypeScript    |
| Styling   | Tailwind CSS 3, Custom CSS          |
| Fonts     | Playfair Display + DM Sans (Google) |
| Avatars   | DiceBear API (free CDN)             |
| Images    | Unsplash CDN                        |
# lumina_app
