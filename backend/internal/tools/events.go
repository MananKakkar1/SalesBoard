package tools

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"
)

type Event struct {
	Type string      `json:"type"` // e.g. "order.created", "product.low_stock"
	Data interface{} `json:"data"`
	Time time.Time   `json:"time"`
}

type sseClient chan []byte

type sseHub struct {
	mu      sync.Mutex
	clients map[sseClient]struct{}
}

var SSE = &sseHub{clients: make(map[sseClient]struct{})}

func (h *sseHub) Subscribe() sseClient {
	h.mu.Lock()
	defer h.mu.Unlock()
	ch := make(sseClient, 16) // small buffer
	h.clients[ch] = struct{}{}
	return ch
}

func (h *sseHub) Unsubscribe(ch sseClient) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.clients, ch)
	close(ch)
}

func (h *sseHub) Broadcast(ev Event) {
	b, _ := json.Marshal(ev)
	h.mu.Lock()
	for ch := range h.clients {
		select {
		case ch <- b:
		default:
			// slow consumer: drop one to avoid blocking
		}
	}
	h.mu.Unlock()
}

// HTTP handler: /api/events (SSE)
func SSEHandler(w http.ResponseWriter, r *http.Request) {
	// Required SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no") // nginx

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	ch := SSE.Subscribe()
	defer SSE.Unsubscribe(ch)

	// Optional: heartbeat to keep proxies alive
	heartbeat := time.NewTicker(25 * time.Second)
	defer heartbeat.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case b := <-ch:
			// SSE format: event + data + blank line
			w.Write([]byte("event: message\n"))
			w.Write([]byte("data: "))
			w.Write(b)
			w.Write([]byte("\n\n"))
			flusher.Flush()
		case <-heartbeat.C:
			w.Write([]byte(": ping\n\n")) // comment/keepalive
			flusher.Flush()
		}
	}
}