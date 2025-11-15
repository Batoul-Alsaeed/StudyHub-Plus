import axios from "axios";

// Change this URL if your backend runs on another port
const API_BASE = "https://studyhub-backend-81w7.onrender.com/focus";

// -------- Create new focus session --------
export async function createSession(title: string, duration_min: number) {
  const res = await axios.post(`${API_BASE}/sessions`, { title, duration_min });
  return res.data;
}

// -------- Start session --------
export async function startSession(id: number) {
  const res = await axios.post(`${API_BASE}/sessions/${id}/start`);
  return res.data;
}

// -------- Pause session --------
export async function pauseSession(id: number, elapsed_sec: number) {
  const res = await axios.post(`${API_BASE}/sessions/${id}/pause`, { elapsed_sec });
  return res.data;
}

// -------- Resume session --------
export async function resumeSession(id: number) {
  const res = await axios.post(`${API_BASE}/sessions/${id}/resume`);
  return res.data;
}

// -------- Complete session --------
export async function completeSession(id: number, elapsed_sec: number) {
  const res = await axios.post(`${API_BASE}/sessions/${id}/complete`, { elapsed_sec });
  return res.data;
}

// -------- Get today's summary for dashboard --------
export async function getSummary() {
  const res = await axios.get(`${API_BASE}/summary`);
  return res.data;
}
