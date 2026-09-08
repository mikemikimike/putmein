package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"brain/server/internal/ai"
	"brain/server/internal/deploy"
)

// deployHandler handles POST /v1/deploy — runs containerized build & deployment and streams SSE.
func deployHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req deploy.DeployRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	if req.Name == "" || req.ProjectPath == "" {
		http.Error(w, "name and projectPath are required", http.StatusBadRequest)
		return
	}

	ai.SetSSEHeaders(w)
	w.WriteHeader(http.StatusOK)
	ai.FlushSSE(w)

	// Emit SSE helper
	emit := func(ev deploy.DeployStepEvent) {
		data, err := json.Marshal(ev)
		if err == nil {
			fmt.Fprintf(w, "data: %s\n\n", data)
			ai.FlushSSE(w)
		}
	}

	_, err := deploy.ExecuteDeployment(r.Context(), req, emit)
	if err != nil {
		emit(deploy.DeployStepEvent{
			Step:    deploy.StepFailed,
			Status:  "error",
			Message: fmt.Sprintf("Deployment failed: %v", err),
		})
	}
}

// deployLogsHandler handles GET /v1/deploy/logs?container=...&lines=...
func deployLogsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	container := r.URL.Query().Get("container")
	if container == "" {
		http.Error(w, "container parameter required", http.StatusBadRequest)
		return
	}

	lines := 200
	if lStr := r.URL.Query().Get("lines"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil && l > 0 {
			lines = l
		}
	}

	logs, err := deploy.GetContainerLogs(container, lines)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to get container logs: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"container": container,
		"logs":      logs,
	})
}

// deployActionHandler handles POST /v1/deploy/action (restart / stop)
func deployActionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Action    string `json:"action"` // "restart" | "stop"
		Container string `json:"container"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	var err error
	switch req.Action {
	case "restart":
		err = deploy.RestartContainer(req.Container)
	case "stop":
		err = deploy.StopContainer(req.Container)
	default:
		http.Error(w, "invalid action (restart or stop)", http.StatusBadRequest)
		return
	}

	if err != nil {
		http.Error(w, fmt.Sprintf("action failed: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
