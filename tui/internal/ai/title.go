package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// GenerateTitle asks the AI to create a short session title based on the first user message.
func (c *Client) GenerateTitle(firstMessage string) string {
	prompt := fmt.Sprintf("You just have to name this thing with the conversation that he just made, just a simple single title. Message: %q", firstMessage)

	body := map[string]any{
		"model":      "MiniMax-M2.5",
		"max_tokens": 1000,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
	}

	data, err := json.Marshal(body)
	if err != nil {
		return "Err (JSON): " + err.Error()
	}

	req, err := http.NewRequest("POST", c.baseURL+"/v1/messages", bytes.NewReader(data))
	if err != nil {
		return "Err (Req): " + err.Error()
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "Err (Net): " + err.Error()
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return "Err (Read): " + err.Error()
	}

	var ar anthropicResponse
	if err := json.Unmarshal(raw, &ar); err != nil {
		return "Err (Parse): " + err.Error()
	}
	if ar.Error != nil {
		return "Err (API): " + ar.Error.Message
	}

	var title string
	for _, block := range ar.Content {
		if block.Type == "text" {
			title += block.Text
		}
	}

	title = strings.TrimSpace(title)
	title = strings.Trim(title, `"'`)

	if title == "" {
		return "Err: Empty Response"
	}
	return title
}
