package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"brain/server/internal/ai"
	"brain/server/internal/sessions"
)

// sessionsListHandler handles GET /v1/sessions
func sessionsListHandler(w http.ResponseWriter, r *http.Request) {
	list, err := sessions.List()
	if err != nil {
		http.Error(w, "failed to list sessions: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if list == nil {
		list = []sessions.Session{}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

// sessionsCreateRequest is the body for POST /v1/sessions
type sessionsCreateRequest struct {
	Name    string `json:"name"`
	ModelID string `json:"modelId"`
}

// sessionsCreateHandler handles POST /v1/sessions
func sessionsCreateHandler(w http.ResponseWriter, r *http.Request) {
	var req sessionsCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		req = sessionsCreateRequest{}
	}
	sess := sessions.Create(req.Name, req.ModelID)
	if err := sessions.Save(sess); err != nil {
		http.Error(w, "failed to save session: "+err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(sess)
}

// sessionsGetHandler handles GET /v1/sessions/:id
func sessionsGetHandler(w http.ResponseWriter, r *http.Request, id string) {
	sess, err := sessions.Load(id)
	if err != nil {
		http.Error(w, "session not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sess)
}

// sessionsDeleteHandler handles DELETE /v1/sessions/:id
func sessionsDeleteHandler(w http.ResponseWriter, r *http.Request, id string) {
	if err := sessions.Delete(id); err != nil {
		http.Error(w, "failed to delete session: "+err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// sessionsRenameRequest is the body for PUT /v1/sessions/:id
type sessionsRenameRequest struct {
	Name   string `json:"name"`
	Pinned *bool  `json:"pinned"`
}

// sessionsUpdateHandler handles PUT /v1/sessions/:id
func sessionsUpdateHandler(w http.ResponseWriter, r *http.Request, id string) {
	sess, err := sessions.Load(id)
	if err != nil {
		http.Error(w, "session not found", http.StatusNotFound)
		return
	}

	var req sessionsRenameRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	if req.Name != "" {
		sess = sessions.Rename(sess, req.Name)
	}
	if req.Pinned != nil {
		if *req.Pinned != sess.Pinned {
			sess = sessions.TogglePin(sess)
		}
	}

	if err := sessions.Save(sess); err != nil {
		http.Error(w, "failed to save: "+err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sess)
}

// sessionsTitleHandler handles POST /v1/sessions/:id/title
func sessionsTitleHandler(w http.ResponseWriter, r *http.Request, id string) {
	sess, err := sessions.Load(id)
	if err != nil {
		http.Error(w, "session not found", http.StatusNotFound)
		return
	}

	// Find the first user message
	var firstMsg string
	for _, m := range sess.Messages {
		if m.Role == "user" {
			firstMsg = m.Content
			break
		}
	}

	if firstMsg == "" {
		http.Error(w, "no user messages in session", http.StatusBadRequest)
		return
	}

	// Generate a title using the session's model (or default)
	modelID := sess.ModelID
	if modelID == "" {
		modelID = "MiniMax-M2.5"
	}
	client := ai.NewWithModel(modelID)
	title := client.GenerateTitle(firstMsg)

	// Save the new name
	sess = sessions.Rename(sess, title)
	if err := sessions.Save(sess); err != nil {
		http.Error(w, "failed to save: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"title": title})
}

// sessionsAddMessageRequest is the body for POST /v1/sessions/:id/messages
type sessionsAddMessageRequest struct {
	Role     string `json:"role"`
	Content  string `json:"content"`
	Thinking string `json:"thinking,omitempty"`
}

// sessionsAddMessageHandler handles POST /v1/sessions/:id/messages
func sessionsAddMessageHandler(w http.ResponseWriter, r *http.Request, id string) {
	sess, err := sessions.Load(id)
	if err != nil {
		http.Error(w, "session not found", http.StatusNotFound)
		return
	}

	var req sessionsAddMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	msg := sessions.SessionMessage{
		Role:     req.Role,
		Content:  req.Content,
		Thinking: req.Thinking,
	}
	sess = sessions.AddMessage(sess, msg)

	if err := sessions.Save(sess); err != nil {
		http.Error(w, "failed to save: "+err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sess)
}

type generateTitleRequest struct {
	FirstMessage     string `json:"firstMessage"`
	UserMessage      string `json:"userMessage"`
	AssistantMessage string `json:"assistantMessage"`
	ModelID          string `json:"modelId"`
}

// sessionsGenerateTitleHandler handles POST /v1/sessions/generate-title and POST /v1/title
func sessionsGenerateTitleHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req generateTitleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	msg := req.FirstMessage
	if msg == "" {
		msg = req.UserMessage
	}
	if msg == "" {
		http.Error(w, "firstMessage or userMessage required", http.StatusBadRequest)
		return
	}

	modelID := req.ModelID
	if modelID == "" {
		modelID = "MiniMax-M2.5"
	}

	client := ai.NewWithModel(modelID)
	title := client.GenerateTitle(msg)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"title": title})
}

// sessionsRouteHandler is the catch-all handler for /v1/sessions/* paths.
func sessionsRouteHandler(w http.ResponseWriter, r *http.Request) {
	// Strip /v1/sessions/ prefix
	path := strings.TrimPrefix(r.URL.Path, "/v1/sessions")
	path = strings.TrimPrefix(path, "/")
	parts := strings.Split(path, "/")

	if len(parts) == 0 || parts[0] == "" {
		// /v1/sessions
		switch r.Method {
		case http.MethodGet:
			sessionsListHandler(w, r)
		case http.MethodPost:
			sessionsCreateHandler(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	id := parts[0]
	if id == "generate-title" {
		sessionsGenerateTitleHandler(w, r)
		return
	}

	if len(parts) == 1 {
		// /v1/sessions/:id
		switch r.Method {
		case http.MethodGet:
			sessionsGetHandler(w, r, id)
		case http.MethodPut:
			sessionsUpdateHandler(w, r, id)
		case http.MethodDelete:
			sessionsDeleteHandler(w, r, id)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	sub := parts[1]
	switch sub {
	case "title":
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		sessionsTitleHandler(w, r, id)
	case "messages":
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		sessionsAddMessageHandler(w, r, id)
	default:
		http.Error(w, "not found", http.StatusNotFound)
	}
}
