const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiRequest(
  path: string,
  options: RequestInit = {},
  token?: string
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || "Something went wrong");
  }
  return data;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export function setToken(token: string) {
  localStorage.setItem("auth_token", token);
}

export function removeToken() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
}

export function getUser() {
  if (typeof window === "undefined") return null;
  try {
    const u = localStorage.getItem("auth_user");
    return u ? JSON.parse(u) : null;
  } catch { return null; }
}

export function setUser(user: object) {
  localStorage.setItem("auth_user", JSON.stringify(user));
}
