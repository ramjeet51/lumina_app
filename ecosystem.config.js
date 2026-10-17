module.exports = {
  apps: [
    {
      name: "lumina-backend",
      cwd: "/home/ramjeet/lumina-full-project/backend",
      script: "/home/ramjeet/lumina-full-project/backend/venv/bin/uvicorn",
      args: "main:app --host 0.0.0.0 --port 8000",
      interpreter: "none",
      env: {
        PATH: "/home/ramjeet/lumina-full-project/backend/venv/bin:/usr/bin:/bin"
      },
      watch: false,
      autorestart: true,
    },
    {
      name: "lumina-frontend",
      cwd: "/home/ramjeet/lumina-full-project/frontend",
      script: "npm",
      args: "run start",
      watch: false,
      autorestart: true,
  env: {
    NODE_ENV: "production",
    PORT: 3000,
    NEXT_PUBLIC_API_URL: "",
    BACKEND_INTERNAL_URL: "http://127.0.0.1:8000"
  }
}
  ]
}
