package ai

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"runtime"
	"strings"
	"time"
)

// ── Response / history types ─────────────────────────────────────────────────

// Response holds AI output.
type Response struct {
	Thinking string
	Text     string
	Err      error
}

// HistoryEntry is a single conversation turn.
type HistoryEntry struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ── Brain proxy URL ──────────────────────────────────────────────────────────

func brainURL() string {
	u := os.Getenv("BRAIN_URL")
	if u == "" {
		u = "http://localhost:3100"
	}
	return u
}

// ── Direct Anthropic fallback (kept for when brain is unavailable) ───────────

type contentBlock struct {
	Type     string `json:"type"`
	Text     string `json:"text"`
	Thinking string `json:"thinking"`
}

type anthropicResponse struct {
	Content []contentBlock `json:"content"`
	Error   *struct {
		Message string `json:"message"`
	} `json:"error"`
}

func osName() string {
	switch runtime.GOOS {
	case "darwin":
		return "macOS"
	case "windows":
		return "Windows"
	default:
		return "Linux"
	}
}

func systemPrompt(name string) string {
	currentOS := osName()
	return fmt.Sprintf(`Your name is %s. You are an advanced system AI managing a %s environment.
Tackle DevOps and DevSecOps issues directly from this server.
IMPORTANT: Use %s compatible syntax for all commands.
If you need to run a command, wrap it in <exec>tags</exec>. Example: <exec>mkdir test-folder</exec>

CRITICAL: Do NOT use Markdown for formatting (no **, no `+"`"+`, no #). Instead, stylize your text using these special XML tags:
<bold>text</bold>, <italic>text</italic>, <cyan>text</cyan>, <green>text</green>, <red>text</red>, <yellow>text</yellow>.
Do NOT nest the tags (e.g., avoid <bold><cyan>text</cyan></bold>).
Do NOT prefix your messages with "%s:" or your name. Just output the response text directly.`, name, currentOS, currentOS, name)
}

// ── Client ────────────────────────────────────────────────────────────────────

// Client sends messages to brain (preferred) or falls back to the direct Anthropic API.
type Client struct {
	httpClient *http.Client
	Model      ModelConfig
}

// New creates an AI client from env vars.
func New() *Client {
	models := GetModels()
	return &Client{
		httpClient: &http.Client{Timeout: 120 * time.Second},
		Model:      models[0],
	}
}

// SetModel switches the active AI model.
func (c *Client) SetModel(id string) {
	for _, m := range GetModels() {
		if m.ID == id {
			c.Model = m
			return
		}
	}
}

// ── Brain-proxied streaming Ask ───────────────────────────────────────────────

// Ask sends a user message and streams partial tokens via the onToken callback.
// It talks to brain's /v1/chat/tui endpoint (SSE stream in TUI mode).
// If brain is unavailable it falls back to the direct Anthropic API.
func (c *Client) Ask(ctx context.Context, userInput string, history []HistoryEntry) Response {
	// Build the request payload
	messages := make([]map[string]string, 0, len(history)+1)
	for _, h := range history {
		messages = append(messages, map[string]string{"role": h.Role, "content": h.Content})
	}
	messages = append(messages, map[string]string{"role": "user", "content": userInput})

	payload := map[string]any{
		"messages": messages,
		"modelId":  c.Model.ID,
		"mode":     "tui",
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return Response{Err: err}
	}

	req, err := http.NewRequestWithContext(ctx, "POST", brainURL()+"/v1/chat/tui", bytes.NewReader(data))
	if err != nil {
		return c.askDirect(ctx, userInput, history)
	}
	req.Header.Set("Content-Type", "application/json")

	streamClient := &http.Client{}
	resp, err := streamClient.Do(req)
	if err != nil {
		// Brain not available — fall back to direct call
		return c.askDirect(ctx, userInput, history)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return c.askDirect(ctx, userInput, history)
	}

	// Read AI SDK stream format from brain:
	// text delta lines:    0:"token"\n
	// thinking lines:      8:{"thinking":"..."}\n
	// finish line:         d:{...}\n
	// error lines:         3:"error message"\n
	var textBuf strings.Builder
	var thinkingBuf strings.Builder

	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := scanner.Text()
		if len(line) < 2 {
			continue
		}
		prefix := line[0]
		rest := line[2:] // skip "N:"

		switch prefix {
		case '0': // text delta
			var token string
			if err := json.Unmarshal([]byte(rest), &token); err == nil {
				textBuf.WriteString(token)
			}
		case '8': // metadata (thinking)
			var meta map[string]string
			if err := json.Unmarshal([]byte(rest), &meta); err == nil {
				if t, ok := meta["thinking"]; ok {
					thinkingBuf.WriteString(t)
				}
			}
		case '3': // error
			var errMsg string
			if err := json.Unmarshal([]byte(rest), &errMsg); err == nil {
				return Response{Err: fmt.Errorf("%s", errMsg)}
			}
		case 'd': // done
			// finish marker — stop reading
			goto done
		}
	}

done:
	if err := scanner.Err(); err != nil && ctx.Err() == nil {
		return Response{Err: err}
	}

	return Response{
		Thinking: thinkingBuf.String(),
		Text:     textBuf.String(),
	}
}

// askDirect is the fallback that calls the Anthropic-compatible API directly.
// Used when brain is not running.
func (c *Client) askDirect(ctx context.Context, userInput string, history []HistoryEntry) Response {
	messages := make([]map[string]string, 0, len(history)+1)
	for _, h := range history {
		messages = append(messages, map[string]string{"role": h.Role, "content": h.Content})
	}
	messages = append(messages, map[string]string{"role": "user", "content": userInput})

	body := map[string]any{
		"model":      c.Model.ID,
		"max_tokens": 2048,
		"system":     systemPrompt(c.Model.SystemName),
		"messages":   messages,
	}

	data, err := json.Marshal(body)
	if err != nil {
		return Response{Err: err}
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.Model.BaseURL+"/v1/messages", bytes.NewReader(data))
	if err != nil {
		return Response{Err: err}
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.Model.APIKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return Response{Err: err}
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return Response{Err: err}
	}

	var ar anthropicResponse
	if err := json.Unmarshal(raw, &ar); err != nil {
		return Response{Err: fmt.Errorf("parse error: %w: body: %s", err, string(raw))}
	}
	if ar.Error != nil {
		return Response{Err: fmt.Errorf("%s", ar.Error.Message)}
	}

	var thinking, text string
	for _, block := range ar.Content {
		switch block.Type {
		case "thinking":
			thinking += block.Thinking
		case "text":
			text += block.Text
		}
	}
	return Response{Thinking: thinking, Text: text}
}
