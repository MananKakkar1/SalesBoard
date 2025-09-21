// Simple SSE client
let es;

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export function connectSSE({ onEvent } = {}) {
  // Reuse existing connection if present
  if (es) return es;

  // IMPORTANT: assign to the module-level `es` (no `const` here)
  es = new EventSource(`${API_BASE}/api/events`, { withCredentials: true });

  es.addEventListener("message", (e) => {
    try {
      const payload = JSON.parse(e.data); // { type, data, time }
      if (onEvent) onEvent(payload);
    } catch {
      // ignore malformed events
    }
  });

  es.addEventListener("error", () => {
    // EventSource auto-reconnects; you can log or show UI state here if you want
    // console.warn("SSE error; browser will attempt to reconnect");
  });

  return es;
}

export function disconnectSSE() {
  if (es) {
    es.close();
    es = undefined;
  }
}
