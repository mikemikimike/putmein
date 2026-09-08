package ai

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
)

// ModelConfig holds all configuration for a single AI model.
type ModelConfig struct {
	ID         string
	Name       string
	BaseURL    string
	APIKey     string
	SystemName string
}

// GetModels returns the available models.
// It tries to fetch them from brain first (so brain is the single source of truth).
// Falls back to the hardcoded list if brain is not available.
func GetModels() []ModelConfig {
	if models := fetchModelsFromBrain(); len(models) > 0 {
		return models
	}
	return hardcodedModels()
}

// fetchModelsFromBrain calls GET brain:3100/v1/models and maps the response.
func fetchModelsFromBrain() []ModelConfig {
	url := brainURL() + "/v1/models"
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil
	}
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil
	}
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil
	}

	var items []struct {
		ID         string `json:"id"`
		Name       string `json:"name"`
		SystemName string `json:"systemName"`
	}
	if err := json.Unmarshal(raw, &items); err != nil {
		return nil
	}

	// Enrich with local API keys (brain strips them for security)
	local := hardcodedModels()
	keyMap := make(map[string]ModelConfig, len(local))
	for _, m := range local {
		keyMap[m.ID] = m
	}

	out := make([]ModelConfig, 0, len(items))
	for _, item := range items {
		mc := ModelConfig{
			ID:         item.ID,
			Name:       item.Name,
			SystemName: item.SystemName,
		}
		if lm, ok := keyMap[item.ID]; ok {
			mc.BaseURL = lm.BaseURL
			mc.APIKey = lm.APIKey
		}
		out = append(out, mc)
	}
	return out
}

// hardcodedModels is the fallback model list when brain is unavailable.
func hardcodedModels() []ModelConfig {
	minimaxBaseURL := os.Getenv("MINIMAX_BASE_URL")
	if minimaxBaseURL == "" {
		minimaxBaseURL = "https://api.minimax.io/anthropic"
	}
	claudeBaseURL := os.Getenv("CLAUDE_BASE_URL")
	if claudeBaseURL == "" {
		claudeBaseURL = "https://api.anthropic.com"
	}
	return []ModelConfig{
		{
			ID:         "MiniMax-M2.5",
			Name:       "Ozias",
			SystemName: "Ozias",
			BaseURL:    minimaxBaseURL,
			APIKey:     os.Getenv("MINIMAX_API_KEY"),
		},
		{
			ID:         "claude-3-5-sonnet-20240620",
			Name:       "Claude",
			SystemName: "Claude",
			BaseURL:    claudeBaseURL,
			APIKey:     os.Getenv("CLAUDE_API_KEY"),
		},
	}
}
