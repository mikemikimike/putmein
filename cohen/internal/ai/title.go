package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// GenerateTitle asks brain to generate a short session title.
// Falls back to a direct Anthropic call if brain is unavailable.
func (c *Client) GenerateTitle(firstMessage string) string {
	// Try brain first
	if title := c.generateTitleViaBrain(firstMessage); title != "" {
		return title
	}
	// Fallback: direct Anthropic call
	return c.generateTitleDirect(firstMessage)
}

func (c *Client) generateTitleViaBrain(firstMessage string) string {
	payload := map[string]any{
		"messages": []map[string]string{
			{"role": "user", "content": firstMessage},
		},
		"modelId": c.Model.ID,
		"mode":    "tui",
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return ""
	}

	req, err := http.NewRequest("POST", brainURL()+"/v1/chat/tui", bytes.NewReader(data))
	if err != nil {
		return ""
	}
	req.Header.Set("Content-Type", "application/json")

	// Override the user message with the title prompt using a separate endpoint
	// We actually POST to brain's title generation via a session — but since
	// we don't have a session ID at this point (it's a fire-and-forget title),
	// we do a lightweight direct prompt instead.

	// Use a small direct HTTP call to the models API to check brain liveness
	pingReq, err := http.NewRequest("GET", brainURL()+"/health", nil)
	if err != nil {
		return ""
	}
	client := &http.Client{}
	pong, err := client.Do(pingReq)
	if err != nil || pong.StatusCode != http.StatusOK {
		return ""
	}
	pong.Body.Close()

	// Brain is up — use it for the title prompt (reuse the chat/tui endpoint)
	prompt := fmt.Sprintf("You just have to name this conversation with a simple single short title (max 5 words). Message: %q", firstMessage)
	titlePayload := map[string]any{
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
		"modelId": c.Model.ID,
		"mode":    "tui",
	}
	titleData, err := json.Marshal(titlePayload)
	if err != nil {
		return ""
	}

	titleReq, err := http.NewRequest("POST", brainURL()+"/v1/chat/tui", bytes.NewReader(titleData))
	if err != nil {
		return ""
	}
	titleReq.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(titleReq)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return ""
	}

	// Extract text from AI SDK stream lines
	var title strings.Builder
	for _, line := range strings.Split(string(raw), "\n") {
		if len(line) > 2 && line[0] == '0' && line[1] == ':' {
			var token string
			if err := json.Unmarshal([]byte(line[2:]), &token); err == nil {
				title.WriteString(token)
			}
		}
	}

	t := strings.TrimSpace(strings.Trim(title.String(), `"'`))
	return t
}

func (c *Client) generateTitleDirect(firstMessage string) string {
	prompt := fmt.Sprintf("You just have to name this conversation with a simple single short title (max 5 words). Message: %q", firstMessage)

	body := map[string]any{
		"model":      c.Model.ID,
		"max_tokens": 64,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
	}

	data, err := json.Marshal(body)
	if err != nil {
		return "Untitled Session"
	}

	req, err := http.NewRequest("POST", c.Model.BaseURL+"/v1/messages", bytes.NewReader(data))
	if err != nil {
		return "Untitled Session"
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.Model.APIKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "Untitled Session"
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return "Untitled Session"
	}

	type block struct {
		Type string `json:"type"`
		Text string `json:"text"`
	}
	var ar struct {
		Content []block `json:"content"`
		Error   *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(raw, &ar); err != nil || ar.Error != nil {
		return "Untitled Session"
	}

	var title string
	for _, b := range ar.Content {
		if b.Type == "text" {
			title += b.Text
		}
	}
	title = strings.TrimSpace(strings.Trim(title, `"'`))
	if title == "" {
		return "Untitled Session"
	}
	return title
}
