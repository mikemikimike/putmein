package api

import (
	"encoding/json"
	"net/http"

	"brain/server/internal/ai"
)

// modelsHandler handles GET /v1/models
func modelsHandler(w http.ResponseWriter, r *http.Request) {
	models := ai.GetModels()
	// Strip API keys before sending to clients
	type safeModel struct {
		ID            string `json:"id"`
		Name          string `json:"name"`
		SystemName    string `json:"systemName"`
		Provider      string `json:"provider"`
		ActualModelID string `json:"actualModelId"`
		ThinkingLevel string `json:"thinkingLevel,omitempty"`
		Badge         string `json:"badge,omitempty"`
		Description   string `json:"description,omitempty"`
	}
	safe := make([]safeModel, len(models))
	for i, m := range models {
		safe[i] = safeModel{
			ID:            m.ID,
			Name:          m.Name,
			SystemName:    m.SystemName,
			Provider:      m.Provider,
			ActualModelID: m.ActualModelID,
			ThinkingLevel: m.ThinkingLevel,
			Badge:         m.Badge,
			Description:   m.Description,
		}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(safe)
}
