package api

import (
	"encoding/json"
	"net/http"

	"brain/server/internal/agent"
	"brain/server/internal/ai"
)

// agentRequest is the body for POST /v1/agent
type agentRequest struct {
	Messages []struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	} `json:"messages"`
	ModelID    string `json:"modelId"`
	Mode       string `json:"mode"` // "tui" or "web"
	Autonomous bool   `json:"autonomous"`
}

// agentHandler handles POST /v1/agent, runs the full DevOps agent loop.
// Streams AgentEvents as SSE JSON lines.
// Permission requests are emitted as "permission" events; clients must
// respond via POST /v1/agent/approve with {"approved": true/false}.
func agentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req agentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	if len(req.Messages) == 0 {
		http.Error(w, "messages required", http.StatusBadRequest)
		return
	}

	modelID := req.ModelID
	if modelID == "" {
		modelID = "MiniMax-M2.5"
	}

	mode := ai.PromptModeWeb
	if req.Mode == "tui" {
		mode = ai.PromptModeTUI
	}

	// If the request says autonomous, honour it for this call
	wasAutonomous := agent.IsAutonomousMode()
	if req.Autonomous {
		agent.SetAutonomousMode(true)
		defer agent.SetAutonomousMode(wasAutonomous)
	}

	// Build history
	history := make([]ai.HistoryEntry, 0, len(req.Messages)-1)
	for _, m := range req.Messages[:len(req.Messages)-1] {
		history = append(history, ai.HistoryEntry{Role: m.Role, Content: m.Content})
	}
	lastMsg := req.Messages[len(req.Messages)-1]

	// Permission grant channel - The client sends approvals on a separate endpoint.
	// For simplicity in this HTTP context, we run in autonomous mode within a session.
	// A production implementation would use WebSockets for back-and-forth approval.
	// For now, we honour the AGENT_AUTONOMOUS env var / settings toggle.
	opts := agent.RunAgentOptions{
		ModelID:   modelID,
		Mode:      mode,
		UserInput: lastMsg.Content,
		History:   history,
		// PermissionGrant: nil means autonomous if IsAutonomousMode(), else deny
	}

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-transform")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	flushSSE(w)

	events := agent.RunAgent(r.Context(), opts)
	for ev := range events {
		data, err := json.Marshal(ev)
		if err != nil {
			continue
		}
		w.Write([]byte("data: "))
		w.Write(data)
		w.Write([]byte("\n\n"))
		flushSSE(w)
	}
}

// autonomousHandler handles POST /v1/agent/autonomous - toggle autonomous mode.
type autonomousBody struct {
	Enabled bool `json:"enabled"`
}

func autonomousHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var body autonomousBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}
	agent.SetAutonomousMode(body.Enabled)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"autonomous": agent.IsAutonomousMode(),
	})
}

// autonomousStatusHandler handles GET /v1/agent/autonomous
func autonomousStatusHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"autonomous": agent.IsAutonomousMode(),
	})
}

// settingsHandler handles GET and POST /v1/settings
type settingsPayload struct {
	Autonomous            *bool             `json:"autonomous,omitempty"`
	DeploymentsPath       *string           `json:"deploymentsPath,omitempty"`
	SecurityChecksEnabled *bool             `json:"securityChecksEnabled,omitempty"`
	RoutingMode           *string           `json:"routingMode,omitempty"`
	DomainProvider        *string           `json:"domainProvider,omitempty"`
	CustomRootDomain      *string           `json:"customRootDomain,omitempty"`
	ExecutionMode         *string           `json:"executionMode,omitempty"`
	ApiKeys               map[string]string `json:"apiKeys,omitempty"`
	RemoveApiKey          string            `json:"removeApiKey,omitempty"`
}

func settingsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"autonomous":             agent.IsAutonomousMode(),
			"deploymentsPath":        agent.GetDeploymentsDir(),
			"defaultDeploymentsPath": agent.DefaultDeploymentsDir(),
			"securityChecksEnabled":  agent.IsSecurityChecksEnabled(),
			"routingMode":           agent.GetRoutingMode(),
			"domainProvider":        agent.GetDomainProvider(),
			"customRootDomain":      agent.GetCustomRootDomain(),
			"executionMode":         agent.GetExecutionMode(),
			"apiKeys": map[string]bool{
				"ozias":      ai.GetProviderKey("ozias") != "",
				"minimax":    ai.GetProviderKey("ozias") != "",
				"claude":     ai.GetProviderKey("claude") != "",
				"openai":     ai.GetProviderKey("openai") != "",
				"deepseek":   ai.GetProviderKey("deepseek") != "",
				"gemini":     ai.GetProviderKey("gemini") != "",
				"openrouter": ai.GetProviderKey("openrouter") != "",
			},
		})
	case http.MethodPost, http.MethodPut:
		var body settingsPayload
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "invalid JSON body", http.StatusBadRequest)
			return
		}
		if body.Autonomous != nil {
			agent.SetAutonomousMode(*body.Autonomous)
		}
		if body.DeploymentsPath != nil {
			agent.SetDeploymentsDir(*body.DeploymentsPath)
		}
		if body.SecurityChecksEnabled != nil {
			agent.SetSecurityChecksEnabled(*body.SecurityChecksEnabled)
		}
		if body.RoutingMode != nil {
			agent.SetRoutingMode(*body.RoutingMode)
		}
		if body.DomainProvider != nil {
			agent.SetDomainProvider(*body.DomainProvider)
		}
		if body.CustomRootDomain != nil {
			agent.SetCustomRootDomain(*body.CustomRootDomain)
		}
		if body.ExecutionMode != nil {
			agent.SetExecutionMode(*body.ExecutionMode)
		}
		if body.RemoveApiKey != "" {
			agent.RemoveAPIKey(body.RemoveApiKey)
		}
		if body.ApiKeys != nil {
			agent.SetAPIKeys(body.ApiKeys)
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"autonomous":             agent.IsAutonomousMode(),
			"deploymentsPath":        agent.GetDeploymentsDir(),
			"defaultDeploymentsPath": agent.DefaultDeploymentsDir(),
			"securityChecksEnabled":  agent.IsSecurityChecksEnabled(),
			"routingMode":           agent.GetRoutingMode(),
			"domainProvider":        agent.GetDomainProvider(),
			"customRootDomain":      agent.GetCustomRootDomain(),
			"executionMode":         agent.GetExecutionMode(),
			"apiKeys": map[string]bool{
				"ozias":      ai.GetProviderKey("ozias") != "",
				"minimax":    ai.GetProviderKey("ozias") != "",
				"claude":     ai.GetProviderKey("claude") != "",
				"openai":     ai.GetProviderKey("openai") != "",
				"deepseek":   ai.GetProviderKey("deepseek") != "",
				"gemini":     ai.GetProviderKey("gemini") != "",
				"openrouter": ai.GetProviderKey("openrouter") != "",
			},
			"saved": true,
		})
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func flushSSE(w http.ResponseWriter) {
	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}
}

// approveHandler handles POST /v1/chat/approve → resolves a pending approval request.
// Body: {"id":"<approval-id>","approved":true}
func approveHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var body struct {
		ID       string `json:"id"`
		Approved bool   `json:"approved"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.ID == "" {
		http.Error(w, "invalid JSON body, need {id, approved}", http.StatusBadRequest)
		return
	}
	found := agent.Approvals.Respond(body.ID, body.Approved)
	w.Header().Set("Content-Type", "application/json")
	if found {
		json.NewEncoder(w).Encode(map[string]any{"ok": true, "approved": body.Approved})
	} else {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]any{"ok": false, "error": "approval request not found or already resolved"})
	}
}
